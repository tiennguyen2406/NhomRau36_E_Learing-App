import React, { useMemo, useRef, useState, useEffect } from "react";
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
  Alert,
  Linking,
  Image,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { database } from "../firebase";
import {
  ref,
  onValue,
  off,
  push,
  set,
  update,
  DataSnapshot,
  serverTimestamp,
} from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserByUsername } from "../api/api";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { uploadProofFile } from "../api/api";
import { addNotification } from "../utils/notifications";
import { Video, ResizeMode } from "expo-av";
import { RootStackNavProps } from "../navigation/AppNavigator";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useThemeColors } from "../../hooks/use-theme-colors";

const JITSI_ROOM_URL =
  "https://8x8.vc/vpaas-magic-cookie-29d1be449b2f4aaf91fe689e3687c128/meeting1";

type AttachmentDraft = {
  uri: string;
  name?: string;
  type?: string;
  size?: number | null;
};

type Msg = {
  id: string;
  fromMe?: boolean;
  text: string;
  time: string;
  timestamp?: number;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number | null;
};

const DAILY_ROOM_URL = "https://your-daily-room.daily.co/demo";

const ChatScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavProps>();
  const route = useRoute<any>();
  const colors = useThemeColors();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const listRef = useRef<FlatList>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Bạn");

  const chatId = route?.params?.chatId;
  const name = route?.params?.name || "Inbox";
  const otherUserId = route?.params?.otherUserId;
  const passedCurrentUserId = route?.params?.currentUserId;

  // Load current user
  useEffect(() => {
    (async () => {
      try {
        // Ưu tiên dùng currentUserId từ params (nếu có)
        if (passedCurrentUserId) {
          setCurrentUserId(String(passedCurrentUserId));
          return;
        }
        
        const username = await AsyncStorage.getItem("currentUsername");
        if (username) {
          const user = await getUserByUsername(username);
          if (user?.uid || user?.id) {
            setCurrentUserId(String(user.uid || user.id));
            setCurrentUserName(
              user.fullName || user.username || "Bạn"
            );
          }
        }
      } catch (e) {
        console.error("Error loading current user:", e);
      }
    })();
  }, [passedCurrentUserId]);

  // Load messages from Firebase
  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const messagesRef = ref(database, `messages/${chatId}`);
    
    const unsubscribe = onValue(messagesRef, (snapshot: DataSnapshot) => {
      try {
        const messagesData = snapshot.val();
        if (!messagesData) {
          setMessages([]);
          return;
        }

        const messagesList: Msg[] = [];
        for (const [messageId, message] of Object.entries(messagesData as any)) {
          const msg = message as any;
          const isFromMe = msg.senderId === currentUserId;
          
          const rawTimestamp = msg.timestamp ?? msg.clientTimestamp ?? 0;
          const timestamp = typeof rawTimestamp === "number" ? rawTimestamp : Number(rawTimestamp) || 0;
          const date = new Date(timestamp);
          const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

          messagesList.push({
            id: messageId,
            fromMe: isFromMe,
            text: msg.text || "",
            time,
            timestamp,
            attachmentUrl: msg.attachmentUrl || "",
            attachmentName: msg.attachmentName || "",
            attachmentType: msg.attachmentType || "",
            attachmentSize: typeof msg.attachmentSize === "number" ? msg.attachmentSize : null,
          });
        }

        // Sắp xếp tăng dần để tin nhắn cũ ở trên, mới ở dưới
        messagesList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(messagesList);
        
        // Cuộn xuống cuối danh sách để hiển thị tin nhắn mới nhất bên dưới
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
      } catch (e) {
        console.error("Error processing messages:", e);
      }
    });

    return () => {
      off(messagesRef);
    };
  }, [chatId, currentUserId]);

  useEffect(() => {
    if (!chatId || !currentUserId || !database) return;
    const unreadRef = ref(database, `conversations/${chatId}/unreadBy/${currentUserId}`);
    set(unreadRef, false).catch((err) =>
      console.error("Failed to clear unread state:", err)
    );
  }, [chatId, currentUserId]);

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const fileSize = typeof asset.size === "number" ? asset.size : null;
      if (fileSize && fileSize > 10 * 1024 * 1024) {
        Alert.alert("Tệp quá lớn", "Vui lòng chọn tệp nhỏ hơn 10MB.");
        return;
      }

      setAttachment({
        uri: asset.uri,
        name: asset.name || "attachment",
        type: asset.mimeType || "application/octet-stream",
        size: fileSize,
      });
    } catch (error) {
      console.error("Attachment pick error:", error);
      Alert.alert("Lỗi", "Không thể chọn tệp đính kèm.");
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const captureImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Quyền camera bị từ chối", "Vui lòng cấp quyền sử dụng camera để chụp ảnh.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const fileSize = typeof asset.fileSize === "number" ? asset.fileSize : null;
      if (fileSize && fileSize > 10 * 1024 * 1024) {
        Alert.alert("Ảnh quá lớn", "Vui lòng chụp ảnh nhỏ hơn 10MB.");
        return;
      }

      setAttachment({
        uri: asset.uri,
        name: asset.fileName || "photo.jpg",
        type: asset.type || "image/jpeg",
        size: fileSize,
      });
    } catch (error) {
      console.error("Capture image error:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh.");
    }
  };

  const formatFileSize = (size?: number | null) => {
    if (!size || Number.isNaN(size)) return "";
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${size} B`;
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !attachment) return;
    if (!chatId || !currentUserId) return;
    if (sending) return;

    try {
      setSending(true);
      console.log("Sending message", { chatId, currentUserId, otherUserId, text });
      const messagesRef = ref(database, `messages/${chatId}`);
      const newMessageRef = push(messagesRef);

      let uploadedAttachment: { url: string; name?: string; type?: string; size?: number | null } | null = null;
      if (attachment) {
        uploadedAttachment = {
          url: await uploadProofFile({
            uri: attachment.uri,
            name: attachment.name,
            type: attachment.type,
          }),
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
        };
      }
      
      const clientTimestamp = Date.now();
      await set(newMessageRef, {
        senderId: String(currentUserId),
        text,
        timestamp: serverTimestamp(),
        clientTimestamp,
        attachmentUrl: uploadedAttachment?.url || "",
        attachmentName: uploadedAttachment?.name || "",
        attachmentType: uploadedAttachment?.type || "",
        attachmentSize: uploadedAttachment?.size ?? null,
      });

      // Cập nhật lastMessage trong conversation
      const conversationUpdates: any = {};
      const lastMessageLabel =
        text || (uploadedAttachment ? `Đã gửi tệp ${uploadedAttachment.name || ""}`.trim() : "");
      conversationUpdates[`conversations/${chatId}/lastMessage`] = lastMessageLabel || "";
      conversationUpdates[`conversations/${chatId}/lastMessageTime`] = clientTimestamp;
      
      // Đảm bảo participants được set
      if (otherUserId) {
        conversationUpdates[`conversations/${chatId}/participants`] = [
          String(currentUserId),
          String(otherUserId),
        ];
        conversationUpdates[`conversations/${chatId}/createdAt`] =
          conversationUpdates[`conversations/${chatId}/createdAt`] || clientTimestamp;
        conversationUpdates[`conversations/${chatId}/unreadBy/${otherUserId}`] = true;
      }
      conversationUpdates[`conversations/${chatId}/unreadBy/${currentUserId}`] = false;
      
      await update(ref(database), conversationUpdates);

      if (otherUserId && otherUserId !== currentUserId) {
        try {
          await addNotification(String(otherUserId), {
            title: `Tin nhắn mới từ ${name || "36Learning"}`,
            message:
              lastMessageLabel ||
              (uploadedAttachment ? "Đã gửi tệp đính kèm" : "Đã gửi tin nhắn mới"),
            type: "message",
            icon: "chat",
            data: {
              chatId,
              fromUserId: currentUserId,
            },
          });
        } catch (notifError) {
          console.error("Failed to push notification:", notifError);
        }
      }

      setInput("");
      setAttachment(null);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      console.error("Error sending message:", e);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  const closePreview = () => setPreview(null);

  const renderItem = ({ item }: { item: Msg }) => {
    const isImage = item.attachmentType?.startsWith("image/");
    const isVideo = item.attachmentType?.startsWith("video/");
    const hasAttachment = Boolean(item.attachmentUrl);

    const openAttachment = () => {
      if (!item.attachmentUrl) return;
      Linking.openURL(item.attachmentUrl).catch(() => Alert.alert("Lỗi", "Không thể mở tệp đính kèm."));
    };

    const hasMediaOnly = hasAttachment && !item.text && (isImage || isVideo);
    const renderAttachment = () => {
      if (!hasAttachment) return null;
      if (isImage) {
        return (
          <View style={styles.mediaAttachmentWrapper}>
            <TouchableOpacity
              onPress={() => setPreview({ url: item.attachmentUrl as string, type: "image" })}
              activeOpacity={0.9}
            >
              <Image source={{ uri: item.attachmentUrl }} style={styles.imageAttachment} resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => setPreview({ url: item.attachmentUrl as string, type: "image" })}
            >
              <MaterialIcons name="zoom-out-map" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      }
      if (isVideo) {
        return (
          <View style={styles.mediaAttachmentWrapper}>
            <Video
              source={{ uri: item.attachmentUrl || "" }}
              style={styles.videoAttachment}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
            />
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => setPreview({ url: item.attachmentUrl as string, type: "video" })}
            >
              <MaterialIcons name="zoom-out-map" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <TouchableOpacity
          style={[
            styles.attachmentBubble,
            item.fromMe ? styles.attachmentBubbleLight : styles.attachmentBubbleDark,
          ]}
          onPress={openAttachment}
        >
          <MaterialIcons
            name="attach-file"
            size={18}
            color={item.fromMe ? "#0f4b47" : "#fff"}
            style={{ marginRight: 6 }}
          />
          <View style={{ flexShrink: 1 }}>
            <ThemedText
              style={[
                styles.attachmentName,
                item.fromMe ? styles.attachmentTextDark : styles.attachmentTextLight,
              ]}
              numberOfLines={1}
            >
              {item.attachmentName || "Tệp đính kèm"}
            </ThemedText>
            {item.attachmentSize ? (
              <ThemedText
                style={[
                  styles.attachmentSize,
                  item.fromMe ? styles.attachmentTextDark : styles.attachmentTextLight,
                ]}
              >
                {formatFileSize(item.attachmentSize)}
              </ThemedText>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    };

    return (
    <View style={[styles.bubbleRow, item.fromMe ? styles.right : styles.left]}>
        <View
          style={[
            styles.bubble,
            hasMediaOnly ? styles.bubbleMediaOnly : item.fromMe ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          {renderAttachment()}
          {item.text ? (
            <ThemedText style={[styles.bubbleText, !item.fromMe ? styles.bubbleTextDark : null]}>
              {item.text}
            </ThemedText>
          ) : null}
          <ThemedText
            style={[
              hasMediaOnly ? styles.bubbleTimeMedia : styles.bubbleTime,
              !item.fromMe ? styles.bubbleTimeDark : null,
            ]}
          >
            {item.time}
          </ThemedText>
      </View>
    </View>
  );
  };

  const startVideoCall = () => {
    const baseUrl = JITSI_ROOM_URL; // không có # ở cuối
    const url = `${baseUrl}#userInfo.displayName="${encodeURIComponent(
      currentUserName || "User"
    )}"&config.prejoinPageEnabled=false&interfaceConfig.SHOW_PREJOIN_PAGE=false`;
    navigation.navigate("VideoCall", { roomUrl: url, title: name });
  };

  // Dynamic styles
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.containerBackground,
    },
    header: {
      backgroundColor: colors.headerBackground,
      borderBottomColor: colors.borderColor,
    },
    headerTitle: {
      color: colors.primaryText,
    },
    inputContainer: {
      backgroundColor: colors.headerBackground,
      borderTopColor: colors.borderColor,
    },
    input: {
      backgroundColor: colors.searchBackground,
      color: colors.primaryText,
    },
    attachmentPreview: {
      backgroundColor: colors.cardBackground,
      borderTopColor: colors.borderColor,
    },
    attachmentPreviewName: {
      color: colors.primaryText,
    },
    attachmentPreviewSize: {
      color: colors.secondaryText,
    },
  }), [colors]);

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>{name}</ThemedText>
        <TouchableOpacity onPress={startVideoCall} style={styles.videoCallBtn}>
          <MaterialIcons name="videocam" size={24} color="#20B2AA" />
        </TouchableOpacity>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      {attachment ? (
        <View style={styles.attachmentPreview}>
          <View style={styles.attachmentPreviewInfo}>
            <MaterialIcons
              name={attachment.type?.startsWith("image/") ? "image" : "insert-drive-file"}
              size={20}
              color="#20B2AA"
              style={{ marginRight: 8 }}
            />
            <View style={{ flexShrink: 1 }}>
              <ThemedText style={[styles.attachmentPreviewName, dynamicStyles.attachmentPreviewName]} numberOfLines={1}>
                {attachment.name || "Tệp đính kèm"}
              </ThemedText>
              <ThemedText style={[styles.attachmentPreviewSize, dynamicStyles.attachmentPreviewSize]}>{formatFileSize(attachment.size)}</ThemedText>
            </View>
          </View>
          <TouchableOpacity onPress={removeAttachment} style={styles.removeAttachmentBtn}>
            <MaterialIcons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.inputRow, dynamicStyles.inputContainer]}>
          <TextInput
            style={[styles.input, dynamicStyles.input]}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.placeholderText}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={styles.cameraBtn} onPress={captureImage}>
            <MaterialIcons name="photo-camera" size={20} color="#20B2AA" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={pickAttachment}>
            <MaterialIcons name="attach-file" size={20} color="#20B2AA" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendBtn, sending ? styles.sendBtnDisabled : null]}
            onPress={send}
            disabled={sending}
          >
            <MaterialIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={closePreview}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={closePreview}>
            <MaterialIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {preview?.type === "video" ? (
            <Video
              source={{ uri: preview.url }}
              style={styles.previewVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          ) : preview ? (
            <Image source={{ uri: preview.url }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  videoCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#20B2AA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fffc",
  },
  listContent: { flexGrow: 1, justifyContent: "flex-end", padding: 12, paddingBottom: 10 },
  bubbleRow: { flexDirection: "row", marginVertical: 6 },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { backgroundColor: "#20B2AA" },
  bubbleOther: { backgroundColor: "#e9eef3" },
  bubbleMediaOnly: { backgroundColor: "transparent", padding: 0, borderRadius: 0 },
  bubbleText: { color: "#fff", fontSize: 14 },
  bubbleTextDark: { color: "#243238" },
  bubbleTime: { color: "#f0f0f0", fontSize: 10, alignSelf: "flex-end", marginTop: 4 },
  bubbleTimeDark: { color: "#6f7b87" },
  bubbleTimeMedia: { color: "#6f7b87", fontSize: 10, alignSelf: "flex-end", marginTop: 6 },
  attachmentBubble: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    padding: 8,
    borderRadius: 8,
  },
  attachmentBubbleLight: { backgroundColor: "#d1f5f1" },
  attachmentBubbleDark: { backgroundColor: "#3a4a5b" },
  attachmentName: { fontWeight: "600", fontSize: 13 },
  attachmentSize: { fontSize: 11, opacity: 0.85 },
  attachmentTextLight: { color: "#fff" },
  attachmentTextDark: { color: "#164743" },
  mediaAttachmentWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
    backgroundColor: "transparent",
  },
  imageAttachment: { width: 240, height: 240 },
  videoAttachment: { width: 260, height: 180, backgroundColor: "#000" },
  zoomButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 10,
    marginBottom: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentPreviewInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  attachmentPreviewName: { fontWeight: "600", marginBottom: 2 },
  attachmentPreviewSize: { fontSize: 12 },
  removeAttachmentBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ff7875",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#20B2AA",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    backgroundColor: "#f5fffd",
  },
  cameraBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#20B2AA",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    backgroundColor: "#f5fffd",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 110,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#20B2AA",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCloseBtn: {
    position: "absolute",
    top: 40,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  previewImage: { width: "90%", height: "70%" },
  previewVideo: { width: "90%", height: "70%" },
});

export default ChatScreen;


