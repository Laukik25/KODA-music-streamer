import React from 'react';
import { View, Text, TextInput, FlatList, Image, TouchableOpacity, StyleSheet, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { Theme } from '../theme';

interface Props {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  loading: boolean;
  songs: Song[];
  onPlaySong: (song: Song, context: Song[]) => void;
  onOpenAddModal: (song: Song) => void;
  accentColor: string;
  onLongPressSong: (song: Song) => void; 
  onImportPlaylist?: (url: string) => void; // Link to the importer logic
}

export const SearchScreen = ({ searchQuery, setSearchQuery, onSearch, loading, songs, onPlaySong, accentColor, onLongPressSong, onImportPlaylist }: Props) => {
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) return 'Good Night'; 
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  const isUrl = searchQuery.trim().startsWith('http');
  
  // Triggers the URL import process directly from the search bar
  const handleRipAction = () => {
    Keyboard.dismiss();
    if (isUrl && onImportPlaylist) {
      onImportPlaylist(searchQuery.trim());
    }
    setSearchQuery('');
  };

  const renderTrack = ({ item }: { item: Song }) => (
    <TouchableOpacity style={styles.songRow} onPress={() => onPlaySong(item, songs)} onLongPress={() => onLongPressSong(item)} delayLongPress={300}>
      <Image source={{ uri: item.artwork, cache: 'force-cache' }} style={styles.artwork} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <TouchableOpacity onPress={() => onLongPressSong(item)} style={{ padding: 10 }}>
        <Ionicons name="ellipsis-horizontal" size={20} color={Theme.colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      
      <View style={[styles.searchContainer, isUrl && { borderColor: accentColor, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
        <TouchableOpacity onPress={isUrl ? handleRipAction : onSearch} style={styles.searchIconBtn}>
          <Ionicons name={isUrl ? "download-outline" : "search"} size={20} color={isUrl ? accentColor : Theme.colors.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput} 
          placeholder="Search for songs, movies, lyrics..."
          placeholderTextColor="rgba(255,255,255,0.3)" 
          value={searchQuery}
          onChangeText={setSearchQuery} 
          onSubmitEditing={isUrl ? handleRipAction : onSearch}
        />
      </View>

      {searchQuery.length === 0 ? (
        <ScrollView style={styles.dashboard} showsVerticalScrollIndicator={false}>
          <Text style={styles.greetingHeader}>{getGreeting()}</Text>
          <Text style={styles.sectionHeader}>RECENT HISTORY</Text>
          <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
             {songs.slice(0, 6).map((song, i) => (
               <View key={`recent-${song.id}-${i}`}>
                 {renderTrack({ item: song })}
               </View>
             ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={songs} keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderTrack} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', marginHorizontal: 20, marginTop: 10, marginBottom: 30, borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#222222' },
  searchIconBtn: { marginRight: 12, padding: 4 },
  searchInput: { flex: 1, color: Theme.colors.textPrimary, fontSize: 16, fontWeight: '500' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  songRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: 'transparent' },
  artwork: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#111' },
  songInfo: { flex: 1, marginLeft: 16 },
  songTitle: { color: Theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
  songArtist: { color: Theme.colors.textSecondary, fontSize: 14, marginTop: 4 },
  dashboard: { flex: 1 },
  greetingHeader: { color: Theme.colors.textPrimary, fontSize: 42, fontWeight: '900', letterSpacing: -2, marginHorizontal: 20, marginTop: 10, marginBottom: 50 },
  sectionHeader: { color: Theme.colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginHorizontal: 20, marginBottom: 20 },
});