import TrackPlayer from '@rntp/player';

export const setupPlayer = async () => {
  try {
    await TrackPlayer.setupPlayer({
      contentType: 'music',
      handleAudioBecomingNoisy: true,
      android: { wakeMode: 'network' },
    });
  } catch (error) {
    console.log('Player is already running.');
  }
};