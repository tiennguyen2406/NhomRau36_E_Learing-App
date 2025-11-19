import { database } from "../firebase";
import { push, ref, update } from "firebase/database";

export type NotificationPayload = {
  title: string;
  message: string;
  type?: "message" | "admin" | "system";
  icon?: string;
  actionUrl?: string;
  data?: Record<string, any>;
};

export const addNotification = async (
  userId: string | null | undefined,
  payload: NotificationPayload
) => {
  if (!userId) {
    console.warn("addNotification: missing userId");
    return;
  }
  if (!database) {
    console.warn("addNotification: Firebase database chưa sẵn sàng");
    return;
  }

  const notifRef = ref(database, `notifications/${userId}`);
  await push(notifRef, {
    ...payload,
    icon: payload.icon || "notifications",
    type: payload.type || "system",
    status: "unread",
    timestamp: Date.now(),
  });
};

export const markNotificationAsRead = async (
  userId: string,
  notificationId: string
) => {
  if (!database || !userId || !notificationId) return;
  try {
    await update(ref(database, `notifications/${userId}/${notificationId}`), {
      status: "read",
    });
  } catch (error) {
    console.error("Failed to update notification status:", error);
  }
};

