import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";

type RouteParams = {
  roomUrl: string;
  title?: string;
};

const FALLBACK_URL = "https://example.daily.co/demo-room";

const VideoCallScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as RouteParams;
  const roomUrl = params.roomUrl || FALLBACK_URL;

  if (!roomUrl) {
    Alert.alert(
      "Thiếu đường dẫn phòng",
      "Vui lòng cấu hình đường dẫn Daily room hợp lệ."
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.title || "Video Call"}
        </Text>
        <View style={{ width: 80 }} />
      </View>
      <WebView
        source={{ uri: roomUrl }}
        style={styles.webview}
        startInLoadingState
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />
      <View style={styles.overlay}>
        <View style={styles.calleeCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(params.title || "K").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.calleeName}>
              {params.title || "Đang kết nối"}
            </Text>
            <Text style={styles.calleeHint}>Đang thiết lập video call...</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.endButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="call-end" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  webview: { flex: 1 },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 30,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calleeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 18,
    padding: 12,
    flex: 1,
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  calleeName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  calleeHint: { color: "#dfe7ea", fontSize: 12, marginTop: 2 },
  endButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ff4d4f",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});

export default VideoCallScreen;

