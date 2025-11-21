import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { ProfileStackParamList } from "../navigation/AppNavigator";
import { getUserByUsername, updateUser, uploadProofFile } from "../api/api";
import { useTheme } from "../../contexts/ThemeContext";
import { useThemeColors } from "../../hooks/use-theme-colors";

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
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

  // Dynamic styles dựa trên theme
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.containerBackground,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 50,
          paddingBottom: 20,
          backgroundColor: colors.headerBackground,
        },
        profileSection: {
          alignItems: "center",
          paddingVertical: 30,
          backgroundColor: colors.sectionBackground,
          marginBottom: 16,
        },
        menuSection: {
          backgroundColor: colors.cardBackground,
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
          borderBottomColor: colors.borderColor,
        },
        menuItemText: {
          fontSize: 16,
          color: colors.primaryText,
        },
        profileName: { color: colors.primaryText },
        profileEmail: { color: colors.secondaryText },
        roleContainer: { backgroundColor: colors.sectionBackground },
        roleText: { color: colors.tint },
        valueText: { color: colors.tint },
        loadingText: { color: colors.secondaryText },
        errorText: { color: colors.tint },
        retryButton: { backgroundColor: colors.tint },
        retryButtonText: { color: colors.headerBackground },
      }),
    [colors]
  );
  const iconColor = colors.secondaryText;
  const dangerColor = "#ff6b6b";

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

  const handleImagePicker = () => {
    Alert.alert(
      "Chọn ảnh đại diện",
      "Bạn muốn chọn ảnh từ đâu?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Thư viện", onPress: pickImageFromLibrary },
        { text: "Camera", onPress: captureImage },
      ]
    );
  };

  const pickImageFromLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh để chọn ảnh.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadAndUpdateProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.");
    }
  };

  const captureImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Quyền truy cập", "Cần quyền truy cập camera để chụp ảnh.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadAndUpdateProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh. Vui lòng thử lại.");
    }
  };

  const uploadAndUpdateProfileImage = async (imageUri: string) => {
    if (!user) return;

    try {
      setUploading(true);
      
      // Upload ảnh lên Cloudinary trực tiếp
      const imageUrl = await uploadProofFile({
        uri: imageUri,
        name: `profile_${user.uid}_${Date.now()}.jpg`,
        type: "image/jpeg",
      });

      // Cập nhật profileImage vào database ngay lập tức (không cần duyệt)
      await updateUser(user.uid, {
        profileImage: imageUrl,
      });

      // Cập nhật state để hiển thị ngay
      setUser({ ...user, profileImage: imageUrl });
    } catch (error) {
      console.error("Lỗi khi upload ảnh:", error);
      Alert.alert("Lỗi", "Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploading(false);
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
    const color = item.id === "logout" ? dangerColor : iconColor;
    if (item.iconType === "MaterialIcons") {
      return <MaterialIcons name={item.icon as any} size={22} color={color} />;
    }
    return <Ionicons name={item.icon as any} size={22} color={color} />;
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
      case "dark_mode":
        toggleTheme();
        break;
      default:
        Alert.alert("Thông báo", `Tính năng ${item.label} đang được phát triển`);
    }
  };

  const renderMenuItem = (item: MenuItem) => {
    if (item.id === "dark_mode") {
      return (
        <View key={item.id} style={[styles.menuItem, dynamicStyles.menuItem]}>
          <View style={styles.menuItemLeft}>
            <View style={styles.iconContainer}>{renderIcon(item)}</View>
            <ThemedText style={[styles.menuItemText, dynamicStyles.menuItemText]}>{item.label}</ThemedText>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.borderColor, true: colors.tint }}
            thumbColor={isDark ? colors.cardBackground : colors.cardBackground}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, dynamicStyles.menuItem]}
        onPress={() => handleMenuPress(item)}
      >
        <View style={styles.menuItemLeft}>
          <View style={styles.iconContainer}>{renderIcon(item)}</View>
          <ThemedText style={[styles.menuItemText, dynamicStyles.menuItemText]}>{item.label}</ThemedText>
        </View>
        <View style={styles.menuItemRight}>
          {item.value && (
            <ThemedText style={[styles.valueText, dynamicStyles.valueText]}>{item.value}</ThemedText>
          )}
          <MaterialIcons name="chevron-right" size={24} color={colors.placeholderText} />
        </View>
      </TouchableOpacity>
    );
  };

  // Hiển thị trạng thái loading
  if (loading) {
    return (
      <ThemedView style={[styles.container, dynamicStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={[styles.loadingText, dynamicStyles.loadingText]}>
          Đang tải thông tin...
        </ThemedText>
      </ThemedView>
    );
  }

  // Hiển thị trạng thái lỗi
  if (error) {
    return (
      <ThemedView style={[styles.container, dynamicStyles.container, styles.centerContent]}>
        <MaterialIcons name="error-outline" size={40} color={dangerColor} />
        <ThemedText style={[styles.errorText, dynamicStyles.errorText]}>{error}</ThemedText>
        <TouchableOpacity
          style={[styles.retryButton, dynamicStyles.retryButton]}
          onPress={() => navigation.getParent()?.navigate("Auth" as never)}
        >
          <ThemedText style={[styles.retryButtonText, dynamicStyles.retryButtonText]}>
            Quay lại đăng nhập
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Tài khoản</ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileSection, dynamicStyles.profileSection]}>
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
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={handleImagePicker}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="photo-camera" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <ThemedText style={[styles.profileName, dynamicStyles.profileName]}>
            {user?.fullName || user?.username || "Chưa cập nhật tên"}
          </ThemedText>
          <ThemedText style={[styles.profileEmail, dynamicStyles.profileEmail]}>
            {user?.email || "Chưa cập nhật email"}
          </ThemedText>
          {user?.role && (
            <View style={[styles.roleContainer, dynamicStyles.roleContainer]}>
              <ThemedText style={[styles.roleText, dynamicStyles.roleText]}>
                {user.role === "student"
                  ? "Học viên"
                  : user.role === "teacher"
                  ? "Giảng viên"
                  : user.role}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={[styles.menuSection, dynamicStyles.menuSection]}>{menuItems.map(renderMenuItem)}</View>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    marginBottom: 16,
  },
  menuSection: {
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
