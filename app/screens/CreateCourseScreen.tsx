import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { createProofCourse, getCategories, uploadProofFile, getUserByUsername } from "../api/api";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { RootStackNavProps } from "../navigation/AppNavigator";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CreateCourseScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavProps>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [price, setPrice] = useState<string>("0");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [thumbnailLocal, setThumbnailLocal] = useState<{ uri: string; type?: string; name?: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories();
        setCategories(Array.isArray(cats) ? cats : []);
      } catch {}
    })();
  }, []);

  // Lắng nghe khi quay lại từ CreateQuizLessonScreen để lấy dữ liệu quiz lesson
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const pendingQuizLesson = await AsyncStorage.getItem("pendingQuizLesson");
          if (pendingQuizLesson) {
            const quizData = JSON.parse(pendingQuizLesson);
            // Thêm quiz lesson vào mảng lessons
            setLessons((ls) => [
              ...ls,
              {
                kind: "quiz",
                title: quizData.title || "",
                description: quizData.description || "",
                order: String(ls.length + 1),
                questions: (quizData.questions || []).map((q: any) => ({
                  text: q.text || "",
                  options: (q.options || []).map((o: any) => String(o || "")).filter(Boolean),
                  correctIndex: Number(q.correctIndex) || 0,
                  explanation: String(q.explanation || ""),
                })),
              },
            ]);
            // Xóa dữ liệu tạm thời
            await AsyncStorage.removeItem("pendingQuizLesson");
          }
        } catch (e) {
          console.error("Lỗi khi đọc quiz lesson từ AsyncStorage:", e);
        }
      })();
    }, [])
  );

  const categoryOptions = useMemo(
    () =>
      (categories || []).map((c) => ({
        label: String(c.name || c.id),
        value: String(c.id),
      })),
    [categories]
  );

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề khóa học.");
      return;
    }
    if (!categoryId) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn danh mục.");
      return;
    }
    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      category: categoryId,
      price: Number(price) || 0,
      isPublished: false,
      thumbnailUrl: thumbnailUrl.trim(),
    };
    if (lessons.length) {
      payload.lessons = lessons.map((l) => ({
        title: String(l.title || ""),
        description: String(l.description || ""),
        order: Number(l.order) || 0,
        kind: l.kind || "video",
        videoUrl: l.kind === "video" ? String(l.videoUrl || "") : "",
        questions:
          l.kind === "quiz"
            ? (l.questions || []).map((q: any) => ({
                text: String(q.text || ""),
                options: (q.options || []).map((o: any) => String(o || "")).filter(Boolean),
                correctIndex: Number(q.correctIndex) || 0,
                explanation: String(q.explanation || ""),
              }))
            : undefined,
      }));
    }
    try {
      setLoading(true);

      // Upload thumbnail nếu chọn từ máy
      let thumbUrl = payload.thumbnailUrl;
      if (thumbnailLocal?.uri) {
        thumbUrl = await uploadProofFile({
          uri: thumbnailLocal.uri,
          name: thumbnailLocal.name || "thumbnail",
          type: thumbnailLocal.type || "image/jpeg",
        });
      }
      payload.thumbnailUrl = thumbUrl;

      // Lấy uid hiện tại
      const username = await AsyncStorage.getItem("currentUsername");
      let uid: string | null = null;
      if (username) {
        try {
          const user = await getUserByUsername(username);
          uid = user?.uid || user?.id || null;
        } catch {}
      }
      if (!uid) {
        Alert.alert("Lỗi", "Không xác định được người dùng hiện tại.");
        return;
      }

      await createProofCourse(uid, payload);
      // Reset toàn bộ form
      setTitle("");
      setDescription("");
      setCategoryId(null);
      setPrice("0");
      setThumbnailUrl("");
      setThumbnailLocal(null);
      setIsPublished(false);
      setLessons([]);
      Alert.alert("Đã gửi yêu cầu", "Khóa học đang chờ phê duyệt.");
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể tạo khóa học.");
    } finally {
      setLoading(false);
    }
  };

  const pickThumbnail = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Quyền truy cập", "Cần cấp quyền truy cập thư viện để chọn ảnh.");
      return;
    }
    const rs = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!rs.canceled && rs.assets?.length) {
      const a = rs.assets[0];
      setThumbnailLocal({ uri: a.uri, type: a.mimeType || "image/jpeg", name: a.fileName || "thumbnail.jpg" });
      setThumbnailUrl(a.uri);
    }
  };

  const pickVideoForLesson = async (index: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Quyền truy cập", "Cần cấp quyền truy cập thư viện để chọn video.");
      return;
    }
    const rs = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!rs.canceled && rs.assets?.length) {
      const a = rs.assets[0];
      try {
        setLoading(true);
        const url = await uploadProofFile({ uri: a.uri, name: a.fileName || "video.mp4", type: a.mimeType || "video/mp4" });
        updateLesson(index, { videoUrl: url });
      } catch (e: any) {
        Alert.alert("Lỗi", e?.message || "Tải video thất bại.");
      } finally {
        setLoading(false);
      }
    }
  };
  const addVideoLesson = () => {
    setLessons((ls) => [
      ...ls,
      { kind: "video", title: "", description: "", order: String(ls.length + 1), videoUrl: "" },
    ]);
  };

  const addQuizLesson = () => {
    setLessons((ls) => [
      ...ls,
      {
        kind: "quiz",
        title: "",
        description: "",
        order: String(ls.length + 1),
        questions: [{ text: "", options: ["", ""], correctIndex: 0, explanation: "" }],
      },
    ]);
  };

  const updateLesson = (index: number, patch: any) => {
    setLessons((ls) => {
      const copy = [...ls];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const updateQuizQuestion = (li: number, qi: number, patch: any) => {
    setLessons((ls) => {
      const copy = [...ls];
      const qs = [...(copy[li].questions || [])];
      qs[qi] = { ...qs[qi], ...patch };
      copy[li].questions = qs;
      return copy;
    });
  };

  const addQuizOption = (li: number, qi: number) => {
    setLessons((ls) => {
      const copy = [...ls];
      const qs = [...(copy[li].questions || [])];
      const opts = [...(qs[qi].options || [])];
      opts.push("");
      qs[qi].options = opts;
      copy[li].questions = qs;
      return copy;
    });
  };

  const addQuizQuestionRow = (li: number) => {
    setLessons((ls) => {
      const copy = [...ls];
      const qs = [...(copy[li].questions || [])];
      qs.push({ text: "", options: ["", ""], correctIndex: 0, explanation: "" });
      copy[li].questions = qs;
      return copy;
    });
  };

  const removeLesson = (index: number) => {
    setLessons((ls) => ls.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Tạo khóa học</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Tiêu đề</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập tiêu đề khóa học"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Nhập mô tả"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.label}>Danh mục</Text>
          <Dropdown
            style={styles.dropdown}
            data={categoryOptions}
            labelField="label"
            valueField="value"
            placeholder="Chọn danh mục"
            value={categoryId}
            onChange={(it: any) => setCategoryId(it.value)}
          />

          <Text style={styles.label}>Giá khóa học (VND)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập giá (VD: 100000 cho khóa học trả phí, 0 cho khóa học miễn phí)"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
          <Text style={styles.hint}>Để giá = 0 nếu khóa học miễn phí. Học viên sẽ phải thanh toán nếu giá {'>'} 0</Text>

          <Text style={styles.label}>Thumbnail</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={pickThumbnail}>
            <Text style={styles.uploadText}>
              {thumbnailLocal?.uri ? "Đã chọn ảnh từ máy" : "Chọn ảnh từ máy"}
            </Text>
          </TouchableOpacity>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Xuất bản</Text>
            <Switch value={isPublished} onValueChange={setIsPublished} />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>Tạo khóa học</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn]}
            onPress={() => navigation.navigate("CreateQuizLesson" as any)}
          >
            <Text style={styles.secondaryText}>+ Tạo bài học Quiz</Text>
          </TouchableOpacity>

          <Text style={styles.section}>Bài học ban đầu</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={[styles.smallBtn]} onPress={addVideoLesson}>
              <Text style={styles.smallBtnText}>+ Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn]}
              onPress={() => navigation.navigate("CreateQuizLesson" as any)}
            >
              <Text style={styles.smallBtnText}>+ Quiz</Text>
            </TouchableOpacity>
          </View>

          {lessons.map((l, idx) => (
            <View key={idx} style={styles.lessonCard}>
              <View style={styles.lessonHeaderRow}>
                <Text style={styles.smallLabel}>Bài học {idx + 1} ({l.kind})</Text>
                <TouchableOpacity style={styles.deleteChip} onPress={() => removeLesson(idx)}>
                  <Text style={styles.deleteChipText}>Xóa</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Tiêu đề bài học"
                value={l.title}
                onChangeText={(t) => updateLesson(idx, { title: t })}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mô tả"
                value={l.description}
                onChangeText={(t) => updateLesson(idx, { description: t })}
                multiline
              />
              <Text style={styles.smallLabel}>Thứ tự</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={l.order}
                onChangeText={(t) => updateLesson(idx, { order: t })}
              />

              {l.kind === "video" ? (
                <>
                  <Text style={styles.smallLabel}>Video bài học</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={() => pickVideoForLesson(idx)}>
                    <Text style={styles.uploadText}>
                      {l.videoUrl ? "Đã tải video" : "Chọn video và tải lên"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View>
                  <Text style={styles.smallLabel}>Câu hỏi</Text>
                  {(l.questions || []).map((q: any, qi: number) => (
                    <View key={qi} style={styles.qRow}>
                      <TextInput
                        style={styles.input}
                        placeholder={`Câu hỏi ${qi + 1}`}
                        value={q.text}
                        onChangeText={(t) => updateQuizQuestion(idx, qi, { text: t })}
                      />
                      <Text style={styles.smallLabel}>Lựa chọn</Text>
                      {(q.options || []).map((op: string, oi: number) => (
                        <TextInput
                          key={oi}
                          style={styles.input}
                          placeholder={`Lựa chọn ${oi + 1}`}
                          value={op}
                          onChangeText={(t) => {
                            const opts = [...(q.options || [])];
                            opts[oi] = t;
                            updateQuizQuestion(idx, qi, { options: opts });
                          }}
                        />
                      ))}
                      <TouchableOpacity style={styles.smallBtn} onPress={() => addQuizOption(idx, qi)}>
                        <Text style={styles.smallBtnText}>+ Lựa chọn</Text>
                      </TouchableOpacity>
                      <Text style={styles.smallLabel}>Đáp án đúng (chỉ số)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0,1,2..."
                        keyboardType="numeric"
                        value={String(q.correctIndex)}
                        onChangeText={(t) =>
                          updateQuizQuestion(idx, qi, { correctIndex: Math.max(0, parseInt(t) || 0) })
                        }
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={styles.smallBtn} onPress={() => addQuizQuestionRow(idx)}>
                    <Text style={styles.smallBtnText}>+ Câu hỏi</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  scroll: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    paddingLeft: 14,
    paddingTop: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  dropdown: {
    height: 46,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  section: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  smallBtn: {
    backgroundColor: "#eee",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  smallBtnText: { color: "#333", fontWeight: "700" },
  lessonCard: {
    backgroundColor: "#fafafa",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  smallLabel: { fontSize: 12, color: "#666", marginTop: 6, marginBottom: 6 },
  qRow: { marginTop: 6, marginBottom: 6 },
  lessonHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deleteChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ff4d4f",
    borderRadius: 14,
  },
  deleteChipText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  submitBtn: {
    marginTop: 16,
    backgroundColor: "#20B2AA",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryBtn: {
    marginTop: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: "#333",
    fontWeight: "700",
  },
  uploadBox: {
    backgroundColor: "#f2f2f2",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  uploadText: { color: "#333", fontWeight: "600" },
  hint: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
    fontStyle: "italic",
  },
});

export default CreateCourseScreen;


