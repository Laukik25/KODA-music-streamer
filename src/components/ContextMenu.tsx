import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { Theme } from '../theme';

const { height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  song: Song | null;
  onClose: () => void;
  onPlayNext: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  isLiked: boolean;
  onToggleLike: (song: Song) => void;
  accentColor: string;
  isLibraryView?: boolean;
  onRemoveFromPlaylist?: (song: Song) => void;
}

export const ContextMenu = ({ visible, song, onClose, onPlayNext, onAddToPlaylist, isLiked, onToggleLike, accentColor, isLibraryView, onRemoveFromPlaylist }: Props) => {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) { Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start(); }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, { toValue: height, duration: 250, useNativeDriver: true }).start(onClose);
  };

  if (!song) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.touchableBackdrop} activeOpacity={1} onPress={handleClose} />
        
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Image source={{ uri: song.artwork }} style={styles.artwork} />
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionRow} onPress={() => { onPlayNext(song); handleClose(); }}>
            <Ionicons name="return-down-forward" size={24} color={Theme.colors.textPrimary} />
            <Text style={styles.actionText}>Play Next</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={() => { onAddToPlaylist(song); handleClose(); }}>
            <Ionicons name="list-circle" size={24} color={Theme.colors.textPrimary} />
            <Text style={styles.actionText}>Add to Playlist...</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={() => { onToggleLike(song); handleClose(); }}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? accentColor : Theme.colors.textPrimary} />
            <Text style={[styles.actionText, isLiked && { color: accentColor }]}>{isLiked ? 'Remove from Liked' : 'Like Song'}</Text>
          </TouchableOpacity>

          {/* THE PREMIUM REMOVE FIX */}
          {isLibraryView && onRemoveFromPlaylist && (
            <TouchableOpacity style={styles.actionRow} onPress={() => { onRemoveFromPlaylist(song); handleClose(); }}>
              <Ionicons name="trash-outline" size={24} color="#FF453A" />
              <Text style={[styles.actionText, { color: '#FF453A' }]}>Remove from this Playlist</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  touchableBackdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { backgroundColor: '#111111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50 },
  handle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 5, alignSelf: 'center', marginBottom: 25 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  artwork: { width: 50, height: 50, borderRadius: 10, marginRight: 15 },
  headerText: { flex: 1 },
  title: { color: Theme.colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  artist: { color: Theme.colors.textSecondary, fontSize: 14 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 15 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  actionText: { color: Theme.colors.textPrimary, fontSize: 18, marginLeft: 20, fontWeight: '500' }
});