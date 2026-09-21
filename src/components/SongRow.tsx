import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { Theme } from '../theme';

interface Props {
  song: Song;
  onPress: () => void;
  onAction: () => void;
  actionIcon: string;
}

export const SongRow = ({ song, onPress, onAction, actionIcon }: Props) => (
  <View style={styles.songRow}>
    <TouchableOpacity style={styles.rowTouchable} onPress={onPress}>
      <Image source={{ uri: song.artwork }} style={styles.rowArtwork} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{song.title}</Text>
        <Text style={styles.rowArtist} numberOfLines={1}>{song.artist}</Text>
      </View>
    </TouchableOpacity>
    <TouchableOpacity onPress={onAction} style={styles.iconButton}>
      <Ionicons name={actionIcon as any} size={24} color={Theme.colors.textSecondary} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  songRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  rowTouchable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowArtwork: { width: 48, height: 48, borderRadius: 6, backgroundColor: Theme.colors.surface },
  rowInfo: { marginLeft: 15, flex: 1 },
  rowTitle: { color: Theme.colors.textPrimary, fontSize: 15, fontWeight: '600' },
  rowArtist: { color: Theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  iconButton: { padding: 10, paddingRight: 0 },
});