import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Dimensions, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { LyricLine } from '../services/MusicService';
import { Theme } from '../theme';

const { height, width } = Dimensions.get('window');

interface Props {
  activeSong: Song | null;
  lyrics: LyricLine[];
  lyricsLoading: boolean;
  position: number;
  isPlaying: boolean;
  accentColor: string;
  onClose: () => void;
  skip: (dir: 'next' | 'prev') => void;
  togglePlay: () => void;
}

export const SpicyLyrics = ({ activeSong, lyrics, lyricsLoading, position, isPlaying, accentColor, onClose, skip, togglePlay }: Props) => {
  const flatListRef = useRef<FlatList>(null);
  const backgroundPulse = useRef(new Animated.Value(1)).current;
  const [manualScroll, setManualScroll] = useState(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulse, { toValue: 1.15, duration: 15000, useNativeDriver: true }),
        Animated.timing(backgroundPulse, { toValue: 1.0, duration: 15000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const backgroundScale = backgroundPulse.interpolate({
    inputRange: [1, 1.15],
    outputRange: [2.0, 2.3]
  });

  const adjustedPosition = position + 0;

  const activeLyricIndex = lyrics.findIndex((l, index) => {
    const nextTime = lyrics[index + 1]?.time || Infinity;
    return adjustedPosition >= l.time && adjustedPosition < nextTime;
  });

  useEffect(() => {
    if (!manualScroll && lyrics?.length > 0 && lyrics[0]?.time !== -1 && activeLyricIndex !== -1 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index: activeLyricIndex,
          animated: true,
          viewPosition: 0.4 
        });
      } catch (e) {}
    }
  }, [activeLyricIndex, manualScroll]);

  if (!activeSong) return null;

  return (
    <View style={styles.container}>
      <Animated.Image 
        source={{ uri: activeSong.artwork || 'https://via.placeholder.com/500' }} 
        style={[StyleSheet.absoluteFillObject, { opacity: 0.7, transform: [{ scale: backgroundScale }] }]} 
        blurRadius={90} 
      />
      {/* Deep overlay to make the lyrics pop elegantly */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />

      <View style={styles.lyricsHeader}>
        <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
           <Ionicons name="chevron-down" size={36} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.lyricsStage}>
        {lyricsLoading ? (
          <View style={styles.centerBox}>
            <Ionicons name="musical-notes-outline" size={40} color="rgba(255,255,255,0.3)" />
            <Text style={styles.lyricsEmptyText}>Loading Lyrics...</Text>
          </View>
        ) : lyrics?.length > 0 ? (
          lyrics[0]?.time === -1 ? (
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
               <Text style={styles.staticLyricText}>{lyrics[0]?.text}</Text>
             </ScrollView>
          ) : (
            <FlatList
              ref={flatListRef}
              data={lyrics}
              keyExtractor={(item, index) => `${index}-${item.time}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollPadding}
              onScrollBeginDrag={() => setManualScroll(true)}
              onMomentumScrollEnd={() => { setTimeout(() => setManualScroll(false), 3000); }} 
              onScrollToIndexFailed={() => {}}
              renderItem={({ item, index }) => {
                const isActive = index === activeLyricIndex;
                
                return (
                  <View style={styles.lyricLineBase}>
                    <Text 
                      style={isActive ? [styles.lyricActive, { textShadowColor: accentColor }] : styles.lyricInactive}
                    >
                      {item.text}
                    </Text>
                  </View>
                );
              }}
            />
          )
        ) : (
          <View style={styles.centerBox}>
            <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.3)" />
            <Text style={styles.lyricsEmptyText}>No lyrics available for this track.</Text>
          </View>
        )}
      </View>

      <View style={styles.floatingControls}>
        <TouchableOpacity activeOpacity={0.95} onPress={onClose} style={styles.lyricsMiniControls}>
          <Image source={{ uri: activeSong.artwork }} style={styles.miniArtwork} />
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text numberOfLines={1} style={styles.lyricsMiniTitle}>{activeSong.title}</Text>
            <Text numberOfLines={1} style={styles.lyricsMiniArtist}>{activeSong.artist}</Text>
          </View>
          <View style={styles.controlActions}>
            <TouchableOpacity onPress={() => skip('prev')} hitSlop={{top:15,bottom:15,left:15,right:15}}>
              <Ionicons name="play-skip-back" size={22} color="#FFF"/>
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={[styles.lyricsMiniPlayBtn, { backgroundColor: accentColor }]}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={Theme.colors.background} style={{ marginLeft: isPlaying ? 0 : 2 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => skip('next')} hitSlop={{top:15,bottom:15,left:15,right:15}}>
              <Ionicons name="play-skip-forward" size={22} color="#FFF"/>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', backgroundColor: '#000' },
  lyricsStage: { flex: 1 },
  lyricsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 },
  iconBtn: { padding: 8, marginLeft: -8 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollPadding: { paddingVertical: height * 0.35, paddingHorizontal: 24 },
  
  lyricLineBase: { marginBottom: 25, width: '100%' },
  lyricActive: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', letterSpacing: -0.5, lineHeight: 42, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15, textAlign: 'left' },
  lyricInactive: { color: 'rgba(255,255,255,0.4)', fontSize: 26, fontWeight: '700', letterSpacing: -0.5, lineHeight: 36, textAlign: 'left' },
  
  staticLyricText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', lineHeight: 38, textAlign: 'left', opacity: 0.9 },
  lyricsEmptyText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textAlign: 'center', marginTop: 15, fontWeight: '600' },

  floatingControls: { position: 'absolute', bottom: 35, left: 15, right: 15 },
  lyricsMiniControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20, 20, 25, 0.65)', padding: 10, paddingHorizontal: 12, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  miniArtwork: { width: 44, height: 44, borderRadius: 16, marginRight: 12 },
  lyricsMiniTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  lyricsMiniArtist: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  controlActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lyricsMiniPlayBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' }
});