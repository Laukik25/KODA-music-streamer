import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme';

export const Header = ({ accentColor }: { accentColor: string }) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>
      K O D A <Text style={{ color: accentColor, fontWeight: 'bold' }}>.</Text>
    </Text>
  </View>
);

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, marginBottom: 15, paddingTop: 10 },
  headerTitle: { color: Theme.colors.textPrimary, fontSize: 22, fontWeight: '300', letterSpacing: 4 }
});