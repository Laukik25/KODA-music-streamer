import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, BackHandler, Animated, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PlayerProvider, usePlayer } from './src/contexts/PlayerContext';
import { Song, Playlist } from './src/types';
import { MusicService } from './src/services/MusicService';
import { Theme } from './src/theme';

import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { MiniPlayer } from './src/components/MiniPlayer';
import { PlaylistModal } from './src/components/PlaylistModal';
import { ContextMenu } from './src/components/ContextMenu'; 
import { SearchScreen } from './src/screens/SearchScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { FullScreenPlayer } from './src/screens/FullScreenPlayer';

function MainApp() {
  const { activeSong, activePlaylist, isPlaying, playSong, togglePlay, skip, playNext } = usePlayer();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentTab, setCurrentTab] = useState<'search' | 'library'>('search');
  
  const [playlists, setPlaylists] = useState<Playlist[]>([{ id: 'liked', name: 'Liked Songs', songs: [] }]);
  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [contextSong, setContextSong] = useState<Song | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false); 

  const uiLabAccent = Theme.colors.accent; 
  const appScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadData() {
      try {
        const saved = await AsyncStorage.getItem('user_playlists');
        if (saved) setPlaylists(JSON.parse(saved));
      } catch (e) {}
    }
    loadData();
  }, []);

  const savePlaylists = async (newList: Playlist[]) => {
    setPlaylists(newList);
    try { await AsyncStorage.setItem('user_playlists', JSON.stringify(newList)); } catch (e) {}
  };

  const createNewPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist: Playlist = { id: String(Date.now()), name: newPlaylistName, songs: [] };
    await savePlaylists([...playlists, newPlaylist]);
    setNewPlaylistName('');
  };

  const togglePlaylistInclusion = async (playlistId: string) => {
    if (!songToAdd) return;
    const targetPlaylist = playlists.find(p => p.id === playlistId);
    if (!targetPlaylist) return;
    const isAlreadyIn = targetPlaylist.songs.some(s => s.id === songToAdd.id);
    const updatedPlaylists = playlists.map(pl => 
      pl.id === playlistId ? { ...pl, songs: isAlreadyIn ? pl.songs.filter(s => s.id !== songToAdd.id) : [songToAdd, ...pl.songs] } : pl
    );
    await savePlaylists(updatedPlaylists);
  };

  const handleToggleLike = async (song: Song) => {
    const likedPlaylist = playlists.find(p => p.id === 'liked');
    if (!likedPlaylist) return;
    const isAlreadyLiked = likedPlaylist.songs.some(s => s.id === song.id);
    const updatedPlaylists = playlists.map(pl => 
      pl.id === 'liked' ? { ...pl, songs: isAlreadyLiked ? pl.songs.filter(s => s.id !== song.id) : [song, ...pl.songs] } : pl
    );
    await savePlaylists(updatedPlaylists);
  };

  const handleSearch = async () => {
    if (!searchQuery) return; 
    setLoading(true);
    try {
      const results = await MusicService.search(searchQuery);
      setSongs(results);
    } catch (error) {} 
    finally { setLoading(false); }
  };

  const handlePlayRoutine = async (query: string) => {
    setLoading(true);
    try {
      const results = await MusicService.search(query);
      if (results.length > 0) {
         await playSong(results[0], results, true);
         setSongs(results);
         setSearchQuery(query);
         setCurrentTab('search');
      }
    } catch(e) {} 
    finally { setLoading(false); }
  };

  // --- FULL 600+ TRACK SPOTIFY PAGINATION ENGINE ---
  const handleImportPlaylist = async (url: string) => {
    try {
      if (!url.includes('spotify.com') && !url.includes('jiosaavn.com')) {
        Alert.alert("Invalid Link", "Please paste a valid Spotify or JioSaavn playlist link.");
        return;
      }
      
      setLoading(true);

      let playlistName = "Imported Playlist";
      let trackQueries: string[] = [];

      if (url.includes('spotify.com')) {
        const playlistIdMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
        if (!playlistIdMatch) {
          Alert.alert("Invalid Link", "Could not read the playlist ID.");
          setLoading(false);
          return;
        }
        const playlistId = playlistIdMatch[1];

        // 1. Fetch Playlist Name
        try {
          const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
          const oembedData = await oembedRes.json();
          if (oembedData?.title) playlistName = oembedData.title;
        } catch (e) {}

        // 2. Obtain an authenticated Web Player Token
        let token = "";
        try {
          const tokenRes = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json'
            }
          });
          const tokenText = await tokenRes.text();
          if (tokenText.startsWith('{')) {
            const tokenData = JSON.parse(tokenText);
            token = tokenData.accessToken || "";
          }
        } catch (e) {}

        // Fallback: Token scraping from page HTML if endpoint was guarded
        if (!token) {
          try {
            const pageRes = await fetch(`https://open.spotify.com/playlist/${playlistId}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
              }
            });
            const pageHtml = await pageRes.text();
            const tokenMatch = pageHtml.match(/"accessToken":"([^"]+)"/);
            if (tokenMatch) token = tokenMatch[1];
          } catch (e) {}
        }

        // 3. Paginate through the playlist using Spotify's official pagination cursor
        if (token) {
          let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&offset=0`;
          
          while (nextUrl) {
            try {
              const tracksRes: Response = await fetch(nextUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json'
                }
              });
              const tracksText = await tracksRes.text();
              if (tracksText.startsWith('{')) {
                const tracksData = JSON.parse(tracksText);
                if (tracksData?.items && Array.isArray(tracksData.items)) {
                  for (const item of tracksData.items) {
                    if (item?.track) {
                      const trackTitle = item.track.name || '';
                      const artistName = item.track.artists?.[0]?.name || '';
                      if (trackTitle) {
                        trackQueries.push(`${trackTitle} ${artistName}`.trim());
                      }
                    }
                  }
                }
                nextUrl = tracksData?.next || null;
              } else {
                break;
              }
            } catch (e) {
              break;
            }
          }
        }

        // 4. Fallback to Embed data if API pagination couldn't run
        if (trackQueries.length === 0) {
          try {
            const embedRes = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`);
            const html = await embedRes.text();
            const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
            if (nextDataMatch) {
              const nextData = JSON.parse(nextDataMatch[1]);
              const entity = nextData?.props?.pageProps?.state?.data?.entity || nextData?.props?.pageProps?.entity;
              if (entity?.name) playlistName = entity.name;
              if (Array.isArray(entity?.trackList)) {
                trackQueries = entity.trackList.map((item: any) => `${item.title || item.name || ''} ${item.subtitle || ''}`.trim());
              }
            }
          } catch (e) {}
        }

        if (trackQueries.length === 0) {
          Alert.alert("Import Failed", "Could not retrieve tracks. Ensure the playlist is Public.");
          setLoading(false);
          return;
        }

        Alert.alert("Importing...", `Matching ${trackQueries.length} tracks for "${playlistName}". This may take a moment.`);

        // 5. Batch resolve all tracks against MusicService
        const importedSongs: Song[] = [];
        const chunkSize = 10;
        for (let i = 0; i < trackQueries.length; i += chunkSize) {
          const chunk = trackQueries.slice(i, i + chunkSize);
          const chunkResults = await Promise.all(
            chunk.map(async (query: string) => {
              try {
                const searchResults = await MusicService.search(query);
                if (searchResults && searchResults.length > 0) return searchResults[0];
              } catch (e) {}
              return null;
            })
          );
          chunkResults.forEach(song => { if (song) importedSongs.push(song); });
        }

        if (importedSongs.length === 0) {
          Alert.alert("Import Failed", "Could not match any tracks on the servers.");
          setLoading(false);
          return;
        }

        // 6. Save full playlist
        const newPlaylist: Playlist = {
          id: `imported-${Date.now()}`,
          name: playlistName,
          songs: importedSongs,
        };

        const updatedPlaylists = [newPlaylist, ...playlists];
        await savePlaylists(updatedPlaylists);
        
        Alert.alert("Success!", `Successfully imported ${importedSongs.length} tracks to "${playlistName}". Check your Library!`);

      } else {
        // JioSaavn Playlist Handling
        const importedSongs = await MusicService.importWebPlaylist(url);
        if (!importedSongs || importedSongs.length === 0) {
          Alert.alert("Import Failed", "Could not import playlist.");
          setLoading(false);
          return;
        }
        const newPlaylist: Playlist = {
          id: `imported-${Date.now()}`,
          name: "JioSaavn Import",
          songs: importedSongs,
        };
        const updatedPlaylists = [newPlaylist, ...playlists];
        await savePlaylists(updatedPlaylists);
        Alert.alert("Success!", `Imported ${importedSongs.length} tracks. Check your Library!`);
      }
      
    } catch (error) {
      Alert.alert("Import Error", "Failed to fetch playlist data. Check your connection or ensure the playlist is Public.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylistFromLibrary = async (name: string) => {
    if (!name.trim()) return;
    const newPlaylist: Playlist = { id: `local-${Date.now()}`, name, songs: [] };
    await savePlaylists([newPlaylist, ...playlists]);
  };

  const handleDeletePlaylist = async (id: string) => {
    const updated = playlists.filter(p => p.id !== id);
    await savePlaylists(updated);
  };

  useEffect(() => {
    Animated.spring(appScale, { toValue: isFullScreen ? 1 : 0, tension: 40, friction: 10, useNativeDriver: true }).start();
  }, [isFullScreen]);

  const scale = appScale.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });
  const opacity = appScale.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
  
  useEffect(() => {
    const backAction = () => {
      if (isFullScreen) { setIsFullScreen(false); return true; } 
      if (contextSong) { setContextSong(null); return true; } 
      if (isModalVisible) { setIsModalVisible(false); return true; }
      if (viewingPlaylistId) { setViewingPlaylistId(null); return true; }
      if (currentTab === 'library') { setCurrentTab('search'); return true; }
      if (searchQuery.length > 0) { setSearchQuery(''); return true; }
      return false; 
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentTab, viewingPlaylistId, isModalVisible, searchQuery, isFullScreen, contextSong]); 

  return (
    <View style={styles.masterContainer}>
      <Animated.View style={[styles.appWrapper, { transform: [{ scale }], opacity }]}>
        <Header accentColor={uiLabAccent} />
        
        <View style={styles.contentArea}>
          {currentTab === 'search' ? (
            <SearchScreen 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              onSearch={handleSearch} 
              loading={loading} 
              songs={songs} 
              onPlaySong={(song, list) => playSong(song, list, false)} 
              onOpenAddModal={(song) => { setSongToAdd(song); setIsModalVisible(true); }} 
              onLongPressSong={setContextSong} 
              accentColor={uiLabAccent} 
              onImportPlaylist={handleImportPlaylist} 
            />
          ) : (
            <LibraryScreen 
              playlists={playlists} 
              viewingPlaylistId={viewingPlaylistId} 
              setViewingPlaylistId={setViewingPlaylistId} 
              onPlayRoutine={handlePlayRoutine} 
              isShuffleMode={false} 
              onPlayAll={(playlistSongs, shuffleMode) => { 
                if (playlistSongs.length === 0) return; 
                const startIndex = shuffleMode ? Math.floor(Math.random() * playlistSongs.length) : 0; 
                playSong(playlistSongs[startIndex], playlistSongs, false); 
              }} 
              onPlaySong={(song, list) => playSong(song, list, false)} 
              onRemoveSong={(plId, sId) => { 
                const updatedPlaylists = playlists.map(pl => pl.id === plId ? { ...pl, songs: pl.songs.filter(s => s.id !== sId) } : pl ); 
                savePlaylists(updatedPlaylists); 
              }} 
              onLongPressSong={setContextSong} 
              accentColor={uiLabAccent} 
              onImportPlaylist={handleImportPlaylist}
              onCreatePlaylist={handleCreatePlaylistFromLibrary} 
              onDeletePlaylist={handleDeletePlaylist}
            />
          )}
        </View>

        {activeSong && (
          <View style={styles.miniPlayerContainer}>
            <MiniPlayer 
              activeSong={activeSong} 
              isPlaying={isPlaying} 
              onSeek={() => {}} 
              onTogglePlay={togglePlay} 
              onSkip={skip} 
              accentColor={uiLabAccent} 
              onPress={() => setIsFullScreen(true)} 
            />
          </View>
        )}

        <BottomNav 
          currentTab={currentTab} 
          onTabSelect={(tab) => { setCurrentTab(tab); setViewingPlaylistId(null); }} 
          accentColor={uiLabAccent} 
        />
      </Animated.View>

      <PlaylistModal 
        visible={isModalVisible} 
        songToAdd={songToAdd} 
        playlists={playlists} 
        newPlaylistName={newPlaylistName} 
        setNewPlaylistName={setNewPlaylistName} 
        onClose={() => { setIsModalVisible(false); setSongToAdd(null); }} 
        onCreatePlaylist={createNewPlaylist} 
        onTogglePlaylist={togglePlaylistInclusion} 
      />
      
      <ContextMenu 
        visible={!!contextSong} 
        song={contextSong} 
        onClose={() => setContextSong(null)} 
        onPlayNext={(song) => { playNext(song); setContextSong(null); }} 
        onAddToPlaylist={(song) => { setContextSong(null); setSongToAdd(song); setIsModalVisible(true); }} 
        isLiked={contextSong ? playlists.find(p => p.id === 'liked')?.songs.some(s => s.id === contextSong.id) || false : false} 
        onToggleLike={handleToggleLike} 
        accentColor={uiLabAccent} 
        isLibraryView={currentTab === 'library' && viewingPlaylistId !== null} 
        onRemoveFromPlaylist={(song) => { 
          if (viewingPlaylistId) { 
            const updatedPlaylists = playlists.map(pl => pl.id === viewingPlaylistId ? { ...pl, songs: pl.songs.filter(s => s.id !== song.id) } : pl ); 
            savePlaylists(updatedPlaylists); 
          } 
        }} 
      />
      
      {activeSong && (
        <FullScreenPlayer 
          visible={isFullScreen} 
          onClose={() => setIsFullScreen(false)} 
          accentColor={uiLabAccent} 
          isLiked={playlists.find(p => p.id === 'liked')?.songs.some(s => s.id === activeSong.id) || false} 
          onToggleLike={() => handleToggleLike(activeSong)} 
        />
      )}
    </View>
  );
}

export default function App() { 
  return (
    <PlayerProvider>
      <MainApp />
    </PlayerProvider>
  ); 
}

const styles = StyleSheet.create({
  masterContainer: { flex: 1, backgroundColor: Theme.colors.background },
  appWrapper: { flex: 1, backgroundColor: Theme.colors.background, borderRadius: 0, overflow: 'hidden', paddingTop: 50 }, 
  contentArea: { flex: 1, paddingBottom: 100 }, 
  miniPlayerContainer: { position: 'absolute', bottom: 95, left: 15, right: 15, zIndex: 10 }
});