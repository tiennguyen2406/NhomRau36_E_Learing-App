import React, { useMemo, useState, useEffect, useCallback } from "react";
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert, Modal } from "react-native";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { InboxStackParamList, RootStackNavProps } from "../navigation/AppNavigator";
import { database } from "../firebase";
import { ref, onValue, off, push, set, update, query, orderByChild, equalTo, get, DataSnapshot } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserByUsername, getUsers } from "../api/api";
import { MaterialIcons } from "@expo/vector-icons";

type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
  otherUserId?: string;
};

const InboxScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavProps>();
  const route = useRoute<any>();
  const [tab, setTab] = useState<"chat" | "calls">("chat");
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [creatingConversation, setCreatingConversation] = useState(false);

  // Load current user và users song song
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Load song song current user và danh sách users
        const [username, allUsers] = await Promise.all([
          AsyncStorage.getItem("currentUsername"),
          getUsers().catch(() => []),
        ]);

        if (!isMounted) return;

        // Set users ngay lập tức
        const usersList = Array.isArray(allUsers) ? allUsers : [];
        setUsers(usersList);
        
        // Hiển thị 5 người ngẫu nhiên ban đầu
        const shuffled = [...usersList].sort(() => Math.random() - 0.5);
        setFilteredUsers(shuffled.slice(0, 5));

        // Load current user
        if (username) {
          try {
            const user = await getUserByUsername(username);
            if (isMounted && (user?.uid || user?.id)) {
              setCurrentUserId(String(user.uid || user.id));
            }
          } catch (e) {
            console.error("Error loading current user:", e);
          }
        }
      } catch (e) {
        console.error("Error loading data:", e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter users khi search
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      // Nếu không có search query, hiển thị 5 người ngẫu nhiên
      const shuffled = [...users].sort(() => Math.random() - 0.5);
      setFilteredUsers(shuffled.slice(0, 5));
    } else {
      // Tìm kiếm theo tên hoặc username
      const query = userSearchQuery.toLowerCase().trim();
      const filtered = users.filter((u) => {
        const fullName = (u.fullName || "").toLowerCase();
        const username = (u.username || "").toLowerCase();
        return fullName.includes(query) || username.includes(query);
      });
      setFilteredUsers(filtered);
    }
  }, [userSearchQuery, users]);

  // Load conversations from Firebase
  useEffect(() => {
    // Kiểm tra Firebase đã được cài đặt chưa
    if (!database) {
      setLoading(false);
      // Không hiển thị alert ngay, chỉ log
      console.warn("Firebase chưa được cài đặt");
      return;
    }

    if (!currentUserId) {
      // Nếu không có currentUserId sau một thời gian ngắn, dừng loading
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 2000); // Giảm từ 3s xuống 2s
      return () => clearTimeout(timeout);
    }

    let isMounted = true;
    const conversationsRef = ref(database, "conversations");
    
    // Timeout ngắn hơn để tránh loading vô hạn
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setChats([]);
        console.warn("Firebase connection timeout - có thể Firebase chưa được cài đặt");
      }
    }, 5000); // Giảm từ 10s xuống 5s
    
    const unsubscribe = onValue(
      conversationsRef,
      async (snapshot: DataSnapshot) => {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        
        try {
          const conversationsData = snapshot.val();
          if (!conversationsData) {
            setChats([]);
            setLoading(false);
            return;
          }

          const conversationsList: ChatItem[] = [];
          
          for (const [conversationId, conversation] of Object.entries(conversationsData as any)) {
            const conv = conversation as any;
            const participants = conv.participants || [];
            
            // Chỉ lấy conversations mà current user tham gia
            if (participants.includes(currentUserId)) {
              const otherUserId = participants.find((p: string) => p !== currentUserId);
              if (!otherUserId) continue;

              // Tìm tên người dùng
              const otherUser = users.find((u) => (u.uid || u.id) === otherUserId);
              const name = otherUser?.fullName || otherUser?.username || "Unknown User";

              // Format thời gian
              const lastMessageTime = conv.lastMessageTime || 0;
              const date = new Date(lastMessageTime);
              const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
              const unread = !!(conv.unreadBy && currentUserId && conv.unreadBy[currentUserId]);

              conversationsList.push({
                id: conversationId,
                name,
                lastMessage: conv.lastMessage || "",
                time,
                otherUserId,
                unread,
              });
            }
          }

          // Sắp xếp theo thời gian tin nhắn cuối (mới nhất trước)
          conversationsList.sort((a, b) => {
            const convA = conversationsData[a.id] as any;
            const convB = conversationsData[b.id] as any;
            return (convB?.lastMessageTime || 0) - (convA?.lastMessageTime || 0);
          });

          setChats(conversationsList);
        } catch (e) {
          console.error("Error processing conversations:", e);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      },
      (error: any) => {
        // Xử lý lỗi kết nối Firebase
        console.error("Firebase error:", error);
        console.error("Error code:", error?.code);
        console.error("Error message:", error?.message);
        clearTimeout(timeoutId);
        if (isMounted) {
          setChats([]);
          setLoading(false);
          
          // Hiển thị thông báo nếu là lỗi permission
          if (error?.code === "PERMISSION_DENIED") {
            console.warn("Firebase Permission Denied - Cần kiểm tra Firebase Rules");
          }
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      off(conversationsRef);
    };
  }, [currentUserId, users]);

  const data = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? chats.filter((c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)) : chats;
  }, [search, chats]);

  const openChat = (item: ChatItem) => {
    // Navigate to Chat within Inbox stack
    // @ts-ignore route typing simplify
    navigation.navigate("Chat" as any, { chatId: item.id, name: item.name, otherUserId: item.otherUserId });
  };

  useEffect(() => {
    const pending = route.params?.initialChat;
    if (
      pending &&
      pending.chatId &&
      pending.otherUserId &&
      currentUserId &&
      !creatingConversation
    ) {
      navigation.navigate("Chat" as any, {
        chatId: pending.chatId,
        name: pending.name || "Chat",
        otherUserId: pending.otherUserId,
        currentUserId,
      });
      navigation.setParams?.({ initialChat: undefined });
    }
  }, [route.params?.initialChat, currentUserId, creatingConversation, navigation]);


  const createNewChat = () => {
    if (!currentUserId) {
      Alert.alert("Lỗi", "Không xác định được người dùng");
      return;
    }

    // Mở modal chọn user
    setShowUserPicker(true);
    setUserSearchQuery("");
  };

  const selectUser = async (selectedUser: any) => {
    if (!currentUserId) {
      Alert.alert("Lỗi", "Không xác định được người dùng hiện tại");
      return;
    }

    if (!database) {
      Alert.alert("Lỗi", "Firebase chưa được cài đặt. Vui lòng chạy: npm install firebase");
      return;
    }

    const otherUserId = selectedUser.uid || selectedUser.id;
    if (!otherUserId) {
      Alert.alert("Lỗi", "Không xác định được người dùng được chọn");
      return;
    }

    if (otherUserId === currentUserId) {
      Alert.alert("Thông báo", "Bạn không thể trò chuyện với chính mình");
      return;
    }

    const name = selectedUser?.fullName || selectedUser?.username || "Unknown User";
    
    // Tạo conversation ID dựa trên userIds để đảm bảo unique và dễ tìm
    // Sắp xếp userIds để đảm bảo cùng một conversation cho 2 users
    const sortedIds = [currentUserId, otherUserId].sort();
    const conversationId = `${sortedIds[0]}_${sortedIds[1]}`;
    
    // Đóng modal và chuyển đến Chat ngay lập tức
    setShowUserPicker(false);
    setCreatingConversation(false);
    
    // Navigate ngay lập tức, không chờ tạo conversation
    navigation.navigate("Chat" as any, { 
      chatId: conversationId, 
      name,
      otherUserId,
      currentUserId // Truyền currentUserId để ChatScreen có thể tạo conversation
    });

    // Tạo conversation trong background (không await)
    createConversationInBackground(conversationId, currentUserId, otherUserId);
  };

  // Hàm tạo conversation trong background (nhanh, không chờ)
  const createConversationInBackground = (
    conversationId: string,
    currentUserId: string,
    otherUserId: string
  ) => {
    if (!database) return;

    const conversationRef = ref(database, `conversations/${conversationId}`);
    const now = Date.now();
    const currentIdStr = String(currentUserId);
    const otherIdStr = String(otherUserId);

    update(conversationRef, {
      participants: [currentIdStr, otherIdStr],
      lastMessage: "",
      lastMessageTime: now,
      createdAt: now,
      unreadBy: {
        [currentIdStr]: false,
        [otherIdStr]: false,
      },
    }).catch((error: any) => {
      console.error("Error creating conversation in background:", error);
    });
  };

  const renderItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={[styles.row, item.unread ? styles.rowUnread : undefined]}
      onPress={async () => {
        if (database && currentUserId) {
          try {
            await set(
              ref(database, `conversations/${item.id}/unreadBy/${currentUserId}`),
              false
            );
          } catch (err) {
            console.warn("Failed to mark conversation read:", err);
          }
        }
        openChat(item);
      }}
    >
      <View style={styles.avatar} />
      <View style={styles.rowCenter}>
        <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
        <Text numberOfLines={1} style={styles.preview}>{item.lastMessage}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.time}>{item.time}</Text>
        {item.unread ? <View style={styles.unreadDot} /> : null}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tin nhắn</Text>
        </View>
        <TouchableOpacity onPress={createNewChat} style={styles.newChatButton}>
          <Text style={styles.newChatButtonText}>+ Mới</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === "chat" && styles.tabActive]} onPress={() => setTab("chat")}>
          <Text style={[styles.tabText, tab === "chat" && styles.tabTextActive]}>Các cuộc hội thoại</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === "calls" && styles.tabActive]} onPress={() => setTab("calls")}>
          <Text style={[styles.tabText, tab === "calls" && styles.tabTextActive]}>Các cuộc gọi</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchBox}>
        <TextInput
          placeholder="Tìm kiếm..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có cuộc hội thoại nào</Text>
            <Text style={styles.emptySubtext}>Nhấn nút "+ Mới" để bắt đầu trò chuyện</Text>
          </View>
        )}
      />

      {/* Modal chọn user */}
      <Modal
        visible={showUserPicker}
        transparent
        animationType="fade"
        onRequestClose={() => !creatingConversation && setShowUserPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentTop}>
            {/* Header cố định */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn người dùng</Text>
              <TouchableOpacity 
                onPress={() => !creatingConversation && setShowUserPicker(false)}
                disabled={creatingConversation}
              >
                <MaterialIcons name="close" size={24} color={creatingConversation ? "#ccc" : "#333"} />
              </TouchableOpacity>
            </View>
            
            {/* Search input cố định */}
            <View style={styles.modalSearchContainer}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Tìm kiếm theo tên hoặc username..."
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
                editable={!creatingConversation}
              />
            </View>

            {/* Loading overlay khi đang tạo conversation */}
            {creatingConversation && (
              <View style={styles.creatingOverlay}>
                <ActivityIndicator size="large" color="#20B2AA" />
                <Text style={styles.creatingText}>Đang tạo cuộc hội thoại...</Text>
              </View>
            )}

            {/* Danh sách user có thể scroll */}
            <FlatList
              data={filteredUsers.filter((u) => (u.uid || u.id) !== currentUserId)}
              keyExtractor={(item) => String(item.uid || item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.userItem, creatingConversation && styles.userItemDisabled]}
                  onPress={() => !creatingConversation && selectUser(item)}
                  disabled={creatingConversation}
                >
                  <View style={styles.userItemContent}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(item.fullName || item.username || "U").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.fullName || item.username || "Unknown User"}</Text>
                      {item.username && item.fullName ? (
                        <Text style={styles.userUsername}>@{item.username}</Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.userSeparator} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyUserList}>
                  <Text style={styles.emptyUserText}>Không tìm thấy người dùng</Text>
                </View>
              )}
              scrollEnabled={!creatingConversation}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  header: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 10 
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#333", marginLeft: 8 },
  newChatButton: {
    backgroundColor: "#20B2AA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newChatButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  tabs: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 8 },
  tabBtn: { flex: 1, backgroundColor: "#e9eef3", borderRadius: 16, paddingVertical: 10, alignItems: "center", marginRight: 8 },
  tabActive: { backgroundColor: "#20B2AA" },
  tabText: { fontWeight: "700", color: "#333" },
  tabTextActive: { color: "#fff" },
  searchBox: { paddingHorizontal: 20, marginBottom: 8 },
  searchInput: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#e6e6e6" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 12 },
  rowUnread: { backgroundColor: "#f6fffb" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ccc", marginRight: 12 },
  rowCenter: { flex: 1 },
  name: { fontWeight: "700", color: "#222" },
  preview: { color: "#666", marginTop: 2 },
  rowRight: { alignItems: "center", flexDirection: "row", gap: 6 },
  time: { color: "#999", fontSize: 12 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ff4d4f",
  },
  sep: { height: 1, backgroundColor: "#f0f0f0" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    paddingTop: 50,
  },
  modalContentTop: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalSearchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalSearchInput: {
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  userItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  userUsername: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  userSeparator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 82,
  },
  emptyUserList: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyUserText: {
    color: "#666",
    fontSize: 14,
  },
  creatingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  creatingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  userItemDisabled: {
    opacity: 0.5,
  },
});

export default InboxScreen;


