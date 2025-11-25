import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLessonsByCourse, getQuizResultsByCourse, getUserByUsername } from "../api/api";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useThemeColors } from "../../hooks/use-theme-colors";

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
  const colors = useThemeColors();
  const { courseId, title } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [quizProgress, setQuizProgress] = useState<Record<string, number>>({});
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    // Kiểm tra courseId trước khi gọi API
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      setError("ID khóa học không hợp lệ");
      setLoading(false);
      return;
    }

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

  // Dynamic styles
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.containerBackground,
    },
    header: {
      backgroundColor: colors.headerBackground,
    },
    headerTitle: {
      color: colors.primaryText,
    },
    lessonItem: {
      backgroundColor: colors.cardBackground,
    },
    lessonTitle: {
      color: colors.primaryText,
    },
    lessonDuration: {
      color: colors.secondaryText,
    },
  }), [colors]);

  // Tách lessons thành video lessons và quiz lessons
  const { videoLessons, quizLessons } = useMemo(() => {
    const videos: Lesson[] = [];
    const quizzes: Lesson[] = [];
    
    lessons.forEach(lesson => {
      if ((lesson.kind || "").toLowerCase() === "quiz") {
        quizzes.push(lesson);
      } else {
        videos.push(lesson);
      }
    });
    
    // Sắp xếp theo order
    videos.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    quizzes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    return { videoLessons: videos, quizLessons: quizzes };
  }, [lessons]);

  const renderVideoLesson = ({ item, index }: { item: Lesson; index: number }) => {
    return (
      <View style={[styles.lessonItem, dynamicStyles.lessonItem]}>
        <View style={styles.lessonLeft}>
          <View style={styles.lessonIndex}>
            <Text style={styles.lessonIndexText}>
              {(index + 1).toString().padStart(2, "0")}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.lessonTitle, dynamicStyles.lessonTitle]} numberOfLines={1}>
              {item.title || "Bài học"}
            </ThemedText>
            {item.duration ? (
              <ThemedText style={[styles.lessonDuration, dynamicStyles.lessonDuration]} numberOfLines={1}>
                {typeof item.duration === "number"
                  ? `${item.duration} phút`
                  : item.duration}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <View style={styles.lessonRight}>
          {item.videoUrl ? (
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

  const renderQuizLesson = ({ item, index }: { item: Lesson; index: number }) => {
    const progressPercent = quizProgress[item.id];
    const hasProgress = typeof progressPercent === "number";
    
    return (
      <View style={[styles.quizItem, dynamicStyles.lessonItem]}>
        <View style={styles.quizIconContainer}>
          <MaterialIcons name="quiz" size={28} color="#20B2AA" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.quizTitleRow}>
            <ThemedText style={[styles.quizTitle, dynamicStyles.lessonTitle]} numberOfLines={1}>
              {item.title || "Bài quiz"}
            </ThemedText>
            <View style={styles.quizChip}>
              <Text style={styles.quizChipText}>Quiz {index + 1}</Text>
            </View>
          </View>
          {item.description ? (
            <ThemedText style={[styles.quizDescription, dynamicStyles.lessonDuration]} numberOfLines={2}>
              {item.description}
            </ThemedText>
          ) : null}
          {item.questions && item.questions.length > 0 ? (
            <ThemedText style={[styles.quizInfo, dynamicStyles.lessonDuration]}>
              {item.questions.length} câu hỏi
            </ThemedText>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.quizActionBtn,
            hasProgress && progressPercent === 100 && styles.quizActionBtnCompleted
          ]}
          onPress={() => openQuizLesson(item)}
        >
          {hasProgress ? (
            <>
              <MaterialIcons 
                name={progressPercent === 100 ? "check-circle" : "pending"} 
                size={18} 
                color="#fff" 
              />
              <Text style={styles.quizActionText}>{progressPercent}%</Text>
            </>
          ) : progressLoading ? (
            <Text style={styles.quizActionText}>...</Text>
          ) : (
            <>
              <MaterialIcons name="play-circle-outline" size={18} color="#fff" />
              <Text style={styles.quizActionText}>Bắt đầu</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return <ThemedView style={styles.center}><ActivityIndicator color="#20B2AA" /><ThemedText style={{marginTop:8, color: colors.secondaryText}}>Đang tải...</ThemedText></ThemedView>;
  if (error) return <ThemedView style={styles.center}><ThemedText style={{color: colors.primaryText}}>{error}</ThemedText></ThemedView>;

  return (
    <ThemedView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]} numberOfLines={1}>{title || 'Bài học'}</ThemedText>
        <TouchableOpacity 
          onPress={() => (navigation as any).navigate('CourseReview', { 
            courseId, 
            courseTitle: title 
          })}
          style={styles.reviewBtn}
        >
          <MaterialIcons name="star" size={22} color="#FFD700" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={videoLessons}
        renderItem={renderVideoLesson}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <ThemedView style={styles.emptySection}>
            <ThemedText style={[styles.emptyText, { color: colors.secondaryText }]}>
              Chưa có bài học video nào
            </ThemedText>
          </ThemedView>
        }
        ListFooterComponent={
          quizLessons.length > 0 ? (
            <View style={styles.quizSection}>
              <View style={[styles.quizSectionHeader, dynamicStyles.lessonItem]}>
                <MaterialIcons name="assignment" size={24} color="#20B2AA" />
                <ThemedText style={[styles.quizSectionTitle, dynamicStyles.lessonTitle]}>
                  Bài test kết thúc khóa học
                </ThemedText>
              </View>
              {quizLessons.map((quiz, index) => (
                <View key={quiz.id}>
                  {renderQuizLesson({ item: quiz, index })}
                  {index < quizLessons.length - 1 && <View style={{ height: 10 }} />}
                </View>
              ))}
            </View>
          ) : null
        }
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12 },
  headerTitle: { marginLeft: 12, fontSize: 18, fontWeight: '700', flex: 1 },
  reviewBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff8e1', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  
  // Video lesson styles
  lessonItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12 },
  lessonLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  lessonIndex: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eef6f6', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  lessonIndexText: { color: '#20B2AA', fontWeight: '700' },
  lessonTitle: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  lessonRight: { marginLeft: 10 },
  lessonDuration: { fontSize: 12, marginTop: 2 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#20B2AA', alignItems: 'center', justifyContent: 'center' },
  
  // Quiz section styles
  quizSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  quizSectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  quizSectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginLeft: 10,
  },
  
  // Quiz item styles
  quizItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 12, 
    padding: 16,
    borderWidth: 2,
    borderColor: '#20B2AA',
  },
  quizIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#e7f7f5', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  quizTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  quizTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  quizDescription: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  quizInfo: { fontSize: 11, marginTop: 4, fontWeight: '600', opacity: 0.7 },
  
  // Quiz action button
  quizActionBtn: { 
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: '#20B2AA',
    marginLeft: 12,
  },
  quizActionBtnCompleted: {
    backgroundColor: '#4CAF50',
  },
  quizActionText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 4 },
  
  quizChip: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#e7f7f5', borderRadius: 8 },
  quizChipText: { color: '#20B2AA', fontSize: 11, fontWeight: '700' },
  
  // Empty section
  emptySection: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
});

export default CourseLessonsScreen;


