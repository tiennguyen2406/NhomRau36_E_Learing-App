import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "../firebase";
import { DataSnapshot, off, onValue, ref } from "firebase/database";
import { getUserByUsername, getUserById, getUsers } from "../api/api";
import { markNotificationAsRead } from "../utils/notifications";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useThemeColors } from "../../hooks/use-theme-colors";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  icon?: string;
  type?: string;
  status?: "read" | "unread";
  timestamp?: number;
  data?: Record<string, any> | null;
  senderId?: string;
  senderName?: string;
  senderImage?: string;
};

type RawNotificationData = {
  title?: string;
  message?: string;
  icon?: string;
  type?: string;
  status?: "read" | "unread";
  timestamp?: number | string;
  data?: Record<string, any> | null;
};

type SectionData = {
  title: string;
  data: NotificationItem[];
};

const isSameDay = (dateA: Date, dateB: Date) =>
  dateA.getFullYear() === dateB.getFullYear() &&
  dateA.getMonth() === dateB.getMonth() &&
  dateA.getDate() === dateB.getDate();

const formatSectionTitle = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [username, allUsers] = await Promise.all([
          AsyncStorage.getItem("currentUsername"),
          getUsers().catch(() => []),
        ]);
        if (!mounted) return;
        
        if (username) {
          const user = await getUserByUsername(username);
          if (user?.uid || user?.id) {
            setCurrentUserId(String(user.uid || user.id));
          }
        }
        
        const usersList = Array.isArray(allUsers) ? allUsers : [];
        setUsers(usersList);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId || !database) return;
    const notifRef = ref(database, `notifications/${currentUserId}`);
    const unsubscribe = onValue(
      notifRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        if (!data) {
          setNotifications([]);
          setLoading(false);
          return;
        }
        const list: NotificationItem[] = Object.entries(data).map(
          ([id, value]) => {
            const notifData = value as RawNotificationData;
            const senderId = notifData.data?.fromUserId || notifData.data?.senderId;
            let senderName: string | undefined;
            let senderImage: string | undefined;
            
            // Tìm thông tin người gửi từ danh sách users
            if (senderId) {
              const sender = users.find((u) => (u.uid || u.id) === String(senderId));
              if (sender) {
                senderName = sender.fullName || sender.username;
                senderImage = sender.profileImage;
              }
            }
            
            return {
              id,
              title: notifData.title || "Thông báo",
              message: notifData.message || "",
              icon: notifData.icon || "notifications",
              type: notifData.type || "system",
              status: notifData.status || "unread",
              timestamp:
                typeof notifData.timestamp === "number"
                  ? notifData.timestamp
                  : Number(notifData.timestamp) || Date.now(),
              data: notifData.data || null,
              senderId: senderId ? String(senderId) : undefined,
              senderName,
              senderImage,
            };
          }
        );
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setNotifications(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading notifications:", error);
        setLoading(false);
      }
    );
    return () => {
      off(notifRef);
    };
  }, [currentUserId, users]);

  const sections = useMemo<SectionData[]>(() => {
    const groups: Record<string, NotificationItem[]> = {};
    notifications.forEach((notif) => {
      const date = new Date(notif.timestamp || Date.now());
      const key = formatSectionTitle(date);
      groups[key] = groups[key] ? [...groups[key], notif] : [notif];
    });
    return Object.entries(groups).map(([title, data]) => ({
      title,
      data,
    }));
  }, [notifications]);

  const handleNotificationPress = async (notif: NotificationItem) => {
    if (currentUserId && notif.status !== "read") {
      await markNotificationAsRead(currentUserId, notif.id);
    }
    if (notif.type === "message") {
      (navigation as any).navigate("MainTabs", {
        screen: "Inbox",
      });
      return;
    }
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
    sectionTitle: {
      color: colors.secondaryText,
    },
    card: {
      backgroundColor: colors.cardBackground,
    },
    cardTitle: {
      color: colors.primaryText,
    },
    cardMessage: {
      color: colors.secondaryText,
    },
    cardTime: {
      color: colors.placeholderText,
    },
    emptyTitle: {
      color: colors.primaryText,
    },
    emptySubtitle: {
      color: colors.secondaryText,
    },
    loadingContainer: {
      backgroundColor: colors.containerBackground,
    },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, dynamicStyles.loadingContainer]}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <ThemedText style={{ marginTop: 12, color: colors.secondaryText }}>Đang tải thông báo...</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>Notifications</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <ThemedText style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>{section.title}</ThemedText>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              dynamicStyles.card,
              item.status !== "read" ? styles.cardUnread : undefined,
            ]}
            activeOpacity={0.9}
            onPress={() => handleNotificationPress(item)}
          >
            {item.senderImage ? (
              <Image source={{ uri: item.senderImage }} style={styles.avatar} />
            ) : item.senderName ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.iconWrapper}>
                <MaterialIcons
                  name={(item.icon as any) || "notifications"}
                  size={20}
                  color="#20B2AA"
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.cardTitle, dynamicStyles.cardTitle]}>{item.title}</ThemedText>
              <ThemedText style={[styles.cardMessage, dynamicStyles.cardMessage]} numberOfLines={2}>
                {item.message}
              </ThemedText>
              <ThemedText style={[styles.cardTime, dynamicStyles.cardTime]}>
                {new Date(item.timestamp || Date.now()).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </ThemedText>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-off" size={40} color={colors.placeholderText} />
            <ThemedText style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>Chưa có thông báo nào</ThemedText>
            <ThemedText style={[styles.emptySubtitle, dynamicStyles.emptySubtitle]}>
              Khi có tin nhắn mới hoặc thông báo từ admin, chúng sẽ hiển thị ở đây.
            </ThemedText>
          </View>
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardUnread: {
    borderColor: "#20B2AA",
    borderWidth: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f0fffc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#20B2AA",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardMessage: { fontSize: 13, marginTop: 4 },
  cardTime: { fontSize: 11, marginTop: 8 },
  emptyState: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 30,
  },
  emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: "700" },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default NotificationsScreen;

