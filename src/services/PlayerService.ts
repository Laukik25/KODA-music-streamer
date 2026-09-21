import TrackPlayer from '@rntp/player';

const TP: any = TrackPlayer;

export const PlayerService = {
  play: async () => { if (typeof TP.play === 'function') await TP.play(); },
  pause: async () => { if (typeof TP.pause === 'function') await TP.pause(); },
  reset: async () => {
    if (typeof TP.reset === 'function') await TP.reset();
    else if (typeof TP.clear === 'function') await TP.clear();
  },
  add: async (tracks: any) => {
    if (typeof TP.setMediaItems === 'function') await TP.setMediaItems(tracks);
    else if (typeof TP.add === 'function') await TP.add(tracks);
  },
  seekTo: async (pos: number) => { if (typeof TP.seekTo === 'function') await TP.seekTo(pos); },
  
  // NEW: Added this so the app knows if music is playing after a restart
  getState: async () => {
    try {
      if (typeof TP.getPlaybackState === 'function') return await TP.getPlaybackState();
      if (typeof TP.getState === 'function') return await TP.getState();
    } catch (e) { return null; }
    return null;
  },

  getActiveTrack: async () => {
    try {
      if (typeof TP.getActiveTrack === 'function') return await TP.getActiveTrack();
      if (typeof TP.getCurrentTrack === 'function') {
        const index = await TP.getCurrentTrack();
        if (index !== null && typeof TP.getTrack === 'function') return await TP.getTrack(index);
      }
    } catch (e) { return null; }
    return null;
  }
};

const formatTime = (seconds: number) => {
    // THIS LINE fixes the random number bug
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'; 
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };