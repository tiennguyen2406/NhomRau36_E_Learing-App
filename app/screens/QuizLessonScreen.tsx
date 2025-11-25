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
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useThemeColors } from "../../hooks/use-theme-colors";

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
  const colors = useThemeColors();
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
    quizCard: {
      backgroundColor: colors.cardBackground,
    },
    questionText: {
      color: colors.primaryText,
    },
    optionBtn: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.borderColor,
    },
    optionText: {
      color: colors.primaryText,
    },
    emptyText: {
      color: colors.secondaryText,
    },
    resultTitle: {
      color: colors.primaryText,
    },
    resultScore: {
      color: colors.primaryText,
    },
    resultHint: {
      color: colors.secondaryText,
    },
    descriptionTitle: {
      color: colors.primaryText,
    },
    descriptionText: {
      color: colors.secondaryText,
    },
    explanationTitle: {
      color: colors.primaryText,
    },
    explanationText: {
      color: colors.secondaryText,
    },
  }), [colors]);

  if (!totalQuestions) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity onPress={() => (navigation as any).goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]} numberOfLines={1}>
            {title || "Quiz"}
          </ThemedText>
        </View>
        <View style={styles.empty}>
          <MaterialIcons name="help-outline" size={42} color={colors.placeholderText} />
          <ThemedText style={[styles.emptyText, dynamicStyles.emptyText]}>
            Bài quiz này chưa có câu hỏi nào.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]} numberOfLines={1}>
          {title || "Quiz"}
        </ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.quizCard, dynamicStyles.quizCard]}>
          <ThemedText style={styles.questionIndex}>
            Câu {currentIndex + 1}/{totalQuestions}
          </ThemedText>
          <ThemedText style={[styles.questionText, dynamicStyles.questionText]}>{currentQuestion?.text}</ThemedText>
          {currentQuestion?.options?.map((option, idx) => {
            const selected = answers[currentIndex] === idx;
            const isCorrectAnswer = currentQuestion?.correctIndex === idx;
            
            // Sau khi submit: hiển thị đáp án đúng (màu xanh) và đáp án sai được chọn (màu đỏ)
            const showCorrect = submitted && isCorrectAnswer;
            const showWrong = submitted && selected && !isCorrectAnswer;
            const showSelected = !submitted && selected;
            
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionBtn,
                  dynamicStyles.optionBtn,
                  showSelected && styles.optionSelected,
                  showCorrect && styles.optionCorrect,
                  showWrong && styles.optionWrong,
                ]}
                onPress={() => handleSelect(idx)}
                activeOpacity={0.8}
                disabled={submitted}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionLabel}>
                    <Text style={styles.optionLabelText}>{String.fromCharCode(65 + idx)}</Text>
                  </View>
                  <ThemedText
                    style={[
                      styles.optionText,
                      dynamicStyles.optionText,
                      (showSelected || showCorrect || showWrong) && styles.optionTextSelected,
                    ]}
                  >
                    {option || `Lựa chọn ${idx + 1}`}
                  </ThemedText>
                  {showCorrect && (
                    <MaterialIcons name="check-circle" size={24} color="#4caf50" />
                  )}
                  {showWrong && (
                    <MaterialIcons name="cancel" size={24} color="#f44336" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {submitted && currentQuestion?.explanation ? (
            <View style={styles.explanationBox}>
              <ThemedText style={[styles.explanationTitle, dynamicStyles.explanationTitle]}>Giải thích</ThemedText>
              <ThemedText style={[styles.explanationText, dynamicStyles.explanationText]}>
                {currentQuestion.explanation}
              </ThemedText>
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
          <ThemedText style={styles.submitBtnText}>
            {submitted ? "Đã nộp bài" : "Nộp bài"}
          </ThemedText>
        </TouchableOpacity>
        {submitted ? (
          <View style={[styles.resultBox, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.resultTitle, dynamicStyles.resultTitle]}>Kết quả</ThemedText>
            <ThemedText style={[styles.resultScore, dynamicStyles.resultScore]}>
              {correctCount}/{totalQuestions} câu đúng ({resultPercent}%)
            </ThemedText>
            <ThemedText style={[styles.resultHint, dynamicStyles.resultHint]}>
              Bạn có thể xem lại từng câu để xem đáp án đúng.
            </ThemedText>
            {savingResult ? (
              <ThemedText style={styles.resultStatus}>Đang lưu kết quả...</ThemedText>
            ) : saveError ? (
              <ThemedText style={[styles.resultStatus, styles.resultStatusError]}>
                {saveError}
              </ThemedText>
            ) : saveMessage ? (
              <ThemedText style={[styles.resultStatus, styles.resultStatusSuccess]}>
                {saveMessage}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
        {submitted ? (
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.cardBackground }]} onPress={restartQuiz}>
            <MaterialIcons name="refresh" size={18} color="#20B2AA" />
            <ThemedText style={styles.retryText}>Làm lại</ThemedText>
          </TouchableOpacity>
        ) : null}
        {description ? (
          <View style={[styles.descriptionBox, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={[styles.descriptionTitle, dynamicStyles.descriptionTitle]}>Mô tả</ThemedText>
            <ThemedText style={[styles.descriptionText, dynamicStyles.descriptionText]}>{description}</ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  quizCard: {
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
    marginBottom: 12,
  },
  optionBtn: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderColor: "#e0e0e0",
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
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  optionLabelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: "600",
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
  },
  resultScore: {
    fontSize: 18,
    fontWeight: "700",
    color: "#20B2AA",
  },
  resultHint: {
    marginTop: 4,
  },
  descriptionBox: {
    borderRadius: 16,
    padding: 16,
  },
  descriptionTitle: {
    fontWeight: "700",
    marginBottom: 6,
  },
  descriptionText: {
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
  },
  retryText: {
    color: "#20B2AA",
    fontWeight: "700",
    marginLeft: 6,
  },
});

export default QuizLessonScreen;

