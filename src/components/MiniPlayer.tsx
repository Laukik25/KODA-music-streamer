import React, { useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { Theme } from '../theme';

const { width } = Dimensions.get('window');

interface Props {
  activeSong: Song;
  isPlaying: boolean;
  onSeek: (val: number) => void;
  onTogglePlay: () => void;
  onSkip: (dir: 'next' | 'prev') => void;
  accentColor: string;
  onPress: () => void;
}

export const MiniPlayer = ({ activeSong, isPlaying, onTogglePlay, onSkip, accentColor, onPress }: Props) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const onSkipRef = useRef(onSkip);
  useEffect(() => { onSkipRef.current = onSkip; }, [onSkip]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, 
      // THE FIX: Accurately checks for horizontal swiping movement to trigger skip
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 60) {
          Animated.timing(translateX, { toValue: width, duration: 200, useNativeDriver: true }).start(() => {
            onSkipRef.current('prev');
            translateX.setValue(-width);
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          });
        } else if (gestureState.dx < -60) {
          Animated.timing(translateX, { toValue: -width, duration: 200, useNativeDriver: true }).start(() => {
            onSkipRef.current('next');
            translateX.setValue(width);
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 12 }).start();
        }
      }
    })
  ).current;

  return (
    <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
      <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={[styles.hardwarePill, { shadowColor: accentColor }]}>
        <View style={styles.controls}>
          <Image source={{ uri: activeSong.artwork }} style={styles.artwork} />
          <View style={styles.infoBlock}>
            <Text style={styles.title} numberOfLines={1}>{activeSong.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{activeSong.artist}</Text>
          </View>
          <TouchableOpacity onPress={onTogglePlay} style={[styles.playBtn, { backgroundColor: accentColor }]} hitSlop={{top:15, bottom:15, left:15, right:15}}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={22} color={Theme.colors.background} style={{ marginLeft: isPlaying ? 0 : 2 }} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  hardwarePill: { backgroundColor: 'rgba(25, 25, 30, 0.95)', borderRadius: 20, padding: 8, elevation: 25, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  controls: { flexDirection: 'row', alignItems: 'center' },
  artwork: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#111' },
  infoBlock: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { color: Theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
  artist: { color: Theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  playBtn: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginLeft: 10 }
});