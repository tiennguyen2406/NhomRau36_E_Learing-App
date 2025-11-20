import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { ProfileStackParamList } from "../navigation/AppNavigator";
import { getUserByUsername } from "../api/api";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  iconType: "MaterialIcons" | "Ionicons";
  value?: string;
}

interface User {
  uid: string;
  username: string;
  email: string;
  fullName?: string;
  profileImage?: string;
  role?: string;
  preferences?: {
    language: string;
    darkMode: boolean;
    notifications: boolean;
  };
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Reset lỗi trước mỗi lần tải

      // Lấy username từ AsyncStorage
      const username = await AsyncStorage.getItem("currentUsername");

      if (!username) {
        // Nếu không có username, chuyển hướng về trang đăng nhập
        navigation.getParent()?.navigate("Auth" as never);
        return;
      }

      // Lấy thông tin chi tiết của user từ API
      const userData = await getUserByUsername(username);
      if (userData) {
        setUser(userData);
      } else {
        setError("Không tìm thấy thông tin người dùng");
        Alert.alert(
          "Lỗi",
          "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
      }
    } catch (err) {
      console.error("Lỗi khi tải thông tin người dùng:", err);
      setError("Có lỗi xảy ra khi tải thông tin người dùng");
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  // Chạy khi component mount
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Chạy khi focus vào màn hình (ví dụ: sau khi chỉnh sửa profile và quay lại)
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [loadUserProfile])
  );

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("currentUsername");
      Alert.alert("Thành công", "Đăng xuất thành công");
      navigation.getParent()?.navigate("Auth" as never);
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
      Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: "edit_profile",
      label: "Chỉnh sửa hồ sơ",
      icon: "edit",
      iconType: "MaterialIcons",
    },
    {
      id: "payment",
      label: "Phương thức thanh toán",
      icon: "payment",
      iconType: "MaterialIcons",
    },
    {
      id: "notifications",
      label: "Thông báo",
      icon: "notifications-none",
      iconType: "MaterialIcons",
    },
    {
      id: "security",
      label: "Bảo mật",
      icon: "security",
      iconType: "MaterialIcons",
    },
    {
      id: "language",
      label: "Ngôn ngữ",
      icon: "language",
      iconType: "MaterialIcons",
      value: "Tiếng Việt",
    },
    {
      id: "dark_mode",
      label: "Chế độ tối",
      icon: "dark-mode",
      iconType: "MaterialIcons",
    },
    {
      id: "terms",
      label: "Điều khoản & Điều kiện",
      icon: "description",
      iconType: "MaterialIcons",
    },
    {
      id: "help",
      label: "Trung tâm trợ giúp",
      icon: "help-outline",
      iconType: "MaterialIcons",
    },
    {
      id: "invite",
      label: "Mời bạn bè",
      icon: "people-outline",
      iconType: "MaterialIcons",
    },
    {
      id: "logout",
      label: "Đăng xuất",
      icon: "logout",
      iconType: "MaterialIcons",
    },
  ];

  const renderIcon = (item: MenuItem) => {
    if (item.iconType === "MaterialIcons") {
      return <MaterialIcons name={item.icon as any} size={22} color="#666" />;
    }
    return <Ionicons name={item.icon as any} size={22} color="#666" />;
  };

  const handleMenuPress = (item: MenuItem) => {
    switch (item.id) {
      case "logout":
        handleLogout();
        break;
      case "edit_profile":
        navigation.navigate("EditProfile");
        break;
      case "notifications":
        navigation.navigate("Notifications");
        break;
      case "terms":
        navigation.navigate("Terms");
        break;
      case "help":
        navigation.navigate("HelpCenter");
        break;
      default:
        Alert.alert("Thông báo", `Tính năng ${item.label} đang được phát triển`);
    }
  };

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => handleMenuPress(item)}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>{renderIcon(item)}</View>
        <ThemedText style={styles.menuItemText}>{item.label}</ThemedText>
      </View>
      <View style={styles.menuItemRight}>
        {item.value && (
          <ThemedText style={styles.valueText}>{item.value}</ThemedText>
        )}
        <MaterialIcons name="chevron-right" size={24} color="#999" />
      </View>
    </TouchableOpacity>
  );

  // Hiển thị trạng thái loading
  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <ThemedText style={styles.loadingText}>
          Đang tải thông tin...
        </ThemedText>
      </ThemedView>
    );
  }

  // Hiển thị trạng thái lỗi
  if (error) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <MaterialIcons name="error-outline" size={40} color="#e74c3c" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.getParent()?.navigate("Auth" as never)}
        >
          <ThemedText style={styles.retryButtonText}>
            Quay lại đăng nhập
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Tài khoản</ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.profileImage ? (
                <Image
                  source={{ uri: user.profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <ThemedText style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || "?"}
                </ThemedText>
              )}
            </View>
            <View style={styles.editAvatarButton}>
              <MaterialIcons name="photo-camera" size={18} color="#fff" />
            </View>
          </View>
          <ThemedText style={styles.profileName}>
            {user?.fullName || user?.username || "Chưa cập nhật tên"}
          </ThemedText>
          <ThemedText style={styles.profileEmail}>
            {user?.email || "Chưa cập nhật email"}
          </ThemedText>
          {user?.role && (
            <View style={styles.roleContainer}>
              <ThemedText style={styles.roleText}>
                {user.role === "student"
                  ? "Học viên"
                  : user.role === "teacher"
                  ? "Giảng viên"
                  : user.role}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.menuSection}>{menuItems.map(renderMenuItem)}</View>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#fff",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    borderWidth: 3,
    borderColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#20B2AA",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
    textAlign: "center",
  },
  profileEmail: {
    fontSize: 14,
    color: "#777",
    marginBottom: 8,
  },
  roleContainer: {
    backgroundColor: "#e6f7f5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 6,
  },
  roleText: {
    fontSize: 12,
    color: "#20B2AA",
    fontWeight: "500",
  },
  menuSection: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  valueText: {
    fontSize: 14,
    color: "#20B2AA",
    marginRight: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#20B2AA",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
});

export default ProfileScreen;
