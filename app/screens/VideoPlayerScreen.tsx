import { useRoute, useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';

type RouteParams = { videoUrl: string; title?: string };

const VideoPlayerScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { videoUrl, title } = (route.params || {}) as RouteParams;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title || 'Video'}</Text>
      </View>
      <Video
        source={{ uri: videoUrl }}
        style={styles.video}
        useNativeControls
        resizeMode="contain"
        shouldPlay
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10, backgroundColor: '#111' },
  title: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 12, flex: 1 },
  video: { flex: 1 },
});

export default VideoPlayerScreen;


