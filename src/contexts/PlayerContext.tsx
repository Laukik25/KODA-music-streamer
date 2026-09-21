import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import TrackPlayer, { useIsPlaying, Capability, Event } from '@rntp/player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '../types';
import { MusicService } from '../services/MusicService';

interface PlayerContextType {
  activeSong: Song | null;
  activePlaylist: Song[];
  isPlaying: boolean;
  playSong: (song: Song, contextList: Song[], isFromSearch?: boolean) => Promise<void>;
  togglePlay: () => Promise<void>;
  skip: (direction: 'next' | 'prev') => Promise<void>;
  playNext: (song: Song) => Promise<void>;
  reorderQueue: (songId: string, action: 'top' | 'bottom' | 'move', targetId?: string) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<Song[]>([]);
  const [isPlayingFallback, setIsPlayingFallback] = useState(false);
  
  const queueLock = useRef(false);
  const playlistRef = useRef<Song[]>([]);

  useEffect(() => {
    playlistRef.current = activePlaylist;
  }, [activePlaylist]);

  const playingResult = useIsPlaying() as any;
  const isPlaying = playingResult?.playing ?? !!playingResult;

  useEffect(() => {
    if (activeSong) {
      AsyncStorage.setItem('LAST_PLAYED_SONG', JSON.stringify(activeSong)).catch(() => {});
    }
  }, [activeSong]);

  useEffect(() => {
    let sub1: any;
    let sub2: any;
    try {
      // FIX: Cast Event keys as any to prevent strict TS package mismatch errors
      sub1 = TrackPlayer.addEventListener(Event.PlaybackTrackChanged as any, async (event: any) => {
        if (event.nextTrack !== null && event.nextTrack !== undefined) {
           const track = await TrackPlayer.getTrack(event.nextTrack);
           if (track) updateActiveSongFromNative(track);
        }
      });
      sub2 = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged as any, async (event: any) => {
        if (event.track) updateActiveSongFromNative(event.track);
      });
    } catch(e) {}

    return () => {
      if (sub1 && sub1.remove) sub1.remove();
      if (sub2 && sub2.remove) sub2.remove();
    };
  }, []);

  const updateActiveSongFromNative = (trackObj: any) => {
    if (!trackObj || !trackObj.id) return;
    setActiveSong(prev => {
      if (!prev || String(prev.id) !== String(trackObj.id)) {
        const richSong = playlistRef.current.find(s => String(s.id) === String(trackObj.id));
        return (richSong as Song) || (trackObj as unknown as Song);
      }
      return prev;
    });
  };

  useEffect(() => {
    let duckSub: any;
    try {
      duckSub = TrackPlayer.addEventListener('remote-duck' as any, async (event: any) => {
        try {
          if (event.paused || event.permanent) {
            await TrackPlayer.pause();
            setIsPlayingFallback(false);
          }
        } catch(e) {}
      });
    } catch (e) {}
    return () => { if (duckSub && typeof duckSub.remove === 'function') duckSub.remove(); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function initAudio() {
      try {
        const savedSong = await AsyncStorage.getItem('LAST_PLAYED_SONG');
        if (savedSong) setActiveSong(JSON.parse(savedSong));
      } catch (e) {}

      try { 
        await TrackPlayer.setupPlayer({
          maxCacheSize: 1024 * 1024 * 100,
          minBuffer: 15,
          maxBuffer: 60,
          playBuffer: 5,
          backBuffer: 30,
        }); 
        
        await TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play, Capability.Pause, Capability.SkipToNext, 
            Capability.SkipToPrevious, Capability.JumpForward, Capability.JumpBackward, Capability.SeekTo
          ] as any,
          compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious] as any,
          notificationCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.JumpForward, Capability.JumpBackward] as any,
          forwardJumpInterval: 15, backwardJumpInterval: 15, alwaysPauseOnInterruption: true,
        });
      } catch (e) {}
    }
    initAudio();
    return () => { mounted = false; };
  }, []);

  const reorderQueue = useCallback(async (songId: string, action: 'top' | 'bottom' | 'move', targetId?: string) => {
    if (!activeSong) return;
    setActivePlaylist(prev => {
      const newList = [...prev];
      const fromIndex = newList.findIndex(s => String(s.id) === String(songId));
      if (fromIndex === -1) return prev;
      const playingIndex = newList.findIndex(s => String(s.id) === String(activeSong.id));
      let toIndex = 0;
      if (action === 'top') toIndex = playingIndex !== -1 ? playingIndex + 1 : 0;
      else if (action === 'bottom') toIndex = newList.length - 1;
      else if (action === 'move' && targetId) {
        toIndex = newList.findIndex(s => String(s.id) === String(targetId));
        if (toIndex === -1) toIndex = newList.length - 1;
      }
      if (typeof (TrackPlayer as any).move === 'function') (TrackPlayer as any).move(fromIndex, toIndex).catch(() => {});
      const [movedSong] = newList.splice(fromIndex, 1);
      newList.splice(toIndex, 0, movedSong);
      return newList;
    });
  }, [activeSong]);

  const playSong = useCallback(async (song: Song, contextList: Song[], isFromSearch = false) => {
    if (queueLock.current) return;
    queueLock.current = true;
    let listToPlay = [song];
    let remainingSongs: Song[] = [];

    if (!isFromSearch && contextList.length > 0) {
        const startIndex = contextList.findIndex(s => String(s.id) === String(song.id));
        if (startIndex !== -1) remainingSongs = contextList.slice(startIndex + 1, startIndex + 26);
        listToPlay = [song, ...remainingSongs];
    }
    setActiveSong(song);
    setActivePlaylist(listToPlay); 
    setIsPlayingFallback(true);

    setTimeout(async () => {
      try {
        const targetSongDetails = await MusicService.getSongDetails(String(song.id));
        if (!targetSongDetails || !targetSongDetails.url) {
          Alert.alert("Playback Error", "Audio stream unavailable.");
          setIsPlayingFallback(false);
          return;
        }
        targetSongDetails.id = String(song.id);
        setActiveSong(targetSongDetails);
        const mainTrack: any = { ...targetSongDetails };
        if (typeof targetSongDetails.duration === 'number' && !isNaN(targetSongDetails.duration)) mainTrack.duration = targetSongDetails.duration;

        if (typeof (TrackPlayer as any).setMediaItems === 'function') await (TrackPlayer as any).setMediaItems([mainTrack]);
        else { await (TrackPlayer as any).reset(); await (TrackPlayer as any).add([mainTrack]); }
        await TrackPlayer.play();

        if (isFromSearch || remainingSongs.length === 0) {
            try {
                let similarVibes: Song[] = [];
                let searchResults: Song[] = [];
                try { similarVibes = await MusicService.getRecommendations(String(song.id)) || []; } catch (e) {}
                if (!similarVibes || similarVibes.length === 0) {
                    const query = `${song.title} ${song.artist !== 'Unknown Artist' ? song.artist : ''}`.trim();
                    try {
                        searchResults = await MusicService.search(query) || [];
                        for (let i = 0; i < Math.min(3, searchResults.length); i++) {
                            try {
                                const altVibes = await MusicService.getRecommendations(String(searchResults[i].id));
                                if (altVibes && altVibes.length > 0) { similarVibes = altVibes; break; }
                            } catch(e) {}
                        }
                    } catch (e) {}
                }
                let uniqueRadio: Song[] = [];
                const cleanTitle = (t: string) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                for (const track of (similarVibes || [])) {
                    if (String(track.id) === String(song.id)) continue;
                    const cTitle = cleanTitle(track.title);
                    if (!uniqueRadio.some(r => cleanTitle(r.title) === cTitle)) uniqueRadio.push(track);
                }
                if (uniqueRadio.length === 0 && searchResults.length > 0) {
                    for (const track of searchResults) {
                        if (String(track.id) === String(song.id)) continue;
                        const cTitle = cleanTitle(track.title);
                        if (!uniqueRadio.some(r => cleanTitle(r.title) === cTitle)) uniqueRadio.push(track);
                    }
                }
                for (let i = uniqueRadio.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [uniqueRadio[i], uniqueRadio[j]] = [uniqueRadio[j], uniqueRadio[i]];
                }
                remainingSongs = uniqueRadio.slice(0, 25);
                setActivePlaylist([targetSongDetails, ...remainingSongs]); 
            } catch(e) {}
        }
        if (remainingSongs.length > 0) {
           const processBackgroundQueue = async () => {
              const chunkSize = 5;
              for (let i = 0; i < remainingSongs.length; i += chunkSize) {
                  const chunk = remainingSongs.slice(i, i + chunkSize);
                  const fetchedRemaining = await Promise.all(
                      chunk.map(async (s) => {
                          try {
                              const details = await MusicService.getSongDetails(String(s.id));
                              if (details && details.url) return { id: String(s.id), url: String(details.url), title: String(details.title || s.title || 'Unknown'), artist: String(details.artist || s.artist || 'Unknown'), artwork: String(details.artwork || s.artwork), duration: typeof details.duration === 'number' && !isNaN(details.duration) ? details.duration : (s.duration || 0) };
                          } catch(err) {}
                          return null;
                      })
                  );
                  const validRemaining = fetchedRemaining.filter(t => t !== null) as any[];
                  if (validRemaining.length > 0) {
                      if (typeof (TrackPlayer as any).addMediaItems === 'function') await (TrackPlayer as any).addMediaItems(validRemaining);
                      else await (TrackPlayer as any).add(validRemaining);
                      setActivePlaylist(currentPlaylist => {
                          const newPlaylist = [...currentPlaylist];
                          validRemaining.forEach(fetched => {
                              const index = newPlaylist.findIndex(p => String(p.id) === String(fetched.id));
                              if (index !== -1) newPlaylist[index] = { ...newPlaylist[index], ...fetched };
                          });
                          return newPlaylist;
                      });
                  }
              }
           };
           processBackgroundQueue(); 
        }
      } catch (e) {} finally { queueLock.current = false; }
    }, 0);
  }, []);

  const togglePlay = useCallback(async () => {
    try {
      if (isPlaying || isPlayingFallback) { await TrackPlayer.pause(); setIsPlayingFallback(false); } 
      else { await TrackPlayer.play(); setIsPlayingFallback(true); }
    } catch(e) {}
  }, [isPlaying, isPlayingFallback]);

  const skip = useCallback(async (direction: 'next' | 'prev') => {
    try {
      setActiveSong(prevSong => {
         if (!prevSong) return prevSong;
         const currentIndex = playlistRef.current.findIndex(s => String(s.id) === String(prevSong.id));
         if (direction === 'next' && currentIndex !== -1 && currentIndex < playlistRef.current.length - 1) return playlistRef.current[currentIndex + 1];
         else if (direction === 'prev' && currentIndex > 0) return playlistRef.current[currentIndex - 1];
         return prevSong;
      });
      if (direction === 'next') await TrackPlayer.skipToNext();
      if (direction === 'prev') await TrackPlayer.skipToPrevious();
    } catch (e) {}
  }, []);

  const playNext = useCallback(async (song: Song) => {
    const details = await MusicService.getSongDetails(String(song.id));
    if(!details || !details.url) return;
    const trackObj: any = { id: String(song.id), url: String(details.url), title: String(details.title || 'Unknown'), artist: String(details.artist || 'Unknown'), artwork: String(details.artwork) };
    if (typeof details.duration === 'number' && !isNaN(details.duration)) trackObj.duration = details.duration;

    try {
      let currentNativeIndex = 0; 
      if (typeof (TrackPlayer as any).getCurrentTrack === 'function') {
         const idx = await (TrackPlayer as any).getCurrentTrack();
         if (idx !== null && idx !== undefined) currentNativeIndex = idx;
      }
      if (typeof (TrackPlayer as any).addMediaItems === 'function') await (TrackPlayer as any).addMediaItems([trackObj], currentNativeIndex + 1);
      else await (TrackPlayer as any).add([trackObj], currentNativeIndex + 1);
      
      setActivePlaylist(prev => {
         const newQueue = [...prev];
         const uiIndex = prev.findIndex(s => String(s.id) === String(activeSong?.id));
         if (uiIndex !== -1) newQueue.splice(uiIndex + 1, 0, trackObj);
         else newQueue.push(trackObj);
         return newQueue;
      });
    } catch(e) {}
  }, [activeSong]);

  const contextValue = useMemo(() => ({
    activeSong, activePlaylist, isPlaying: isPlaying || isPlayingFallback, playSong, togglePlay, skip, playNext, reorderQueue
  }), [activeSong, activePlaylist, isPlaying, isPlayingFallback, playSong, togglePlay, skip, playNext, reorderQueue]);

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within a PlayerProvider");
  return context;
};