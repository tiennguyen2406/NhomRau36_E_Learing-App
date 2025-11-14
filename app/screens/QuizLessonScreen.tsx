import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserByUsername, saveQuizResult } from "../api/api";

type QuizQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

type RouteParams = {
  courseId: string;
  lessonId: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  currentUserId?: string | null;
};

const QuizLessonScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    courseId,
    lessonId,
    title,
    description,
    questions: rawQuestions = [],
    currentUserId: routeUserId,
  } = (route.params || {}) as RouteParams;

  const quizQuestions = useMemo(() => {
    return (rawQuestions || []).map((q, idx) => {
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
  }, [rawQuestions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    quizQuestions.map(() => null)
  );
  const [submitted, setSubmitted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    routeUserId ? String(routeUserId) : null
  );
  const [savingResult, setSavingResult] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIndex(0);
    setSubmitted(false);
    setAnswers(quizQuestions.map(() => null));
    setSaveMessage(null);
    setSaveError(null);
  }, [quizQuestions]);

  useEffect(() => {
    if (currentUserId) return;
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
        console.error("Không tải được user hiện tại:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUserId]);

  const totalQuestions = quizQuestions.length;
  const currentQuestion = quizQuestions[currentIndex];

  const handleSelect = (optionIndex: number) => {
    if (submitted) return;
    setAnswers((prev) => {
      const copy = [...prev];
      copy[currentIndex] = optionIndex;
      return copy;
    });
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((idx) => idx - 1);
  };

  const goNext = () => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex((idx) => idx + 1);
  };

  const persistQuizResult = async () => {
    if (!lessonId || !courseId) return;
    if (!currentUserId) {
      setSaveError("Không tìm thấy thông tin người dùng để lưu kết quả.");
      return;
    }
    try {
      setSavingResult(true);
      setSaveError(null);
      setSaveMessage(null);
      const answersPayload = quizQuestions.map((q, idx) => ({
        questionIndex: idx,
        selectedIndex:
          typeof answers[idx] === "number" ? Number(answers[idx]) : null,
        correctIndex: q.correctIndex,
        isCorrect: answers[idx] === q.correctIndex,
      }));
      await saveQuizResult(lessonId, {
        userId: currentUserId,
        courseId,
        totalQuestions,
        correctCount,
        percentage: resultPercent,
        answers: answersPayload,
      });
      setSaveMessage("Đã lưu kết quả mới nhất.");
    } catch (error: any) {
      console.error("Lưu kết quả quiz lỗi:", error);
      setSaveError(
        error?.message || "Không thể lưu kết quả. Vui lòng thử lại sau."
      );
    } finally {
      setSavingResult(false);
    }
  };

  const submitQuiz = () => {
    if (submitted) return;
    setSubmitted(true);
    persistQuizResult();
  };

  const confirmSubmit = () => {
    const unanswered = answers.filter((a) => a === null).length;
    if (unanswered > 0) {
      Alert.alert(
        "Chưa hoàn thành",
        `Bạn còn ${unanswered} câu chưa chọn. Bạn vẫn muốn nộp bài?`,
        [
          { text: "Tiếp tục làm", style: "cancel" },
          { text: "Nộp luôn", style: "destructive", onPress: submitQuiz },
        ]
      );
    } else {
      submitQuiz();
    }
  };

  const restartQuiz = () => {
    setAnswers(quizQuestions.map(() => null));
    setCurrentIndex(0);
    setSubmitted(false);
    setSaveMessage(null);
    setSaveError(null);
  };

  const correctCount = useMemo<number>(() => {
    return answers.reduce<number>((sum, ans, idx) => {
      if (ans === null) return sum;
      return sum + (ans === quizQuestions[idx]?.correctIndex ? 1 : 0);
    }, 0);
  }, [answers, quizQuestions]);

  const resultPercent = totalQuestions
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  if (!totalQuestions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (navigation as any).goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || "Quiz"}
          </Text>
        </View>
        <View style={styles.empty}>
          <MaterialIcons name="help-outline" size={42} color="#aaa" />
          <Text style={styles.emptyText}>
            Bài quiz này chưa có câu hỏi nào.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || "Quiz"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.quizCard}>
          <Text style={styles.questionIndex}>
            Câu {currentIndex + 1}/{totalQuestions}
          </Text>
          <Text style={styles.questionText}>{currentQuestion?.text}</Text>
          {currentQuestion?.options?.map((option, idx) => {
            const selected = answers[currentIndex] === idx;
            const isCorrect =
              submitted && currentQuestion?.correctIndex === idx;
            const isWrong =
              submitted && selected && currentQuestion?.correctIndex !== idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionBtn,
                  selected && styles.optionSelected,
                  isCorrect && styles.optionCorrect,
                  isWrong && styles.optionWrong,
                ]}
                onPress={() => handleSelect(idx)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {option || `Lựa chọn ${idx + 1}`}
                </Text>
              </TouchableOpacity>
            );
          })}
          {submitted && currentQuestion?.explanation ? (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationTitle}>Giải thích</Text>
              <Text style={styles.explanationText}>
                {currentQuestion.explanation}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.navigationRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
            onPress={goPrev}
            disabled={currentIndex === 0}
          >
            <MaterialIcons name="chevron-left" size={22} color="#fff" />
            <Text style={styles.navBtnText}>Trước</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navBtn,
              currentIndex === totalQuestions - 1 && styles.navBtnDisabled,
            ]}
            onPress={goNext}
            disabled={currentIndex === totalQuestions - 1}
          >
            <Text style={styles.navBtnText}>Sau</Text>
            <MaterialIcons name="chevron-right" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, submitted && styles.submitBtnDisabled]}
          onPress={confirmSubmit}
          disabled={submitted}
        >
          <Text style={styles.submitBtnText}>
            {submitted ? "Đã nộp bài" : "Nộp bài"}
          </Text>
        </TouchableOpacity>
        {submitted ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Kết quả</Text>
            <Text style={styles.resultScore}>
              {correctCount}/{totalQuestions} câu đúng ({resultPercent}%)
            </Text>
            <Text style={styles.resultHint}>
              Bạn có thể xem lại từng câu để xem đáp án đúng.
            </Text>
            {savingResult ? (
              <Text style={styles.resultStatus}>Đang lưu kết quả...</Text>
            ) : saveError ? (
              <Text style={[styles.resultStatus, styles.resultStatusError]}>
                {saveError}
              </Text>
            ) : saveMessage ? (
              <Text style={[styles.resultStatus, styles.resultStatusSuccess]}>
                {saveMessage}
              </Text>
            ) : null}
          </View>
        ) : null}
        {submitted ? (
          <TouchableOpacity style={styles.retryBtn} onPress={restartQuiz}>
            <MaterialIcons name="refresh" size={18} color="#20B2AA" />
            <Text style={styles.retryText}>Làm lại</Text>
          </TouchableOpacity>
        ) : null}
        {description ? (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionTitle}>Mô tả</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  quizCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionIndex: {
    color: "#20B2AA",
    fontWeight: "700",
    marginBottom: 6,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  optionBtn: {
    borderWidth: 1,
    borderColor: "#d9d9d9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  optionSelected: {
    borderColor: "#20B2AA",
    backgroundColor: "#e7f7f5",
  },
  optionCorrect: {
    borderColor: "#4caf50",
    backgroundColor: "#e8f5e9",
  },
  optionWrong: {
    borderColor: "#f44336",
    backgroundColor: "#ffebee",
  },
  optionText: {
    fontSize: 14,
    color: "#333",
  },
  optionTextSelected: {
    fontWeight: "700",
  },
  navigationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 12,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#20B2AA",
    flex: 0.48,
  },
  navBtnDisabled: {
    backgroundColor: "#a8dcd6",
  },
  navBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: "#ff8a3d",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  submitBtnDisabled: {
    backgroundColor: "#ffc199",
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  resultBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e6f2f0",
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#333",
  },
  resultScore: {
    fontSize: 18,
    fontWeight: "700",
    color: "#20B2AA",
  },
  resultHint: {
    marginTop: 4,
    color: "#555",
  },
  descriptionBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  descriptionTitle: {
    fontWeight: "700",
    marginBottom: 6,
    color: "#333",
  },
  descriptionText: {
    color: "#555",
    lineHeight: 20,
  },
  explanationBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f6f6f6",
  },
  explanationTitle: {
    fontWeight: "700",
    marginBottom: 4,
    color: "#333",
  },
  explanationText: {
    color: "#555",
    lineHeight: 20,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    marginTop: 12,
    color: "#777",
  },
  resultStatus: {
    marginTop: 8,
    fontSize: 13,
  },
  resultStatusError: {
    color: "#d9534f",
  },
  resultStatusSuccess: {
    color: "#20B2AA",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#20B2AA",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  retryText: {
    color: "#20B2AA",
    fontWeight: "700",
    marginLeft: 6,
  },
});

export default QuizLessonScreen;

