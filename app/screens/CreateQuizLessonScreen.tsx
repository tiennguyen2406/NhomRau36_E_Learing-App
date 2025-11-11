import React, { useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createLesson } from "../api/api";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavProps } from "../navigation/AppNavigator";
import { MaterialIcons } from "@expo/vector-icons";

type QuizOption = { text: string };
type QuizQuestion = {
  text: string;
  options: QuizOption[];
  correctIndex: number;
  explanation?: string;
};

const CreateQuizLessonScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavProps>();
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { text: "", options: [{ text: "" }, { text: "" }], correctIndex: 0, explanation: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const addQuestion = () => {
    setQuestions((q) => [
      ...q,
      { text: "", options: [{ text: "" }, { text: "" }], correctIndex: 0, explanation: "" },
    ]);
  };

  const addOption = (qi: number) => {
    setQuestions((q) => {
      const copy = [...q];
      copy[qi].options = [...copy[qi].options, { text: "" }];
      return copy;
    });
  };

  const updateQuestion = (qi: number, patch: Partial<QuizQuestion>) => {
    setQuestions((q) => {
      const copy = [...q];
      copy[qi] = { ...copy[qi], ...patch };
      return copy;
    });
  };

  const updateOption = (qi: number, oi: number, text: string) => {
    setQuestions((q) => {
      const copy = [...q];
      const opts = [...copy[qi].options];
      opts[oi] = { text };
      copy[qi].options = opts;
      return copy;
    });
  };

  const payload = useMemo(() => {
    return {
      courseId: courseId.trim(),
      title: title.trim(),
      description: description.trim(),
      kind: "quiz",
      questions: questions.map((qq) => ({
        text: qq.text.trim(),
        options: qq.options.map((o) => o.text.trim()).filter(Boolean),
        correctIndex: qq.correctIndex,
        explanation: qq.explanation?.trim() || "",
      })),
    };
  }, [courseId, title, description, questions]);

  const onSubmit = async () => {
    if (!payload.courseId) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập Course ID.");
      return;
    }
    if (!payload.title) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề bài học.");
      return;
    }
    if (!payload.questions.length || payload.questions.some((q) => !q.text || q.options.length < 2)) {
      Alert.alert("Thiếu thông tin", "Mỗi câu hỏi cần nội dung và ít nhất 2 lựa chọn.");
      return;
    }
    try {
      setLoading(true);
      await createLesson(payload as any);
      setTitle("");
      setDescription("");
      setCourseId("");
      setQuestions([{ text: "", options: [{ text: "" }, { text: "" }], correctIndex: 0, explanation: "" }]);
      Alert.alert("Thành công", "Đã tạo bài học quiz.");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể tạo bài học quiz.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo bài học Quiz</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>Course ID</Text>
          <TextInput style={styles.input} value={courseId} onChangeText={setCourseId} placeholder="Nhập courseId" />

          <Text style={styles.label}>Tiêu đề</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Nhập tiêu đề" />

          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Nhập mô tả"
            multiline
          />

          <Text style={styles.section}>Câu hỏi</Text>
          {questions.map((q, qi) => (
            <View key={qi} style={styles.questionCard}>
              <Text style={styles.smallLabel}>Câu hỏi {qi + 1}</Text>
              <TextInput
                style={styles.input}
                value={q.text}
                onChangeText={(t) => updateQuestion(qi, { text: t })}
                placeholder="Nội dung câu hỏi"
              />
              <Text style={styles.smallLabel}>Các lựa chọn</Text>
              {q.options.map((op, oi) => (
                <View key={oi} style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={op.text}
                    onChangeText={(t) => updateOption(qi, oi, t)}
                    placeholder={`Lựa chọn ${oi + 1}`}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.addBtn} onPress={() => addOption(qi)}>
                <Text style={styles.addText}>+ Thêm lựa chọn</Text>
              </TouchableOpacity>
              <Text style={styles.smallLabel}>Đáp án đúng (chỉ số)</Text>
              <TextInput
                style={styles.input}
                value={String(q.correctIndex)}
                onChangeText={(t) => updateQuestion(qi, { correctIndex: Math.max(0, parseInt(t) || 0) })}
                placeholder="0, 1, 2..."
                keyboardType="numeric"
              />
              <Text style={styles.smallLabel}>Giải thích</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={q.explanation}
                onChangeText={(t) => updateQuestion(qi, { explanation: t })}
                placeholder="Giải thích (không bắt buộc)"
                multiline
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={addQuestion}>
            <Text style={styles.addText}>+ Thêm câu hỏi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={onSubmit} disabled={loading}>
            <Text style={styles.submitText}>Tạo bài học Quiz</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#333" },
  scroll: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, elevation: 2 },
  label: { fontSize: 12, color: "#666", marginTop: 10, marginBottom: 6 },
  smallLabel: { fontSize: 12, color: "#666", marginTop: 6, marginBottom: 6 },
  section: { fontSize: 14, fontWeight: "700", marginTop: 12 },
  input: { backgroundColor: "#f2f2f2", paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8 },
  textArea: { height: 90, textAlignVertical: "top" },
  questionCard: { backgroundColor: "#fafafa", borderRadius: 8, padding: 10, marginTop: 10 },
  optionRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  addBtn: { marginTop: 10, paddingVertical: 10, alignItems: "center", backgroundColor: "#eee", borderRadius: 8 },
  addText: { color: "#333", fontWeight: "600" },
  submitBtn: { marginTop: 16, backgroundColor: "#20B2AA", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700" },
});

export default CreateQuizLessonScreen;


