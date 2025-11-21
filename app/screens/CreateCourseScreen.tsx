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
import { createProofCourse, getCategories, uploadProofFile, getUserByUsername, getCourseById, updateCourse } from "../api/api";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackNavProps, RootStackParamList } from "../navigation/AppNavigator";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "../../components/themed-text";
import { useThemeColors } from "../../hooks/use-theme-colors";

type CreateCourseRouteProp = RouteProp<RootStackParamList, 'CreateCourse'>;

const CreateCourseScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavProps>();
  const route = useRoute<CreateCourseRouteProp>();
  const colors = useThemeColors();
  const { courseId, mode } = (route.params as any) || {};
  
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
  const [editMode, setEditMode] = useState<boolean>(false);
  const [lessonUploadProgress, setLessonUploadProgress] = useState<Record<number, number>>({});

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: colors.containerBackground },
        header: { backgroundColor: colors.headerBackground },
        headerTitle: { color: colors.primaryText },
        card: { backgroundColor: colors.cardBackground },
        label: { color: colors.secondaryText },
        input: {
          backgroundColor: colors.searchBackground,
          color: colors.primaryText,
          borderColor: colors.borderColor,
        },
        dropdown: {
          backgroundColor: colors.searchBackground,
          borderColor: colors.borderColor,
        },
        section: { color: colors.primaryText },
        smallBtn: { backgroundColor: colors.headerBackground },
        smallBtnText: { color: colors.primaryText },
        lessonCard: { backgroundColor: colors.cardBackground },
        smallLabel: { color: colors.secondaryText },
        uploadBox: {
          backgroundColor: colors.searchBackground,
          borderColor: colors.borderColor,
        },
        uploadText: { color: colors.primaryText },
        hint: { color: colors.secondaryText },
        secondaryBtn: { backgroundColor: colors.headerBackground },
        secondaryText: { color: colors.primaryText },
        progressPercent: { color: colors.secondaryText },
      }),
    [colors]
  );

  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories();
        setCategories(Array.isArray(cats) ? cats : []);
      } catch {}
    })();
  }, []);

  // Load course data nếu ở chế độ edit
  useEffect(() => {
    if (courseId && mode === 'edit') {
      (async () => {
        try {
          setLoading(true);
          const course = await getCourseById(courseId);
          console.log('Loaded course for edit:', course);
          
          setTitle(course.title || "");
          setDescription(course.description || "");
          setCategoryId(course.category || null);
          setPrice(String(course.price || 0));
          setThumbnailUrl(course.imageUrl || course.thumbnailUrl || "");
          setIsPublished(course.isPublished || false);
          setEditMode(true);
          
          Alert.alert('Chế độ chỉnh sửa', 'Đang tải thông tin khóa học...');
        } catch (error: any) {
          console.error('Load course error:', error);
          Alert.alert('Lỗi', 'Không thể tải thông tin khóa học');
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [courseId, mode]);

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
      thumbnailUrl: thumbnailUrl.trim(),
    };
    
    // Chỉ thêm lessons nếu không phải edit mode
    if (!editMode && lessons.length) {
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

      if (editMode && courseId) {
        // Chế độ chỉnh sửa
        await updateCourse(courseId, payload);
        Alert.alert("Thành công", "Đã cập nhật khóa học.", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        // Chế độ tạo mới
        payload.isPublished = false;
        
        // Lấy uid hiện tại
        const username = await AsyncStorage.getItem("currentUsername");
        let uid: string | null = null;
        if (username) {
          payload.instructor = username;
          try {
            const user = await getUserByUsername(username);
            uid = user?.uid || user?.id || null;
            if (uid) {
              payload.instructorId = uid;
            }
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
      }
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || `Không thể ${editMode ? 'cập nhật' : 'tạo'} khóa học.`);
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
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!rs.canceled && rs.assets?.length) {
      const a = rs.assets[0];
      setThumbnailLocal({ uri: a.uri, type: a.mimeType || "image/jpeg", name: a.fileName || "thumbnail.jpg" });
      setThumbnailUrl(a.uri);
    }
  };

  const pickVideoForLesson = async (index: number) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Quyền truy cập", "Cần cấp quyền truy cập thư viện để chọn video.");
        return;
      }
      const rs = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
        allowsEditing: false,
      });
      if (!rs.canceled && rs.assets?.length) {
        const a = rs.assets[0];
        try {
          setLessonUploadProgress((prev) => ({ ...prev, [index]: 0 }));
          const url = await uploadProofFile(
            { uri: a.uri, name: a.fileName || `video_${Date.now()}.mp4`, type: a.mimeType || "video/mp4" },
            (progress) => {
              setLessonUploadProgress((prev) => ({ ...prev, [index]: progress }));
            }
          );
          updateLesson(index, { videoUrl: url });
          setTimeout(() => {
            setLessonUploadProgress((prev) => {
              const copy = { ...prev };
              delete copy[index];
              return copy;
            });
          }, 800);
        } catch (e: any) {
          setLessonUploadProgress((prev) => {
            const copy = { ...prev };
            delete copy[index];
            return copy;
          });
          Alert.alert("Lỗi", e?.message || "Tải video thất bại.");
        }
      }
    } catch (error: any) {
      console.error("Error picking video:", error);
      Alert.alert("Lỗi", error?.message || "Không thể chọn video. Vui lòng thử lại.");
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
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>
          {editMode ? "Chỉnh sửa khóa học" : "Tạo khóa học"}
        </ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={[styles.card, dynamicStyles.card]}>
          <ThemedText style={[styles.label, dynamicStyles.label]}>Tiêu đề</ThemedText>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            placeholder="Nhập tiêu đề khóa học"
            placeholderTextColor={colors.placeholderText}
            value={title}
            onChangeText={setTitle}
          />

          <ThemedText style={[styles.label, dynamicStyles.label]}>Mô tả</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, dynamicStyles.input]}
            placeholder="Nhập mô tả"
            placeholderTextColor={colors.placeholderText}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <ThemedText style={[styles.label, dynamicStyles.label]}>Danh mục</ThemedText>
          <Dropdown
            style={[styles.dropdown, dynamicStyles.dropdown]}
            data={categoryOptions}
            labelField="label"
            valueField="value"
            placeholder="Chọn danh mục"
            value={categoryId}
            onChange={(it: any) => setCategoryId(it.value)}
          />

          <ThemedText style={[styles.label, dynamicStyles.label]}>Giá khóa học (VND)</ThemedText>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            placeholder="Nhập giá (VD: 100000 cho khóa học trả phí, 0 cho khóa học miễn phí)"
            placeholderTextColor={colors.placeholderText}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
          <ThemedText style={[styles.hint, dynamicStyles.hint]}>Để giá = 0 nếu khóa học miễn phí. Học viên sẽ phải thanh toán nếu giá {'>'} 0</ThemedText>

          <ThemedText style={[styles.label, dynamicStyles.label]}>Thumbnail</ThemedText>
          <TouchableOpacity style={[styles.uploadBox, dynamicStyles.uploadBox]} onPress={pickThumbnail}>
            <ThemedText style={[styles.uploadText, dynamicStyles.uploadText]}>
              {thumbnailLocal?.uri ? "Đã chọn ảnh từ máy" : "Chọn ảnh từ máy"}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.rowBetween}>
            <ThemedText style={[styles.label, dynamicStyles.label]}>Xuất bản</ThemedText>
            <Switch value={isPublished} onValueChange={setIsPublished} />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>{loading ? 'Đang xử lý...' : (editMode ? 'Cập nhật khóa học' : 'Tạo khóa học')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, dynamicStyles.secondaryBtn]}
            onPress={() => navigation.navigate("CreateQuizLesson" as any)}
          >
            <ThemedText style={[styles.secondaryText, dynamicStyles.secondaryText]}>+ Tạo bài học Quiz</ThemedText>
          </TouchableOpacity>

          <ThemedText style={[styles.section, dynamicStyles.section]}>Bài học ban đầu</ThemedText>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={[styles.smallBtn, dynamicStyles.smallBtn]} onPress={addVideoLesson}>
              <ThemedText style={[styles.smallBtnText, dynamicStyles.smallBtnText]}>+ Video</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, dynamicStyles.smallBtn]}
              onPress={() => navigation.navigate("CreateQuizLesson" as any)}
            >
              <ThemedText style={[styles.smallBtnText, dynamicStyles.smallBtnText]}>+ Quiz</ThemedText>
            </TouchableOpacity>
          </View>

          {lessons.map((l, idx) => (
            <View key={idx} style={[styles.lessonCard, dynamicStyles.lessonCard]}>
              <View style={styles.lessonHeaderRow}>
                <ThemedText style={[styles.smallLabel, dynamicStyles.smallLabel]}>Bài học {idx + 1} ({l.kind})</ThemedText>
                <TouchableOpacity style={styles.deleteChip} onPress={() => removeLesson(idx)}>
                  <Text style={styles.deleteChipText}>Xóa</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="Tiêu đề bài học"
                placeholderTextColor={colors.placeholderText}
                value={l.title}
                onChangeText={(t) => updateLesson(idx, { title: t })}
              />
              <TextInput
                style={[styles.input, styles.textArea, dynamicStyles.input]}
                placeholder="Mô tả"
                placeholderTextColor={colors.placeholderText}
                value={l.description}
                onChangeText={(t) => updateLesson(idx, { description: t })}
                multiline
              />
              <ThemedText style={[styles.smallLabel, dynamicStyles.smallLabel]}>Thứ tự</ThemedText>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="0"
                placeholderTextColor={colors.placeholderText}
                keyboardType="numeric"
                value={l.order}
                onChangeText={(t) => updateLesson(idx, { order: t })}
              />

              {l.kind === "video" ? (
                <>
                  <ThemedText style={[styles.smallLabel, dynamicStyles.smallLabel]}>Video bài học</ThemedText>
                  <TouchableOpacity style={[styles.uploadBox, dynamicStyles.uploadBox]} onPress={() => pickVideoForLesson(idx)}>
                    <ThemedText style={[styles.uploadText, dynamicStyles.uploadText]}>
                      {l.videoUrl ? "Đã tải video" : "Chọn video và tải lên"}
                    </ThemedText>
                  </TouchableOpacity>
                  {typeof lessonUploadProgress[idx] === "number" ? (
                    <View style={styles.progressWrapper}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(lessonUploadProgress[idx], 1) * 100}%` },
                          ]}
                        />
                      </View>
                      <ThemedText style={[styles.progressPercent, dynamicStyles.progressPercent]}>
                        {Math.round(Math.min(lessonUploadProgress[idx], 1) * 100)}%
                      </ThemedText>
                    </View>
                  ) : null}
                </>
              ) : (
                <View>
                  <ThemedText style={[styles.smallLabel, dynamicStyles.smallLabel]}>Câu hỏi</ThemedText>
                  {(l.questions || []).map((q: any, qi: number) => (
                    <View key={qi} style={styles.qRow}>
                      <TextInput
                        style={[styles.input, dynamicStyles.input]}
                        placeholder={`Câu hỏi ${qi + 1}`}
                        placeholderTextColor={colors.placeholderText}
                        value={q.text}
                        onChangeText={(t) => updateQuizQuestion(idx, qi, { text: t })}
                      />
                      <ThemedText style={[styles.smallLabel, dynamicStyles.smallLabel]}>Lựa chọn</ThemedText>
                      {(q.options || []).map((op: string, oi: number) => (
                        <TextInput
                          key={oi}
                          style={[styles.input, dynamicStyles.input]}
                          placeholder={`Lựa chọn ${oi + 1}`}
                          placeholderTextColor={colors.placeholderText}
                          value={op}
                          onChangeText={(t) => {
                            const opts = [...(q.options || [])];
                            opts[oi] = t;
                            updateQuizQuestion(idx, qi, { options: opts });
                          }}
                        />
                      ))}
                      <TouchableOpacity style={[styles.smallBtn, dynamicStyles.smallBtn]} onPress={() => addQuizOption(idx, qi)}>
                        <ThemedText style={[styles.smallBtnText, dynamicStyles.smallBtnText]}>+ Lựa chọn</ThemedText>
                      </TouchableOpacity>
                      <ThemedText style={[styles.smallLabel, dynamicStyles.smallLabel]}>Đáp án đúng (chỉ số)</ThemedText>
                      <TextInput
                        style={[styles.input, dynamicStyles.input]}
                        placeholder="0,1,2..."
                        placeholderTextColor={colors.placeholderText}
                        keyboardType="numeric"
                        value={String(q.correctIndex)}
                        onChangeText={(t) =>
                          updateQuizQuestion(idx, qi, { correctIndex: Math.max(0, parseInt(t) || 0) })
                        }
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={[styles.smallBtn, dynamicStyles.smallBtn]} onPress={() => addQuizQuestionRow(idx)}>
                    <ThemedText style={[styles.smallBtnText, dynamicStyles.smallBtnText]}>+ Câu hỏi</ThemedText>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
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
  progressWrapper: {
    marginTop: 10,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e6e6e6",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#20B2AA",
  },
  progressPercent: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#4a5568",
    textAlign: "right",
  },
});

export default CreateCourseScreen;


