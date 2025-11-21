import React, { useEffect, useMemo, useState } from "react";
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
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import {
  createLesson,
  getLessonCountByCourse,
  uploadProofFile,
} from "../api/api";
import { useThemeColors } from "../../hooks/use-theme-colors";
import { ThemedText } from "../../components/themed-text";

type RouteParams = {
  courseId: string;
  title?: string;
};

const CreateVideoLessonScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId, title } = (route.params || {}) as RouteParams;
  const colors = useThemeColors();

  const [lessonTitle, setLessonTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLocal, setVideoLocal] = useState<{ uri: string; type?: string; name?: string } | null>(null);
  const [duration, setDuration] = useState("");
  const [order, setOrder] = useState("1");
  const [loading, setLoading] = useState(false);

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: colors.containerBackground },
        header: { backgroundColor: colors.headerBackground, borderBottomColor: colors.borderColor },
        headerTitle: { color: colors.primaryText },
        label: { color: colors.secondaryText },
        input: {
          borderColor: colors.borderColor,
          backgroundColor: colors.cardBackground,
          color: colors.primaryText,
        },
        uploadBtn: { borderColor: colors.borderColor, backgroundColor: colors.searchBackground },
        uploadText: { color: colors.primaryText },
        fileName: { color: colors.secondaryText },
        submitBtn: { backgroundColor: colors.tint || "#20B2AA" },
      }),
    [colors]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!courseId) return;
        const count = await getLessonCountByCourse(courseId);
        if (!mounted) return;
        if (typeof count === "number" && count >= 0) {
          setOrder(String(count + 1));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  const handleSubmit = async () => {
    if (!lessonTitle.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề video.");
      return;
    }
    if (!courseId) {
      Alert.alert("Lỗi", "Không xác định được khóa học.");
      return;
    }
    if (!videoLocal && !videoUrl.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn hoặc nhập đường dẫn video.");
      return;
    }

    const payload = {
      courseId,
      title: lessonTitle.trim(),
      description: description.trim(),
      kind: "video",
      videoUrl: videoUrl.trim(),
      duration: duration.trim(),
      order: Number(order) || 1,
    };

    try {
      setLoading(true);
      let finalVideoUrl = payload.videoUrl;
      if (videoLocal?.uri) {
        finalVideoUrl = await uploadProofFile({
          uri: videoLocal.uri,
          name: videoLocal.name || `video_${Date.now()}.mp4`,
          type: videoLocal.type || "video/mp4",
        });
      }
      payload.videoUrl = finalVideoUrl;
      await createLesson(payload);
      Alert.alert("Thành công", "Đã tạo bài học video mới.", [
        {
          text: "Xem danh sách",
          onPress: () =>
            (navigation as any).navigate("CourseLessons", {
              courseId,
              title,
            }),
        },
      ]);
      setLessonTitle("");
      setDescription("");
      setVideoUrl("");
      setVideoLocal(null);
      setDuration("");
      setOrder((prev) => String((Number(prev) || 1) + 1));
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể tạo bài học video.");
    } finally {
      setLoading(false);
    }
  };

  const pickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Quyền truy cập", "Vui lòng cấp quyền truy cập thư viện để chọn video.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setVideoLocal({
        uri: asset.uri,
        type: asset.type || asset.mimeType || "video/mp4",
        name: asset.fileName || `video_${Date.now()}.mp4`,
      });
      setVideoUrl(asset.uri);
    } catch (error) {
      console.error("Chọn video thất bại:", error);
      Alert.alert("Lỗi", "Không thể chọn video. Vui lòng thử lại.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]} numberOfLines={1}>
          Tạo video mới
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, dynamicStyles.label]}>Tiêu đề video</ThemedText>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            placeholder="Ví dụ: Giới thiệu khóa học"
            placeholderTextColor={colors.placeholderText}
            value={lessonTitle}
            onChangeText={setLessonTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, dynamicStyles.label]}>Mô tả</ThemedText>
          <TextInput
            style={[styles.input, styles.multiline, dynamicStyles.input]}
            placeholder="Nội dung chính của video..."
            placeholderTextColor={colors.placeholderText}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.rowItem]}>
            <ThemedText style={[styles.label, dynamicStyles.label]}>Thời lượng (phút)</ThemedText>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="10"
              placeholderTextColor={colors.placeholderText}
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
            />
          </View>
          <View style={[styles.inputGroup, styles.rowItem]}>
            <ThemedText style={[styles.label, dynamicStyles.label]}>Thứ tự</ThemedText>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="1"
              placeholderTextColor={colors.placeholderText}
              keyboardType="numeric"
              value={order}
              onChangeText={setOrder}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, dynamicStyles.label]}>Video bài học</ThemedText>
          <TouchableOpacity style={[styles.uploadBtn, dynamicStyles.uploadBtn]} onPress={pickVideo}>
            <MaterialIcons name="video-library" size={20} color="#20B2AA" />
            <ThemedText style={[styles.uploadText, dynamicStyles.uploadText]}>
              {videoLocal ? "Đã chọn video" : "Chọn video từ thiết bị"}
            </ThemedText>
          </TouchableOpacity>
          {videoLocal ? (
            <ThemedText style={[styles.fileName, dynamicStyles.fileName]} numberOfLines={2}>
              {videoLocal.name || videoLocal.uri}
            </ThemedText>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, dynamicStyles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? "Đang tạo..." : "TẠO VIDEO"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  uploadText: {
    fontWeight: "600",
  },
  fileName: {
    marginTop: 8,
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default CreateVideoLessonScreen;

