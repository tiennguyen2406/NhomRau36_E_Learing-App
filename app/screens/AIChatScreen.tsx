import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { chatWithAI, getUserByUsername, getUserCourses } from "../api/api";

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
  const listRef = useRef<FlatList>(null);

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

    // Thêm tin nhắn người dùng
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Lấy lịch sử hội thoại (chỉ lấy 10 tin nhắn gần nhất để tránh quá dài)
      const conversationHistory = messages
        .slice(-10)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Gọi API AI
      const response = await chatWithAI(text, conversationHistory, {
        selectedCourseId: selectedCourse?.id,
        currentUserId,
      });

      // Thêm phản hồi từ AI
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
        content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
            {item.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="psychology" size={24} color="#20B2AA" />
          <Text style={styles.headerTitle}>AI Trợ Lý</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {selectedCourse ? (
        <View style={styles.selectedCourseBadge}>
          <MaterialIcons name="bookmark" size={18} color="#20B2AA" />
          <Text style={styles.selectedCourseText} numberOfLines={1}>
            Đang tập trung: {selectedCourse.title}
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedCourse(null)}
            style={styles.clearCourseBtn}
          >
            <MaterialIcons name="close" size={14} color="#fff" />
          </TouchableOpacity>
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

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#20B2AA" />
          <Text style={styles.loadingText}>AI đang suy nghĩ...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập câu hỏi của bạn..."
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.selectorButton,
              (coursesLoading || (!myCourses.length && !selectedCourse)) && styles.selectorButtonDisabled,
            ]}
            onPress={() => setCourseModalVisible(true)}
            disabled={coursesLoading || (!myCourses.length && !selectedCourse)}
          >
            <MaterialIcons
              name={selectedCourse ? "bookmark" : "school"}
              size={22}
              color={selectedCourse ? "#fff" : "#20B2AA"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <MaterialIcons name="send" size={20} color="#fff" />
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn khóa học của tôi</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            {coursesLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color="#20B2AA" />
                <Text style={styles.loadingText}>Đang tải danh sách...</Text>
              </View>
            ) : myCourses.length ? (
              <FlatList
                data={myCourses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.courseItem}
                    onPress={() => {
                      setSelectedCourse(item);
                      setCourseModalVisible(false);
                    }}
                  >
                    <Text style={styles.courseItemTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.courseItemDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.courseItemDivider} />}
              />
            ) : (
              <View style={styles.modalLoading}>
                <MaterialIcons name="info" size={20} color="#999" />
                <Text style={styles.loadingText}>Bạn chưa tham gia khóa học nào.</Text>
              </View>
            )}
            {selectedCourse ? (
              <TouchableOpacity
                style={styles.clearSelectionBtn}
                onPress={() => {
                  setSelectedCourse(null);
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
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
  },
  aiText: {
    color: "#333",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: "#f0f0f0",
  },
  aiTimestamp: {
    color: "#666",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#666",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
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
    borderWidth: 1,
    borderColor: "#20B2AA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    backgroundColor: "#f5fffc",
  },
  selectorButtonDisabled: {
    opacity: 0.4,
  },
  selectedCourseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f7f5",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedCourseText: {
    flex: 1,
    color: "#116c67",
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#116c67",
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
    color: "#1f3c3c",
  },
  courseItemDesc: {
    fontSize: 13,
    color: "#546e7a",
    marginTop: 4,
  },
  courseItemDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
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

