import { registerRootComponent } from 'expo';
import TrackPlayer from '@rntp/player';
import App from './App';
import { PlaybackService } from './src/services/PlaybackService';

// We wrap the legacy registration in a trap. 
// If V5 doesn't need it, it will silently skip it and boot the app anyway.
try {
  if (TrackPlayer && 'registerPlaybackService' in TrackPlayer && typeof (TrackPlayer as any).registerPlaybackService === 'function') {
    (TrackPlayer as any).registerPlaybackService(() => PlaybackService);
  } else {
    console.log('V5 Engine detected: Skipping legacy background registration.');
  }
} catch (error) {
  console.log('Safe boot caught an error:', error);
}

registerRootComponent(App);