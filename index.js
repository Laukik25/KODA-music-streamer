import { registerRootComponent } from 'expo';
import TrackPlayer from '@rntp/player';
import App from './App';
import { PlaybackService } from './src/services/PlaybackService';

// Register the main application
registerRootComponent(App);

// Register the background audio service
TrackPlayer.registerPlaybackService(() => PlaybackService);