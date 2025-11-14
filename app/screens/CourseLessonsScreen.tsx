import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLessonsByCourse, getQuizResultsByCourse, getUserByUsername } from "../api/api";

type RouteParams = { courseId: string; title?: string };

interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration?: number | string;
  order?: number;
  videoUrl?: string;
  kind?: string;
  questions?: {
    text: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }[];
}

const CourseLessonsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId, title } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [quizProgress, setQuizProgress] = useState<Record<string, number>>({});
  const [progressLoading, setProgressLoading] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const username = await AsyncStorage.getItem("currentUsername");
        if (!mounted || !username) return;
        const user = await getUserByUsername(username);
        if (!mounted) return;
        if (user?.uid || user?.id) {
          setCurrentUserId(String(user.uid || user.id));
        }
      } catch (e) {
        console.error("Không tải được thông tin người dùng:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadQuizProgress = useCallback(async () => {
    if (!courseId || !currentUserId) return;
    try {
      setProgressLoading(true);
      const data = await getQuizResultsByCourse(courseId, currentUserId);
      const map: Record<string, number> = {};
      (Array.isArray(data) ? data : []).forEach((item: any) => {
        if (item.lessonId) {
          map[item.lessonId] =
            typeof item.percentage === "number" ? item.percentage : 0;
        }
      });
      setQuizProgress(map);
    } catch (e) {
      console.error("Không tải được tiến độ quiz:", e);
    } finally {
      setProgressLoading(false);
    }
  }, [courseId, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadQuizProgress();
    }, [loadQuizProgress])
  );

  const openQuizLesson = (lesson: Lesson) => {
    if (!lesson.questions || lesson.questions.length === 0) {
      Alert.alert("Bài quiz trống", "Bài học này chưa có câu hỏi nào.");
      return;
    }
    const formattedQuestions = lesson.questions.map((q, idx) => {
      const options = Array.isArray(q.options) ? q.options : [];
      let correctIndex = Number.isFinite(q.correctIndex as any)
        ? Number(q.correctIndex)
        : parseInt(String(q.correctIndex ?? 0), 10) || 0;
      if (correctIndex < 0 || correctIndex >= options.length) {
        correctIndex = 0;
      }
      return {
        text: q.text || `Câu hỏi ${idx + 1}`,
        options,
        correctIndex,
        explanation: q.explanation || "",
      };
    });

    (navigation as any).navigate("QuizLesson", {
      lessonId: lesson.id,
      courseId,
      title: lesson.title,
      description: lesson.description,
      questions: formattedQuestions,
      currentUserId,
    });
  };

  const renderItem = ({ item }: { item: Lesson }) => {
    const isQuiz = (item.kind || "").toLowerCase() === "quiz";
    return (
      <View style={styles.lessonItem}>
        <View style={styles.lessonLeft}>
          <View style={styles.lessonIndex}>
            <Text style={styles.lessonIndexText}>
              {(item.order ?? 0).toString().padStart(2, "0")}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.lessonTitleRow}>
              <Text style={styles.lessonTitle} numberOfLines={1}>
                {item.title || "Bài học"}
              </Text>
              {isQuiz ? (
                <View style={styles.quizChip}>
                  <Text style={styles.quizChipText}>Quiz</Text>
                </View>
              ) : null}
            </View>
            {item.duration ? (
              <Text style={styles.lessonDuration} numberOfLines={1}>
                {typeof item.duration === "number"
                  ? `${item.duration} phút`
                  : item.duration}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.lessonRight}>
          {isQuiz ? (
            <TouchableOpacity
              style={styles.quizProgressBtn}
              onPress={() => openQuizLesson(item)}
            >
              <Text style={styles.quizProgressText}>
                {typeof quizProgress[item.id] === "number"
                  ? `${quizProgress[item.id]}%`
                  : progressLoading
                  ? "..."
                  : "Làm bài"}
              </Text>
            </TouchableOpacity>
          ) : item.videoUrl ? (
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() =>
                (navigation as any).navigate("VideoPlayer", {
                  videoUrl: item.videoUrl,
                  title: item.title,
                })
              }
            >
              <MaterialIcons name="play-arrow" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

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
  lessonTitleRow: { flexDirection: 'row', alignItems: 'center' },
  lessonTitle: { color: '#333', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  lessonRight: { marginLeft: 10 },
  lessonDuration: { color: '#777', fontSize: 12, marginTop: 2 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#20B2AA', alignItems: 'center', justifyContent: 'center' },
  quizProgressBtn: { minWidth: 64, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#20B2AA', alignItems: 'center', justifyContent: 'center' },
  quizProgressText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  quizChip: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#e7f7f5', borderRadius: 8 },
  quizChipText: { color: '#20B2AA', fontSize: 11, fontWeight: '700' },
});

export default CourseLessonsScreen;


