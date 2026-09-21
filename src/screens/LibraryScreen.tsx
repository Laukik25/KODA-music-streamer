import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Dimensions, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Playlist, Song } from '../types';
import { Theme } from '../theme';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 60) / 2;

interface Props {
  playlists: Playlist[];
  viewingPlaylistId: string | null;
  setViewingPlaylistId: (id: string | null) => void;
  isShuffleMode: boolean;
  onPlayAll: (songs: Song[], shuffle: boolean) => void;
  onPlaySong: (song: Song, context: Song[]) => void;
  onRemoveSong: (playlistId: string, songId: string) => void;
  onLongPressSong: (song: Song) => void;
  onPlayRoutine: (query: string) => void | Promise<void>; 
  accentColor: string;
  onImportPlaylist?: (url: string) => void; 
  onCreatePlaylist?: (name: string) => void; 
  onDeletePlaylist?: (id: string) => void; 
}

const SongRow = React.memo(({ item, context, onPlay, onLongPress }: any) => (
  <TouchableOpacity style={styles.songRow} onPress={() => onPlay(item, context)} onLongPress={() => onLongPress(item)} delayLongPress={300}>
    <Image source={{ uri: item.artwork, cache: 'force-cache' }} style={styles.artwork} />
    <View style={styles.songInfo}>
      <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
    </View>
    <TouchableOpacity onPress={() => onLongPress(item)} style={{ padding: 10 }}>
      <Ionicons name="ellipsis-horizontal" size={20} color={Theme.colors.textSecondary} />
    </TouchableOpacity>
  </TouchableOpacity>
), (prev, next) => prev.item.id === next.item.id);

export const LibraryScreen = ({ playlists, viewingPlaylistId, setViewingPlaylistId, onPlaySong, onLongPressSong, accentColor, onImportPlaylist, onCreatePlaylist, onDeletePlaylist }: Props) => {
  
  const [showSettings, setShowSettings] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handlePlaySong = useCallback((song: Song, context: Song[]) => {
    onPlaySong(song, context);
  }, [onPlaySong]);

  const handleLongPress = useCallback((song: Song) => {
    onLongPressSong(song);
  }, [onLongPressSong]);

  const handleImport = () => {
    if (importUrl.trim() && onImportPlaylist) {
      onImportPlaylist(importUrl.trim());
      setImportUrl('');
      setShowSettings(false);
    }
  };

  const handleCreate = () => {
    if (newPlaylistName.trim() && onCreatePlaylist) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Delete Playlist",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
            if (onDeletePlaylist) onDeletePlaylist(id);
          } 
        }
      ]
    );
  };

  const likedPlaylist = playlists.find(p => p.id === 'liked');
  const customPlaylists = playlists.filter(p => p.id !== 'liked');

  if (viewingPlaylistId) {
    const activePlaylist = playlists.find(p => p.id === viewingPlaylistId);
    if (!activePlaylist) {
      setViewingPlaylistId(null);
      return null;
    }

    const handleShufflePlay = () => {
      if (activePlaylist.songs.length === 0) return;
      const shuffled = [...activePlaylist.songs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      onPlaySong(shuffled[0], shuffled);
    };

    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setViewingPlaylistId(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{activePlaylist.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: accentColor }]} onPress={() => onPlaySong(activePlaylist.songs[0], activePlaylist.songs)}>
            <Ionicons name="play" size={20} color={Theme.colors.background} />
            <Text style={[styles.actionBtnText, { color: Theme.colors.background }]}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Theme.colors.cardBackground }]} onPress={handleShufflePlay}>
            <Ionicons name="shuffle" size={20} color={Theme.colors.textPrimary} />
            <Text style={styles.actionBtnText}>Shuffle</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={activePlaylist.songs}
          // KEY FIX: Combines id with index so duplicate tracks never clash
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          getItemLayout={(data, index) => ({ length: 64, offset: 64 * index, index })}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => (
            <SongRow item={item} context={activePlaylist.songs} onPlay={handlePlaySong} onLongPress={handleLongPress} />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={48} color={Theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>Playlist is empty.</Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <View style={styles.mainHeaderContainer}>
        <Text style={styles.mainHeader}>Library.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.settingsBtn}>
            <Ionicons name="add-circle" size={30} color={accentColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsBtn}>
            <Ionicons name="cloud-download-outline" size={28} color={accentColor} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          data={customPlaylists}
          // KEY FIX: Combines playlist id with index to guarantee uniqueness
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={2}
          contentContainerStyle={styles.gridListContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={{ marginBottom: 30 }}>
              {likedPlaylist && (
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  style={[styles.heroCard, { backgroundColor: Theme.colors.cardBackground, borderColor: Theme.colors.cardBorder }]} 
                  onPress={() => setViewingPlaylistId(likedPlaylist.id)}
                >
                  <View style={[styles.heroAbstractCircle1, { backgroundColor: Theme.colors.accentGlow }]} />
                  <View style={styles.heroContent}>
                    <View style={[styles.heroIconWrapper, { backgroundColor: accentColor }]}>
                      <Ionicons name="heart" size={28} color={Theme.colors.background} />
                    </View>
                    <View>
                      <Text style={styles.heroTitle}>Liked Songs</Text>
                      <Text style={styles.heroSubtitle}>{likedPlaylist.songs.length} Tracks</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              <Text style={styles.sectionHeader}>YOUR PLAYLISTS</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.gridCard} 
              onPress={() => setViewingPlaylistId(item.id)}
              onLongPress={() => handleDelete(item.id, item.name)}
            >
              <View style={styles.gridCardArtwork}>
                <Ionicons name="musical-notes" size={36} color={Theme.colors.textSecondary} />
              </View>
              <Text style={styles.gridCardTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.gridCardCount}>{item.songs.length} Tracks</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={() => <View style={{ height: 100 }} />}
        />
      </View>

      {/* CREATE PLAYLIST MODAL */}
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>New Playlist</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close-circle" size={28} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>Give your new custom playlist a name.</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="folder-outline" size={20} color={Theme.colors.textSecondary} style={{ marginRight: 10 }} />
              <TextInput 
                style={styles.modalInput} 
                placeholder="My Awesome Mix..." 
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus={true}
              />
            </View>
            <TouchableOpacity style={[styles.importBtn, { backgroundColor: accentColor }]} onPress={handleCreate}>
              <Ionicons name="add" size={18} color={Theme.colors.background} />
              <Text style={[styles.importBtnText, { color: Theme.colors.background }]}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* IMPORTER MODAL */}
      <Modal visible={showSettings} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Import Web Playlist</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close-circle" size={28} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>Paste ONE single link to a public Spotify playlist. The app will fetch all the songs inside it at once.</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="link" size={20} color={Theme.colors.textSecondary} style={{ marginRight: 10 }} />
              <TextInput 
                style={styles.modalInput} 
                placeholder="https://open.spotify.com/playlist/..." 
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={importUrl}
                onChangeText={setImportUrl}
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity style={[styles.importBtn, { backgroundColor: accentColor }]} onPress={handleImport}>
              <Ionicons name="download" size={18} color={Theme.colors.background} />
              <Text style={[styles.importBtnText, { color: Theme.colors.background }]}>Fetch All Songs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  mainHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 10, marginBottom: 15 },
  mainHeader: { color: Theme.colors.textPrimary, fontSize: 42, fontWeight: '900', letterSpacing: -1.5 },
  settingsBtn: { padding: 5 },
  
  gridListContainer: { paddingHorizontal: 20 },
  heroCard: { position: 'relative', overflow: 'hidden', width: '100%', height: 130, borderRadius: 20, borderWidth: 1, justifyContent: 'flex-end', padding: 20 },
  heroAbstractCircle1: { position: 'absolute', top: -50, right: -20, width: 150, height: 150, borderRadius: 75, opacity: 0.6 },
  heroContent: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  heroIconWrapper: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  heroTitle: { color: Theme.colors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroSubtitle: { color: Theme.colors.textSecondary, fontSize: 15, fontWeight: '600', marginTop: 4 },
  sectionHeader: { color: Theme.colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 30, marginBottom: 5 },
  
  gridCard: { width: GRID_ITEM_WIDTH, marginBottom: 20, marginRight: 20 },
  gridCardArtwork: { width: '100%', aspectRatio: 1, backgroundColor: Theme.colors.cardBackground, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.cardBorder, marginBottom: 10 },
  gridCardTitle: { color: Theme.colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  gridCardCount: { color: Theme.colors.textSecondary, fontSize: 13, fontWeight: '500' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
  backBtn: { padding: 5, marginLeft: -5 },
  headerTitle: { color: Theme.colors.textPrimary, fontSize: 22, fontWeight: '800', flex: 1, textAlign: 'center', letterSpacing: -0.5 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginBottom: 30 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionBtnText: { color: Theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  songRow: { flexDirection: 'row', alignItems: 'center', height: 50, marginBottom: 16 },
  artwork: { width: 50, height: 50, borderRadius: 10, backgroundColor: Theme.colors.cardBackground },
  songInfo: { flex: 1, marginLeft: 14 },
  songTitle: { color: Theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
  songArtist: { color: Theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyStateText: { color: Theme.colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Theme.colors.cardBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 50, borderWidth: 1, borderColor: Theme.colors.cardBorder },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { color: Theme.colors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  modalDesc: { color: Theme.colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 25, marginTop: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.background, borderRadius: 14, paddingHorizontal: 16, height: 55, borderWidth: 1, borderColor: Theme.colors.cardBorder, marginBottom: 25 },
  modalInput: { flex: 1, color: Theme.colors.textPrimary, fontSize: 16 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 14, gap: 8 },
  importBtnText: { fontSize: 17, fontWeight: '700' }
});