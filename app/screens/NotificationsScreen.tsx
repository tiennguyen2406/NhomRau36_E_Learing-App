import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "../firebase";
import { DataSnapshot, off, onValue, ref } from "firebase/database";
import { getUserByUsername } from "../api/api";
import { markNotificationAsRead } from "../utils/notifications";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  icon?: string;
  type?: string;
  status?: "read" | "unread";
  timestamp?: number;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const username = await AsyncStorage.getItem("currentUsername");
        if (!username || !mounted) return;
        const user = await getUserByUsername(username);
        if (user?.uid || user?.id) {
          setCurrentUserId(String(user.uid || user.id));
        }
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
          ([id, value]) => ({
            id,
            title: value.title || "Thông báo",
            message: value.message || "",
            icon: value.icon || "notifications",
            type: value.type || "system",
            status: value.status || "unread",
            timestamp:
              typeof value.timestamp === "number"
                ? value.timestamp
                : Number(value.timestamp) || Date.now(),
            data: value.data || null,
          })
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
  }, [currentUserId]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <Text style={{ marginTop: 12, color: "#666" }}>Đang tải thông báo...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              item.status !== "read" ? styles.cardUnread : undefined,
            ]}
            activeOpacity={0.9}
            onPress={() => handleNotificationPress(item)}
          >
            <View style={styles.iconWrapper}>
              <MaterialIcons
                name={(item.icon as any) || "notifications"}
                size={20}
                color="#20B2AA"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMessage} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={styles.cardTime}>
                {new Date(item.timestamp || Date.now()).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-off" size={40} color="#a0afb3" />
            <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
            <Text style={styles.emptySubtitle}>
              Khi có tin nhắn mới hoặc thông báo từ admin, chúng sẽ hiển thị ở đây.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e1e5ec",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1f2d3d" },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: "600",
    color: "#7a8ca3",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fff",
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
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1f2d3d" },
  cardMessage: { fontSize: 13, color: "#4a5568", marginTop: 4 },
  cardTime: { fontSize: 11, color: "#8a99a8", marginTop: 8 },
  emptyState: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 30,
  },
  emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: "700", color: "#4a5568" },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#7a8ca3",
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
    backgroundColor: "#f5f7fb",
  },
});

export default NotificationsScreen;

