import { useRoute, useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useThemeColors } from '../../hooks/use-theme-colors';

type RouteParams = { videoUrl: string; title?: string };

const VideoPlayerScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { videoUrl, title } = (route.params || {}) as RouteParams;

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.containerBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.title, { color: colors.primaryText }]} numberOfLines={1}>{title || 'Video'}</ThemedText>
      </View>
      <Video
        source={{ uri: videoUrl }}
        style={styles.video}
        useNativeControls
        resizeMode="contain"
        shouldPlay
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: '600', marginLeft: 12, flex: 1 },
  video: { flex: 1 },
});

export default VideoPlayerScreen;


