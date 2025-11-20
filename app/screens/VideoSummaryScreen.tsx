import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { summarizeVideo, getUserByUsername, getUserCourses, getLessonsByCourse } from "../api/api";

// Lấy BASE_URL từ api.ts
const BASE_URL = "https://three6learningbackend.onrender.com";

type ProcessingStep = "idle" | "uploading" | "processing" | "analyzing" | "complete";

type Course = {
  id: string;
  title: string;
  description?: string;
};

type Lesson = {
  id: string;
  title: string;
  videoUrl?: string;
  kind?: string;
};

const VideoSummaryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("idle");
  
  // States cho chọn video từ khóa học
  const [sourceType, setSourceType] = useState<"upload" | "course">("upload");
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [lessonModalVisible, setLessonModalVisible] = useState(false);

  const pickVideo = async () => {
    try {
      // Yêu cầu quyền truy cập media library (iOS)
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Cần quyền truy cập",
            "Ứng dụng cần quyền truy cập thư viện để chọn video."
          );
          return;
        }
      }

      // Chọn video từ thư viện
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      // Kiểm tra kích thước file (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size && file.size > maxSize) {
        Alert.alert(
          "File quá lớn",
          `Kích thước file tối đa là 10MB. File của bạn: ${(file.size / 1024 / 1024).toFixed(2)}MB. Vui lòng chọn video ngắn hơn hoặc nén video.`
        );
        return;
      }

      setVideoName(file.name);
      await uploadAndSummarize(file);
    } catch (error: any) {
      console.error("Error picking video:", error);
      Alert.alert("Lỗi", "Không thể chọn video. Vui lòng thử lại.");
    }
  };

  const uploadAndSummarize = async (file: any) => {
    setLoading(true);
    setSummary(null);
    setUploadProgress(0);
    setCurrentStep("uploading");

    try {
      const result = await summarizeVideo(file, (progress) => {
        setUploadProgress(progress);
        if (progress < 1) {
          setCurrentStep("uploading");
        } else {
          setCurrentStep("processing");
        }
      });

      setCurrentStep("analyzing");
      // Simulate analyzing step
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSummary(result.summary);
      setCurrentStep("complete");
      Alert.alert("Thành công", "Đã tóm tắt video thành công!");
    } catch (error: any) {
      console.error("Error summarizing video:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      let errorMessage = "Không thể tóm tắt video. Vui lòng thử lại.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
        if (error?.details) {
          errorMessage += `\n\n${error.details}`;
        }
      }
      
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setCurrentStep("idle");
    }
  };

  // Load courses khi component mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setCoursesLoading(true);
        const username = await AsyncStorage.getItem("currentUsername");
        if (!username || !mounted) return;
        const user = await getUserByUsername(username);
        const uid = user?.uid || user?.id;
        if (!uid || !mounted) return;
        const userCourses = await getUserCourses(String(uid));
        if (mounted && Array.isArray(userCourses)) {
          setCourses(
            userCourses.map((course: any) => ({
              id: course.id || course._id,
              title: course.title,
              description: course.description,
            }))
          );
        }
      } catch (error) {
        console.error("Error loading user courses:", error);
      } finally {
        if (mounted) setCoursesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load lessons khi chọn course
  const loadLessons = async (courseId: string) => {
    try {
      setLessonsLoading(true);
      const lessonsData = await getLessonsByCourse(courseId);
      if (Array.isArray(lessonsData)) {
        // Chỉ lấy các lesson có video
        const videoLessons = lessonsData.filter(
          (lesson: any) => lesson.kind === "video" && lesson.videoUrl
        );
        setLessons(
          videoLessons.map((lesson: any) => ({
            id: lesson.id || lesson._id,
            title: lesson.title,
            videoUrl: lesson.videoUrl,
            kind: lesson.kind,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading lessons:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách bài học");
    } finally {
      setLessonsLoading(false);
    }
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCourseModalVisible(false);
    setLessonModalVisible(true);
    loadLessons(course.id);
  };

  const handleSelectLesson = async (lesson: Lesson) => {
    if (!lesson.videoUrl) {
      Alert.alert("Lỗi", "Bài học này không có video");
      return;
    }
    setSelectedLesson(lesson);
    setLessonModalVisible(false);
    setVideoName(lesson.title);
    await summarizeVideoFromUrl(lesson.videoUrl, lesson.title);
  };

  const summarizeVideoFromUrl = async (videoUrl: string, lessonTitle: string) => {
    setLoading(true);
    setSummary(null);
    setUploadProgress(0);
    setCurrentStep("processing");

    try {
      // Gửi videoUrl đến backend
      const response = await fetch(`${BASE_URL}/video-summary/url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || "Không thể tóm tắt video");
      }

      const result = await response.json();
      setCurrentStep("analyzing");
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSummary(result.summary);
      setCurrentStep("complete");
      Alert.alert("Thành công", "Đã tóm tắt video thành công!");
    } catch (error: any) {
      console.error("Error summarizing video from URL:", error);
      let errorMessage = "Không thể tóm tắt video. Vui lòng thử lại.";
      if (error?.message) {
        errorMessage = error.message;
      }
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setCurrentStep("idle");
    }
  };

  const clearSummary = () => {
    setSummary(null);
    setVideoName(null);
    setSelectedCourse(null);
    setSelectedLesson(null);
    setCurrentStep("idle");
  };

  const getStepInfo = () => {
    switch (currentStep) {
      case "uploading":
        return {
          icon: "cloud-upload",
          title: "Đang tải video lên server...",
          description: `${Math.round(uploadProgress * 100)}% hoàn thành`,
          color: "#20B2AA",
        };
      case "processing":
        return {
          icon: "sync",
          title: "Đang xử lý video...",
          description: "Video đang được upload lên Gemini AI",
          color: "#ffa940",
        };
      case "analyzing":
        return {
          icon: "psychology",
          title: "AI đang phân tích video...",
          description: "Đang tóm tắt nội dung, vui lòng đợi...",
          color: "#722ed1",
        };
      default:
        return {
          icon: "hourglass-empty",
          title: "Đang xử lý...",
          description: "Vui lòng đợi",
          color: "#20B2AA",
        };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="video-library" size={24} color="#20B2AA" />
          <Text style={styles.headerTitle}>Tóm Tắt Video</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={24} color="#20B2AA" />
          <Text style={styles.infoText}>
            Chọn video từ thiết bị hoặc từ khóa học đã đăng ký để AI tóm tắt nội dung chính bằng tiếng Việt.
            {"\n\n"}
            Hỗ trợ: MP4, MOV, AVI, WebM
            {"\n"}
            Kích thước tối đa: 10MB
          </Text>
        </View>

        {/* Source Type Selector */}
        <View style={styles.sourceTypeContainer}>
          <TouchableOpacity
            style={[
              styles.sourceTypeButton,
              sourceType === "upload" && styles.sourceTypeButtonActive,
            ]}
            onPress={() => {
              setSourceType("upload");
              clearSummary();
            }}
          >
            <MaterialIcons
              name="cloud-upload"
              size={20}
              color={sourceType === "upload" ? "#fff" : "#666"}
            />
            <Text
              style={[
                styles.sourceTypeText,
                sourceType === "upload" && styles.sourceTypeTextActive,
              ]}
            >
              Upload Video
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sourceTypeButton,
              sourceType === "course" && styles.sourceTypeButtonActive,
            ]}
            onPress={() => {
              setSourceType("course");
              clearSummary();
            }}
          >
            <MaterialIcons
              name="school"
              size={20}
              color={sourceType === "course" ? "#fff" : "#666"}
            />
            <Text
              style={[
                styles.sourceTypeText,
                sourceType === "course" && styles.sourceTypeTextActive,
              ]}
            >
              Từ Khóa Học
            </Text>
          </TouchableOpacity>
        </View>

        {videoName && !summary && (
          <View style={styles.videoInfoCard}>
            <MaterialIcons name="videocam" size={20} color="#666" />
            <Text style={styles.videoNameText} numberOfLines={2}>
              {videoName}
            </Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <View style={[styles.iconContainer, { backgroundColor: `${getStepInfo().color}15` }]}>
                <MaterialIcons 
                  name={getStepInfo().icon as any} 
                  size={48} 
                  color={getStepInfo().color}
                  style={styles.rotatingIcon}
                />
              </View>
              
              <Text style={[styles.loadingText, { color: getStepInfo().color }]}>
                {getStepInfo().title}
              </Text>
              
              <Text style={styles.loadingSubtext}>
                {getStepInfo().description}
              </Text>

              {/* Progress Bar */}
              {(currentStep === "uploading" && uploadProgress > 0) && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${uploadProgress * 100}%`, backgroundColor: getStepInfo().color }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(uploadProgress * 100)}%
                  </Text>
                </View>
              )}

              {/* Step Indicators */}
              <View style={styles.stepsContainer}>
                <View style={[styles.stepDot, currentStep === "uploading" && styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, currentStep === "processing" && styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, currentStep === "analyzing" && styles.stepDotActive]} />
              </View>

              <Text style={styles.loadingHint}>
                ⏱️ Quá trình này có thể mất 1-3 phút tùy vào độ dài video
              </Text>
            </View>
          </View>
        )}

        {summary && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <MaterialIcons name="description" size={24} color="#20B2AA" />
              <Text style={styles.summaryTitle}>Tóm Tắt Video</Text>
              <TouchableOpacity onPress={clearSummary} style={styles.clearButton}>
                <MaterialIcons name="refresh" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
          </View>
        )}

        {!loading && !summary && (
          <>
            {sourceType === "upload" ? (
              <TouchableOpacity
                style={styles.selectButton}
                onPress={pickVideo}
                disabled={loading}
              >
                <MaterialIcons name="video-library" size={24} color="#fff" />
                <Text style={styles.selectButtonText}>Chọn Video từ Thiết Bị</Text>
              </TouchableOpacity>
            ) : (
              <>
                {selectedCourse ? (
                  <View style={styles.selectedInfoCard}>
                    <View style={styles.selectedInfoRow}>
                      <MaterialIcons name="book" size={20} color="#20B2AA" />
                      <Text style={styles.selectedInfoText} numberOfLines={1}>
                        {selectedCourse.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCourse(null);
                          setSelectedLesson(null);
                          setLessons([]);
                        }}
                      >
                        <MaterialIcons name="close" size={18} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {selectedLesson ? (
                      <View style={styles.selectedInfoRow}>
                        <MaterialIcons name="play-circle-outline" size={20} color="#20B2AA" />
                        <Text style={styles.selectedInfoText} numberOfLines={1}>
                          {selectedLesson.title}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.selectButton}
                        onPress={() => setLessonModalVisible(true)}
                        disabled={lessonsLoading}
                      >
                        {lessonsLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons name="play-circle-outline" size={24} color="#fff" />
                            <Text style={styles.selectButtonText}>Chọn Bài Học Video</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setCourseModalVisible(true)}
                    disabled={coursesLoading || courses.length === 0}
                  >
                    {coursesLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="school" size={24} color="#fff" />
                        <Text style={styles.selectButtonText}>
                          {courses.length === 0
                            ? "Bạn chưa có khóa học nào"
                            : "Chọn Khóa Học"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        {/* Course Selection Modal */}
        <Modal
          visible={courseModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCourseModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn Khóa Học</Text>
                <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              {coursesLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color="#20B2AA" />
                  <Text style={styles.loadingText}>Đang tải danh sách...</Text>
                </View>
              ) : courses.length > 0 ? (
                <FlatList
                  data={courses}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => handleSelectCourse(item)}
                    >
                      <MaterialIcons name="book" size={20} color="#20B2AA" />
                      <Text style={styles.modalItemText}>{item.title}</Text>
                      <MaterialIcons name="chevron-right" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.modalItemDivider} />}
                />
              ) : (
                <View style={styles.modalLoading}>
                  <MaterialIcons name="info" size={24} color="#999" />
                  <Text style={styles.loadingText}>Bạn chưa đăng ký khóa học nào.</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Lesson Selection Modal */}
        <Modal
          visible={lessonModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLessonModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedCourse ? `Bài học: ${selectedCourse.title}` : "Chọn Bài Học"}
                </Text>
                <TouchableOpacity onPress={() => setLessonModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              {lessonsLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color="#20B2AA" />
                  <Text style={styles.loadingText}>Đang tải danh sách bài học...</Text>
                </View>
              ) : lessons.length > 0 ? (
                <FlatList
                  data={lessons}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => handleSelectLesson(item)}
                    >
                      <MaterialIcons name="play-circle-outline" size={20} color="#20B2AA" />
                      <Text style={styles.modalItemText}>{item.title}</Text>
                      <MaterialIcons name="chevron-right" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.modalItemDivider} />}
                />
              ) : (
                <View style={styles.modalLoading}>
                  <MaterialIcons name="info" size={24} color="#999" />
                  <Text style={styles.loadingText}>
                    Khóa học này không có bài học video nào.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#e6f7f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#116c67",
    lineHeight: 20,
  },
  videoInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  videoNameText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  rotatingIcon: {
    // Animation sẽ được thêm bằng Animated API nếu cần
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  progressBarContainer: {
    width: "100%",
    marginTop: 8,
    marginBottom: 16,
  },
  progressBarBackground: {
    width: "100%",
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontWeight: "600",
  },
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e0e0e0",
  },
  stepDotActive: {
    backgroundColor: "#20B2AA",
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 4,
  },
  loadingHint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  summaryContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  summaryTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },
  summaryContent: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#333",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#20B2AA",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    marginTop: 8,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  sourceTypeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  sourceTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    gap: 8,
  },
  sourceTypeButtonActive: {
    backgroundColor: "#20B2AA",
    borderColor: "#20B2AA",
  },
  sourceTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  sourceTypeTextActive: {
    color: "#fff",
  },
  selectedInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  selectedInfoText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  modalItemDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
});

export default VideoSummaryScreen;

