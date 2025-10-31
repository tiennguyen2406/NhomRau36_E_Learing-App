import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getLessonsByCourse } from "../api/api";

type RouteParams = { courseId: string; title?: string };

interface Lesson {
  id: string;
  title: string;
  duration?: number | string;
  order?: number;
  videoUrl?: string;
}

const CourseLessonsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId, title } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getLessonsByCourse(courseId);
        if (!mounted) return;
        setLessons(data || []);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Không tải được danh sách bài học");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [courseId]);

  const renderItem = ({ item }: { item: Lesson }) => (
    <View style={styles.lessonItem}>
      <View style={styles.lessonLeft}>
        <View style={styles.lessonIndex}><Text style={styles.lessonIndexText}>{(item.order ?? 0).toString().padStart(2,'0')}</Text></View>
        <View style={{flex:1}}>
          <Text style={styles.lessonTitle} numberOfLines={1}>{item.title || "Bài học"}</Text>
          {item.duration ? (
            <Text style={styles.lessonDuration} numberOfLines={1}>{typeof item.duration === 'number' ? `${item.duration} phút` : item.duration}</Text>
          ) : null}
        </View>
      </View>
      {item.videoUrl ? (
        <TouchableOpacity style={styles.playBtn} onPress={() => (navigation as any).navigate('VideoPlayer', { videoUrl: item.videoUrl, title: item.title })}>
          <MaterialIcons name="play-arrow" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color="#20B2AA" /><Text style={{marginTop:8}}>Đang tải...</Text></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Bài học'}</Text>
      </View>
      <FlatList
        data={lessons}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff' },
  headerTitle: { marginLeft: 12, fontSize: 18, fontWeight: '700', color: '#333', flex: 1 },
  lessonItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  lessonLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  lessonIndex: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eef6f6', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  lessonIndexText: { color: '#20B2AA', fontWeight: '700' },
  lessonTitle: { color: '#333', fontSize: 14, fontWeight: '700' },
  lessonDuration: { color: '#777', fontSize: 12, marginTop: 2 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#20B2AA', alignItems: 'center', justifyContent: 'center' },
});

export default CourseLessonsScreen;


