import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, Image, TouchableOpacity, StyleSheet, Modal, 
  Dimensions, Animated, PanResponder, ScrollView
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import TrackPlayer, { RepeatMode } from '@rntp/player';
import { Theme } from '../theme';
import { usePlayer } from '../contexts/PlayerContext';
import { MusicService, LyricLine } from '../services/MusicService';
import { SpicyLyrics } from '../components/SpicyLyrics';

const { width, height } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(width - 48, height * 0.45);

interface Props {
  visible: boolean;
  onClose: () => void;
  accentColor: string;
  isLiked: boolean;
  onToggleLike: () => void;
}

export const FullScreenPlayer = ({ visible, onClose, accentColor, isLiked, onToggleLike }: Props) => {
  const { activeSong, activePlaylist, isPlaying, togglePlay, skip, playSong, reorderQueue } = usePlayer();
  
  const [repeatMode, setRepeatMode] = useState(0); 
  const [isShuffle, setIsShuffle] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [anchoredSongId, setAnchoredSongId] = useState<string | null>(null);

  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  useEffect(() => { setLocalIsLiked(isLiked); }, [isLiked]);

  const showQueueRef = useRef(showQueue);
  useEffect(() => { showQueueRef.current = showQueue; }, [showQueue]);

  const [position, setPosition] = useState(0);
  const [trackDuration, setTrackDuration] = useState(activeSong?.duration ?? 100);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);

  useEffect(() => {
    setPosition(0);
    setSeekVal(0);
    if (activeSong && activeSong.duration && activeSong.duration > 0) {
      setTrackDuration(activeSong.duration);
    }
    
    if (activeSong) {
      setLyricsLoading(true);
      MusicService.getSyncedLyrics(activeSong.title, activeSong.artist, String(activeSong.id)).then((fetchedLyrics) => {
        setLyrics(fetchedLyrics);
        setLyricsLoading(false);
      });
    }
  }, [activeSong?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !isSeeking) {
      interval = setInterval(async () => {
        try {
          const progress = await TrackPlayer.getProgress();
          if (progress && typeof progress.position === 'number') {
            setPosition(progress.position);
            if (progress.duration > 0) setTrackDuration(progress.duration);
          }
        } catch (e) {}
      }, 200); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, isSeeking]);

  const translateY = useRef(new Animated.Value(height)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const queueTransition = useRef(new Animated.Value(0)).current;
  const queueDragY = useRef(new Animated.Value(0)).current;
  const artworkBounce = useRef(new Animated.Value(0.95)).current; 
  const heartScale = useRef(new Animated.Value(1)).current;

  const onSkipRef = useRef(skip);
  useEffect(() => { onSkipRef.current = skip; }, [skip]);

  useEffect(() => {
    Animated.spring(artworkBounce, { toValue: isPlaying ? 1 : 0.95, friction: 8, tension: 40, useNativeDriver: true }).start();
  }, [isPlaying]);

  useEffect(() => {
    if (visible) { 
      translateY.setValue(height); 
      translateX.setValue(0);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 10 }).start(); 
    } else {
      setShowQueue(false);
      setIsEditing(false);
      setShowLyrics(false);
      setAnchoredSongId(null);
    }
  }, [visible]);

  useEffect(() => {
    Animated.timing(queueTransition, { 
      toValue: showQueue ? 1 : 0, 
      duration: 300, 
      useNativeDriver: true 
    }).start();
  }, [showQueue]);

  const handleClose = () => {
    Animated.timing(translateY, { toValue: height, duration: 200, useNativeDriver: true }).start(onClose);
  };

  const handleLikePress = () => {
    setLocalIsLiked(!localIsLiked);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 0.7, duration: 50, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1.3, friction: 4, tension: 150, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true })
    ]).start();
    setTimeout(() => { onToggleLike(); }, 0);
  };

  const handleRepeatToggle = async () => {
    try {
      const nextMode = (repeatMode + 1) % 3;
      setRepeatMode(nextMode);
      if (nextMode === 0) await TrackPlayer.setRepeatMode('off' as unknown as RepeatMode);
      if (nextMode === 1) await TrackPlayer.setRepeatMode('queue' as unknown as RepeatMode);
      if (nextMode === 2) await TrackPlayer.setRepeatMode('track' as unknown as RepeatMode);
    } catch(e) {}
  };

  const handleQueueAction = async (songId: string, action: 'top' | 'bottom' | 'anchor' | 'drop') => {
    if (action === 'anchor') {
      setAnchoredSongId(anchoredSongId === songId ? null : songId);
    } else if (action === 'drop' && anchoredSongId) {
      await reorderQueue(anchoredSongId, 'move', songId);
      setAnchoredSongId(null);
    } else if (action === 'top' || action === 'bottom') {
      await reorderQueue(songId, action);
      setAnchoredSongId(null);
    }
  };

  const formatTime = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0:00'; 
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const mainScale = queueTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] });
  const mainOpacity = queueTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  const queueTranslateY = queueTransition.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !showQueueRef.current,
    onMoveShouldSetPanResponder: (_, gestureState) => {
       if (showQueueRef.current) return false; 
       return Math.abs(gestureState.dy) > 10 || Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) translateX.setValue(gestureState.dx);
      else if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
        if (gestureState.dx < -70) {
          Animated.timing(translateX, { toValue: -width, duration: 180, useNativeDriver: true }).start(() => { 
            onSkipRef.current('next'); 
            translateX.setValue(0); 
          });
        } else if (gestureState.dx > 70) {
          Animated.timing(translateX, { toValue: width, duration: 180, useNativeDriver: true }).start(() => { 
            onSkipRef.current('prev'); 
            translateX.setValue(0); 
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }).start();
        }
      } else {
        if (gestureState.dy > 140 || gestureState.vy > 0.6) {
          handleClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      }
    },
  })).current;

  const queuePanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
    onPanResponderMove: (_, gestureState) => { if (gestureState.dy > 0) queueDragY.setValue(gestureState.dy); },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 120 || gestureState.vy > 0.6) {
        setShowQueue(false);
        setIsEditing(false);
        setAnchoredSongId(null);
        setTimeout(() => queueDragY.setValue(0), 300); 
      } else {
        Animated.spring(queueDragY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  if (!activeSong) return null;
  const currentIndex = activePlaylist.findIndex(s => String(s.id) === String(activeSong?.id));
  const upcomingSongs = currentIndex !== -1 ? activePlaylist.slice(currentIndex + 1) : [];

  return (
    <Modal visible={visible} transparent={true} animationType="none" statusBarTranslucent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.container, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
          
          <Animated.View style={{ flex: 1, transform: [{ scale: mainScale }, { translateX }], opacity: mainOpacity }}>
            <View style={styles.swipeHandle} />
            
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.headerIcon}>
                <Ionicons name="chevron-down" size={32} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerRightActions}>
                <TouchableOpacity onPress={() => setShowLyrics(true)} style={styles.actionBtn}>
                  <Ionicons name="text-outline" size={26} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowQueue(!showQueue)} style={styles.actionBtn}>
                  <Ionicons name="reorder-three" size={28} color={showQueue ? accentColor : Theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.centerStage}>
              <Animated.View style={[styles.artworkContainer, { transform: [{ scale: artworkBounce }] }]}>
                <Image source={{ uri: activeSong.artwork }} style={styles.artwork} />
              </Animated.View>
            </View>

            <View style={styles.lowerPanel}>
              <View style={styles.infoRow}>
                <View style={styles.textColumn}>
                  <Text style={styles.title} numberOfLines={1}>{activeSong.title}</Text>
                  <Text style={styles.artist} numberOfLines={1}>{activeSong.artist}</Text>
                </View>
                <TouchableOpacity onPress={handleLikePress} activeOpacity={1} style={{ padding: 10 }} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Ionicons name={localIsLiked ? "heart" : "heart-outline"} size={32} color={localIsLiked ? accentColor : Theme.colors.textSecondary} />
                  </Animated.View>
                </TouchableOpacity>
              </View>

              <View style={styles.sliderContainer}>
                <Slider 
                  style={styles.slider} minimumValue={0} maximumValue={trackDuration} 
                  value={isSeeking ? seekVal : position} 
                  onSlidingStart={(val) => { setIsSeeking(true); setSeekVal(val); }}
                  onValueChange={setSeekVal}
                  onSlidingComplete={async (val) => {
                    try { await TrackPlayer.seekTo(Math.floor(val)); setPosition(val); } catch(e) {}
                    setTimeout(() => setIsSeeking(false), 200);
                  }}
                  minimumTrackTintColor={Theme.colors.textPrimary} maximumTrackTintColor={'rgba(255,255,255,0.15)'} thumbTintColor={Theme.colors.textPrimary} 
                />
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(isSeeking ? seekVal : position)}</Text>
                  <Text style={styles.timeText}>{trackDuration > 0 ? `-${formatTime(trackDuration - (isSeeking ? seekVal : position))}` : '0:00'}</Text>
                </View>
              </View>

              <View style={styles.controlsContainer}>
                <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)} style={styles.controlIcon}>
                  <Ionicons name="shuffle" size={22} color={isShuffle ? accentColor : Theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => skip('prev')} style={styles.controlIcon}>
                  <Ionicons name="play-skip-back" size={32} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={togglePlay} style={[styles.playBtn, { backgroundColor: accentColor }]}>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={32} color={Theme.colors.background} style={{ marginLeft: isPlaying ? 0 : 3 }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => skip('next')} style={styles.controlIcon}>
                  <Ionicons name="play-skip-forward" size={32} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRepeatToggle} style={[styles.controlIcon, styles.repeatBtn]}>
                  <Ionicons name="repeat" size={22} color={repeatMode > 0 ? accentColor : Theme.colors.textSecondary} />
                  {repeatMode === 2 && <View style={styles.repeatBadge}><Text style={[styles.repeatBadgeText, { color: accentColor }]}>1</Text></View>}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.queueSheet, { transform: [{ translateY: Animated.add(queueTranslateY, queueDragY) }] }]} pointerEvents={showQueue ? 'auto' : 'none'}>
            <View {...queuePanResponder.panHandlers} style={styles.queueDragZone}>
              <View style={styles.queueSwipeHandle} />
              <View style={styles.queueHeaderRow}>
                <Text style={styles.queueHeaderTitle}>Up Next</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => { setIsEditing(!isEditing); setAnchoredSongId(null); }} style={[styles.editBtn, isEditing && { backgroundColor: accentColor }]}>
                    <Text style={[styles.editBtnText, isEditing && { color: Theme.colors.background }]}>{isEditing ? "Done" : "Edit"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowQueue(false)} style={styles.closeQueueBtn}>
                    <Ionicons name="close-circle" size={32} color={Theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
              {upcomingSongs.length > 0 ? upcomingSongs.map((song, idx) => {
                const isAnchored = anchoredSongId === String(song.id);
                const isTarget = isEditing && anchoredSongId && !isAnchored;

                return (
                  <View key={`${song.id}-${idx}`} style={styles.queueItemWrapper}>
                    <View style={[styles.queueItemRow, isAnchored && { opacity: 0.5 }]}>
                      <Image source={{ uri: song.artwork }} style={styles.queueArtwork} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.queueItemTitle} numberOfLines={1}>{song.title}</Text>
                        <Text style={styles.queueItemArtist} numberOfLines={1}>{song.artist}</Text>
                      </View>
                    </View>

                    {isEditing && (
                      <View style={styles.editOverlay}>
                        {!anchoredSongId ? (
                          <>
                            <TouchableOpacity style={styles.actionIconButton} onPress={() => handleQueueAction(String(song.id), 'top')}>
                              <Ionicons name="push-outline" size={20} color={Theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionIconButton} onPress={() => handleQueueAction(String(song.id), 'bottom')}>
                              <Ionicons name="download-outline" size={20} color={Theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionIconButton, { backgroundColor: accentColor }]} onPress={() => handleQueueAction(String(song.id), 'anchor')}>
                              <Ionicons name="move" size={20} color={Theme.colors.background} />
                            </TouchableOpacity>
                          </>
                        ) : isTarget ? (
                          <TouchableOpacity style={styles.dropZoneBtn} onPress={() => handleQueueAction(String(song.id), 'drop')}>
                            <Ionicons name="arrow-down" size={16} color={Theme.colors.background} />
                            <Text style={styles.dropZoneText}>Drop</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={styles.cancelAnchorBtn} onPress={() => handleQueueAction(String(song.id), 'anchor')}>
                            <Text style={styles.cancelAnchorText}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              }) : (
                 <View style={styles.emptyQueueContainer}>
                  <Text style={styles.queueEmptyText}>End of queue.</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>

          {showLyrics && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 500, backgroundColor: '#000' }]}>
              <SpicyLyrics 
                activeSong={activeSong} 
                lyrics={lyrics} 
                lyricsLoading={lyricsLoading} 
                position={position} 
                isPlaying={isPlaying} 
                accentColor={accentColor} 
                onClose={() => setShowLyrics(false)} 
                skip={skip} 
                togglePlay={togglePlay} 
              />
            </View>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000' },
  container: { flex: 1, backgroundColor: '#000000', paddingTop: 40 },
  swipeHandle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  headerIcon: { padding: 8 },
  headerRightActions: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  actionBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  centerStage: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  
  artworkContainer: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20 },
  artwork: { width: ARTWORK_SIZE, height: ARTWORK_SIZE, borderRadius: 12, backgroundColor: '#111' },
  lowerPanel: { paddingHorizontal: 24, paddingBottom: 50 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  textColumn: { flex: 1, paddingRight: 16 },
  title: { color: Theme.colors.textPrimary, fontSize: 26, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  artist: { color: Theme.colors.textSecondary, fontSize: 18, fontWeight: '500' },
  sliderContainer: { marginBottom: 20 },
  slider: { width: '100%', height: 40, marginLeft: -10 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -10, paddingHorizontal: 4 },
  timeText: { color: Theme.colors.textSecondary, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  controlsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  controlIcon: { padding: 10 },
  playBtn: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center' },
  repeatBtn: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  repeatBadge: { position: 'absolute', top: 6, left: 24, backgroundColor: Theme.colors.background, borderRadius: 4, paddingHorizontal: 2 },
  repeatBadgeText: { fontSize: 8, fontWeight: 'bold' },

  queueSheet: { position: 'absolute', top: 60, left: 0, right: 0, bottom: 0, backgroundColor: '#0A0A0C', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, zIndex: 1000, elevation: 24 },
  queueDragZone: { paddingTop: 15, paddingBottom: 10, backgroundColor: 'transparent' },
  queueSwipeHandle: { width: 45, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  queueHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueHeaderTitle: { color: Theme.colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  editBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 15 },
  editBtnText: { color: Theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
  closeQueueBtn: { padding: 5, marginRight: -5 },
  queueItemWrapper: { marginBottom: 16, position: 'relative' },
  queueItemRow: { flexDirection: 'row', alignItems: 'center' },
  queueArtwork: { width: 50, height: 50, borderRadius: 8, marginRight: 15, backgroundColor: '#111' },
  queueItemTitle: { color: Theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
  queueItemArtist: { color: Theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  emptyQueueContainer: { alignItems: 'center', marginTop: 40 },
  queueEmptyText: { color: Theme.colors.textSecondary, fontSize: 15, fontWeight: '600', marginTop: 10 },
  
  editOverlay: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0A0A0C', paddingLeft: 10 },
  actionIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  dropZoneBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34C759', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
  dropZoneText: { color: '#000', fontSize: 13, fontWeight: '800' },
  cancelAnchorBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(255,69,58,0.2)', borderRadius: 20 },
  cancelAnchorText: { color: '#FF453A', fontSize: 13, fontWeight: '700' }
});