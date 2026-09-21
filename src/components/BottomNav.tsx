import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme';

interface Props {
  currentTab: 'search' | 'library';
  onTabSelect: (tab: 'search' | 'library') => void;
  accentColor: string;
}

export const BottomNav = ({ currentTab, onTabSelect, accentColor }: Props) => (
  <View style={styles.container}>
    <View style={styles.pill}>
      <TouchableOpacity style={styles.navItem} onPress={() => onTabSelect('search')}>
        <Ionicons name={currentTab === 'search' ? "search" : "search-outline"} size={22} color={currentTab === 'search' ? accentColor : Theme.colors.textSecondary} />
        <Text style={[styles.navText, currentTab === 'search' && { color: accentColor, fontWeight: '600' }]}>Search</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navItem} onPress={() => onTabSelect('library')}>
        <Ionicons name={currentTab === 'library' ? "albums" : "albums-outline"} size={22} color={currentTab === 'library' ? accentColor : Theme.colors.textSecondary} />
        <Text style={[styles.navText, currentTab === 'library' && { color: accentColor, fontWeight: '600' }]}>Library</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 25, left: 0, right: 0, alignItems: 'center' },
  pill: { flexDirection: 'row', height: 60, width: '55%', backgroundColor: Theme.colors.surface, borderRadius: 30, justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.8, shadowRadius: 15 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navText: { fontSize: 10, marginTop: 4, color: Theme.colors.textSecondary }
});