import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import TrackPlayer, { useProgress, usePlaybackState, State, useActiveTrack } from '@rntp/player';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');

export const PlayerView = () => {
  const activeTrack = useActiveTrack();
  const { position, duration } = useProgress(200);
  const playbackState = usePlaybackState();

  // Bulletproof time formatter
  const formatTime = (seconds: number) => {
    // THIS LINE fixes the random number bug
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'; 
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlayback = async () => {
    const currentState = playbackState.state;
    if (currentState === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  if (!activeTrack) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No track selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* High-Resolution Album Artwork */}
      <Image 
        source={{ uri: activeTrack.artwork || 'https://via.placeholder.com/300' }} 
        style={styles.artwork} 
      />

      {/* Metadata */}
      <View style={styles.metaContainer}>
        <Text style={styles.title} numberOfLines={1}>{activeTrack.title || 'Unknown Title'}</Text>
        <Text style={styles.artist} numberOfLines={1}>{activeTrack.artist || 'Unknown Artist'}</Text>
      </View>

      {/* Progress Slider Section */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={position}
          minimumTrackTintColor="#FFFFFF"
          maximumTrackTintColor="#555555"
          thumbTintColor="#FFFFFF"
          onSlidingComplete={async (value) => {
            await TrackPlayer.seekTo(value);
          }}
        />
        {/* 🔥 FIXED: Changed <div> to <View> to stop the Android crash */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Player Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={() => TrackPlayer.skipToPrevious()}>
          <Text style={styles.controlButton}>⏮</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayback} style={styles.playPauseCircle}>
          <Text style={styles.playPauseIcon}>
            {playbackState.state === State.Playing ? '⏸' : '▶️'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => TrackPlayer.skipToNext()}>
          <Text style={styles.controlButton}>⏭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  artwork: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 8,
    marginBottom: 30,
  },
  metaContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  artist: {
    color: '#AAAAAA',
    fontSize: 18,
    marginTop: 5,
    textAlign: 'center',
  },
  sliderContainer: {
    width: '100%',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  timeText: {
    color: '#888888',
    fontSize: 14,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '80%',
  },
  controlButton: {
    color: '#FFFFFF',
    fontSize: 36,
  },
  playPauseCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseIcon: {
    fontSize: 28,
    color: '#121212',
  },
  text: {
    color: '#FFFFFF',
  },
});