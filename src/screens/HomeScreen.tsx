import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Theme } from '../theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.headerText}>Library.</Text>
        <Text style={styles.subText}>The audio engine is successfully running in the background.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerText: {
    color: Theme.colors.textPrimary,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  subText: {
    color: Theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});