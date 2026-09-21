import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Playlist, Song } from '../types';
import { Theme } from '../theme';

interface Props {
  visible: boolean;
  songToAdd: Song | null;
  playlists: Playlist[];
  newPlaylistName: string;
  setNewPlaylistName: (name: string) => void;
  onClose: () => void;
  onCreatePlaylist: () => void;
  onTogglePlaylist: (playlistId: string) => void;
}

export const PlaylistModal = ({ 
  visible, songToAdd, playlists, newPlaylistName, 
  setNewPlaylistName, onClose, onCreatePlaylist, onTogglePlaylist 
}: Props) => (
  <Modal visible={visible} transparent={true} animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Save to Archive</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-circle" size={30} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.createPlaylistRow}>
          <TextInput 
            style={styles.createInput}
            placeholder="New archive name..."
            placeholderTextColor={Theme.colors.textSecondary}
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            selectionColor={Theme.colors.accent}
          />
          <TouchableOpacity style={styles.createBtn} onPress={onCreatePlaylist}>
            <Ionicons name="add" size={24} color={Theme.colors.background} />
          </TouchableOpacity>
        </View>

        <FlatList 
          data={playlists}
          keyExtractor={item => item.id}
          style={{ maxHeight: 300 }}
          renderItem={({ item }) => {
            const isAlreadyInPlaylist = songToAdd ? item.songs.some(s => s.id === songToAdd.id) : false;
            return (
              <TouchableOpacity style={styles.modalPlaylistRow} onPress={() => onTogglePlaylist(item.id)}>
                <Ionicons name={isAlreadyInPlaylist ? "checkmark-circle" : "list"} size={24} color={isAlreadyInPlaylist ? Theme.colors.accent : Theme.colors.textSecondary} />
                <Text style={[styles.modalPlaylistName, isAlreadyInPlaylist && { color: Theme.colors.accent, fontWeight: 'bold' }]}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, paddingBottom: 40, borderWidth: 1, borderColor: Theme.colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: Theme.colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  createPlaylistRow: { flexDirection: 'row', marginBottom: 25 },
  createInput: { flex: 1, backgroundColor: Theme.colors.surface, color: Theme.colors.textPrimary, padding: 14, borderRadius: 12, marginRight: 12, borderWidth: 1, borderColor: Theme.colors.border },
  createBtn: { backgroundColor: Theme.colors.accent, width: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalPlaylistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  modalPlaylistName: { color: Theme.colors.textPrimary, fontSize: 16, marginLeft: 15 },
});