import React, { useEffect, useState } from "react";
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

type RouteParams = {
  courseId: string;
  title?: string;
};

const CreateVideoLessonScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId, title } = (route.params || {}) as RouteParams;

  const [lessonTitle, setLessonTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLocal, setVideoLocal] = useState<{ uri: string; type?: string; name?: string } | null>(null);
  const [duration, setDuration] = useState("");
  const [order, setOrder] = useState("1");
  const [loading, setLoading] = useState(false);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Tạo video mới
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tiêu đề video</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Giới thiệu khóa học"
            value={lessonTitle}
            onChangeText={setLessonTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Nội dung chính của video..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.rowItem]}>
            <Text style={styles.label}>Thời lượng (phút)</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
            />
          </View>
          <View style={[styles.inputGroup, styles.rowItem]}>
            <Text style={styles.label}>Thứ tự</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              keyboardType="numeric"
              value={order}
              onChangeText={setOrder}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Video bài học</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickVideo}>
            <MaterialIcons name="video-library" size={20} color="#20B2AA" />
            <Text style={styles.uploadText}>
              {videoLocal ? "Đã chọn video" : "Chọn video từ thiết bị"}
            </Text>
          </TouchableOpacity>
          {videoLocal ? (
            <Text style={styles.fileName} numberOfLines={2}>
              {videoLocal.name || videoLocal.uri}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
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
  container: { flex: 1, backgroundColor: "#f7f9fc" },
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: "#5f6b6d",
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#dde4e6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#333",
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
    backgroundColor: "#20B2AA",
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

