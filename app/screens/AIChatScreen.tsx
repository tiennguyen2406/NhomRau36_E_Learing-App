import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { chatWithAI, getUserByUsername, getUserCourses, getLessonsByCourse } from "../api/api";
import { useThemeColors } from "../../hooks/use-theme-colors";

// Lấy BASE_URL từ api.ts
const BASE_URL = "https://three6learningbackend.onrender.com";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type MyCourse = {
  id: string;
  title: string;
  description?: string;
};

type Lesson = {
  id: string;
  title: string;
  videoUrl?: string;
  kind?: string;
  description?: string;
};

const AIChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Xin chào! Tôi là trợ lý AI của 36Learning. Tôi có thể giúp bạn tìm hiểu về các khóa học, danh mục, và thông tin khác trong nền tảng. Bạn muốn biết gì?",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<MyCourse | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const listRef = useRef<FlatList>(null);
  const colors = useThemeColors();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: colors.containerBackground },
        header: { backgroundColor: colors.headerBackground, borderBottomColor: colors.borderColor },
        headerTitle: { color: colors.primaryText },
        headerActionButton: { backgroundColor: colors.searchBackground },
        aiBubble: { backgroundColor: colors.cardBackground, borderColor: colors.borderColor },
        aiText: { color: colors.primaryText },
        aiTimestamp: { color: colors.secondaryText },
        loadingText: { color: colors.secondaryText },
        inputContainer: { backgroundColor: colors.headerBackground, borderTopColor: colors.borderColor },
        input: { backgroundColor: colors.searchBackground, color: colors.primaryText },
        selectedCourseBadge: { backgroundColor: colors.cardBackground },
        selectedCourseText: { color: colors.primaryText },
        selectedLessonBadge: { backgroundColor: colors.headerBackground },
        selectedLessonText: { color: colors.primaryText },
        modalContent: { backgroundColor: colors.cardBackground },
        modalTitle: { color: colors.primaryText },
        courseItemTitle: { color: colors.primaryText },
        courseItemDesc: { color: colors.secondaryText },
        courseItemDivider: { backgroundColor: colors.borderColor },
        lessonItemTitle: { color: colors.primaryText },
        lessonItemDesc: { color: colors.secondaryText },
      }),
    [colors]
  );

  useEffect(() => {
    // Cuộn xuống cuối khi có tin nhắn mới
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

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
        setCurrentUserId(String(uid));
        const courses = await getUserCourses(String(uid));
        if (mounted && Array.isArray(courses)) {
          setMyCourses(
            courses.map((course: any) => ({
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

const sendMessage = async () => {
  const text = input.trim();
  if (!text || loading) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: text,
    timestamp: new Date(),
  };

  const updatedMessages = [...messages, userMessage];
  setMessages(updatedMessages);
  setInput("");
  setLoading(true);

  try {
    const conversationHistory = updatedMessages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await chatWithAI(text, conversationHistory, {
      selectedCourseId: selectedCourse?.id,
      currentUserId,
    });

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response.response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
  } catch (error: any) {
    console.error("Error sending message:", error);
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: error?.error || "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setLoading(false);
  }
};

const handleSuggestQuestions = async () => {
  if (loading) return;
  const baseText = input.trim() || selectedCourse?.title;
  if (!baseText) {
    Alert.alert(
      "Thiếu nội dung",
      "Vui lòng nhập câu hỏi hoặc chọn khóa học để gợi ý câu hỏi mẫu."
    );
    return;
  }

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: `Hãy tạo bộ câu hỏi mẫu tương tự cho: ${baseText}`,
    timestamp: new Date(),
  };

  const updatedMessages = [...messages, userMessage];
  setMessages(updatedMessages);
  setLoading(true);

  try {
    const conversationHistory = updatedMessages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await chatWithAI(baseText, conversationHistory, {
      selectedCourseId: selectedCourse?.id,
      currentUserId,
      requestSimilarQuestions: true,
      numSimilarQuestions: 5,
    });

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response.response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
  } catch (error: any) {
    console.error("Error requesting sample questions:", error);
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: error?.error || "Xin lỗi, không thể tạo câu hỏi mẫu lúc này.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setLoading(false);
  }
};

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
          description: lesson.description,
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

const handleSelectCourse = (course: MyCourse) => {
  setSelectedCourse(course);
  setCourseModalVisible(false);
  // Load lessons của khóa học được chọn
  loadLessons(course.id);
};

const handleSummarizeVideo = async () => {
  if (!selectedLesson || !selectedLesson.videoUrl) {
    Alert.alert("Lỗi", "Vui lòng chọn bài học video trước");
    return;
  }

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: `Tóm tắt nội dung video: ${selectedLesson.title}`,
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setSummarizing(true);

  try {
    // Gọi API để tóm tắt video từ URL
    const response = await fetch(`${BASE_URL}/video-summary/url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoUrl: selectedLesson.videoUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.details || "Không thể tóm tắt video");
    }

    const result = await response.json();
    
    const summaryMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `📹 TÓM TẮT VIDEO: "${selectedLesson.title}"\n\n${result.summary}\n\n💡 Bạn có thể hỏi tôi thêm về nội dung này nếu cần làm rõ!`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, summaryMessage]);
  } catch (error: any) {
    console.error("Error summarizing video:", error);
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: error?.message || "Xin lỗi, không thể tóm tắt video này. Vui lòng thử lại sau.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setSummarizing(false);
  }
};

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
            !isUser && dynamicStyles.aiBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText,
              !isUser && dynamicStyles.aiText,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.aiTimestamp,
              !isUser && dynamicStyles.aiTimestamp,
            ]}
          >
            {item.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="psychology" size={24} color="#20B2AA" />
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>AI Trợ Lý</Text>
        </View>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate("VideoSummary")}
          style={[styles.headerActionButton, dynamicStyles.headerActionButton]}
        >
          <MaterialIcons name="video-library" size={22} color="#20B2AA" />
        </TouchableOpacity>
      </View>

      {selectedCourse ? (
        <View style={styles.selectedBadgeContainer}>
          <View style={[styles.selectedCourseBadge, dynamicStyles.selectedCourseBadge]}>
            <MaterialIcons name="bookmark" size={18} color="#20B2AA" />
            <Text style={[styles.selectedCourseText, dynamicStyles.selectedCourseText]} numberOfLines={1}>
              Đang tập trung: {selectedCourse.title}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedCourse(null);
                setSelectedLesson(null);
                setLessons([]);
              }}
              style={styles.clearCourseBtn}
            >
              <MaterialIcons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          {selectedLesson ? (
            <View style={[styles.selectedLessonBadge, dynamicStyles.selectedLessonBadge]}>
              <MaterialIcons name="video-library" size={16} color="#ffa940" />
              <Text style={[styles.selectedLessonText, dynamicStyles.selectedLessonText]} numberOfLines={1}>
                Bài học: {selectedLesson.title}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedLesson(null)}
                style={styles.clearLessonBtn}
              >
                <MaterialIcons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {(loading || summarizing) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#20B2AA" />
          <Text style={[styles.loadingText, dynamicStyles.loadingText]}>
            {summarizing ? "Đang tóm tắt video..." : "AI đang suy nghĩ..."}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            placeholder="Nhập câu hỏi của bạn..."
            placeholderTextColor={colors.placeholderText}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!loading && !summarizing}
          />
          {/* Chỉ hiển thị nút chọn khóa học khi chưa chọn khóa học */}
          {!selectedCourse && (
            <TouchableOpacity
              style={[
                styles.selectorButton,
                (coursesLoading || !myCourses.length) && styles.selectorButtonDisabled,
              ]}
              onPress={() => setCourseModalVisible(true)}
              disabled={coursesLoading || !myCourses.length}
            >
              <MaterialIcons
                name="school"
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          )}
          {/* Chỉ hiển thị nút chọn bài học khi đã chọn khóa học nhưng chưa chọn bài học */}
          {selectedCourse && !selectedLesson && lessons.length > 0 && (
            <TouchableOpacity
              style={[
                styles.videoButton,
                lessonsLoading && styles.videoButtonDisabled,
              ]}
              onPress={() => setLessonModalVisible(true)}
              disabled={lessonsLoading}
            >
              <MaterialIcons
                name="video-library"
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          )}
          {/* Hiển thị nút tóm tắt khi đã chọn bài học */}
          {selectedLesson && (
            <TouchableOpacity
              style={[
                styles.summarizeButton,
                summarizing && styles.summarizeButtonDisabled,
              ]}
              onPress={handleSummarizeVideo}
              disabled={summarizing}
            >
              {summarizing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="summarize" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.quickActionButton,
              (loading || summarizing) && styles.quickActionButtonDisabled,
            ]}
            onPress={handleSuggestQuestions}
            disabled={loading || summarizing}
          >
            <MaterialIcons name="lightbulb" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading || summarizing) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading || summarizing}
          >
            <MaterialIcons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={courseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCourseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Chọn khóa học của tôi</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            {coursesLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color="#20B2AA" />
                <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Đang tải danh sách...</Text>
              </View>
            ) : myCourses.length ? (
              <FlatList
                data={myCourses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.courseItem}
                    onPress={() => handleSelectCourse(item)}
                  >
                    <Text style={[styles.courseItemTitle, dynamicStyles.courseItemTitle]}>{item.title}</Text>
                    {item.description ? (
                      <Text style={[styles.courseItemDesc, dynamicStyles.courseItemDesc]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={[styles.courseItemDivider, dynamicStyles.courseItemDivider]} />
                )}
              />
            ) : (
              <View style={styles.modalLoading}>
                <MaterialIcons name="info" size={20} color="#999" />
                <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Bạn chưa tham gia khóa học nào.</Text>
              </View>
            )}
            {selectedCourse ? (
              <TouchableOpacity
                style={styles.clearSelectionBtn}
                onPress={() => {
                  setSelectedCourse(null);
                  setSelectedLesson(null);
                  setLessons([]);
                  setCourseModalVisible(false);
                }}
              >
                <MaterialIcons name="highlight-off" size={18} color="#fff" />
                <Text style={styles.clearSelectionText}>Bỏ chọn khóa học</Text>
              </TouchableOpacity>
            ) : null}
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
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                {selectedCourse ? `Bài học: ${selectedCourse.title}` : "Chọn Bài Học"}
              </Text>
              <TouchableOpacity onPress={() => setLessonModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            {lessonsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color="#20B2AA" />
                <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Đang tải danh sách bài học...</Text>
              </View>
            ) : lessons.length > 0 ? (
              <FlatList
                data={lessons}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.lessonItem}
                    onPress={() => {
                      setSelectedLesson(item);
                      setLessonModalVisible(false);
                    }}
                  >
                    <MaterialIcons name="play-circle-outline" size={20} color="#20B2AA" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.lessonItemTitle, dynamicStyles.lessonItemTitle]}>{item.title}</Text>
                      {item.description ? (
                        <Text style={[styles.lessonItemDesc, dynamicStyles.lessonItemDesc]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#999" />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={[styles.courseItemDivider, dynamicStyles.courseItemDivider]} />
                )}
              />
            ) : (
              <View style={styles.modalLoading}>
                <MaterialIcons name="info" size={20} color="#999" />
                <Text style={styles.loadingText}>
                  Khóa học này không có bài học video nào.
                </Text>
              </View>
            )}
            {selectedLesson ? (
              <TouchableOpacity
                style={styles.clearSelectionBtn}
                onPress={() => {
                  setSelectedLesson(null);
                  setLessonModalVisible(false);
                }}
              >
                <MaterialIcons name="highlight-off" size={18} color="#fff" />
                <Text style={styles.clearSelectionText}>Bỏ chọn bài học</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginVertical: 6,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  aiMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: "#20B2AA",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
  },
  aiText: {},
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: "#f0f0f0",
  },
  aiTimestamp: {},
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#20B2AA",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  selectorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#20B2AA",
    alignItems: "center",
    justifyContent: "center",
  },
  selectorButtonDisabled: {
    opacity: 0.4,
  },
  quickActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffa940",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionButtonDisabled: {
    opacity: 0.4,
  },
  videoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#9c27b0",
    alignItems: "center",
    justifyContent: "center",
  },
  videoButtonDisabled: {
    opacity: 0.4,
  },
  summarizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#722ed1",
    alignItems: "center",
    justifyContent: "center",
  },
  summarizeButtonDisabled: {
    opacity: 0.4,
  },
  selectedBadgeContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    gap: 6,
  },
  selectedCourseBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedCourseText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  clearCourseBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ff7875",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedLessonBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedLessonText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  clearLessonBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ff9800",
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  courseItem: {
    paddingVertical: 12,
  },
  courseItemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  courseItemDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  courseItemDivider: {
    height: 1,
  },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  lessonItemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  lessonItemDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  clearSelectionBtn: {
    marginTop: 16,
    backgroundColor: "#20B2AA",
    borderRadius: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  clearSelectionText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default AIChatScreen;

