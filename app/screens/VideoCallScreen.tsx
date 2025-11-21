import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "../../components/themed-text";
import { useThemeColors } from "../../hooks/use-theme-colors";

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
  const colors = useThemeColors();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: colors.containerBackground },
        header: { backgroundColor: colors.headerBackground },
        backText: { color: colors.primaryText },
        headerTitle: { color: colors.primaryText },
        calleeCard: { backgroundColor: colors.cardBackground },
        calleeName: { color: colors.primaryText },
        calleeHint: { color: colors.secondaryText },
      }),
    [colors]
  );

  if (!roomUrl) {
    Alert.alert(
      "Thiếu đường dẫn phòng",
      "Vui lòng cấu hình đường dẫn Daily room hợp lệ."
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
          <ThemedText style={[styles.backText, dynamicStyles.backText]}>Quay lại</ThemedText>
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>
          {params.title || "Video Call"}
        </ThemedText>
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
        <View style={[styles.calleeCard, dynamicStyles.calleeCard]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(params.title || "K").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.calleeName, dynamicStyles.calleeName]}>
              {params.title || "Đang kết nối"}
            </ThemedText>
            <ThemedText style={[styles.calleeHint, dynamicStyles.calleeHint]}>
              Đang thiết lập video call...
            </ThemedText>
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
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: { fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "700" },
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
  calleeName: { fontSize: 16, fontWeight: "700" },
  calleeHint: { fontSize: 12, marginTop: 2 },
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

