import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Dropdown } from "react-native-element-dropdown";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { ProfileStackParamList } from "../navigation/AppNavigator";
import { getUserByUsername, updateUser, createProof, uploadProofFile } from "../api/api";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface User {
  uid: string;
  username: string;
  email: string;
  fullName?: string;
  nickName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  gender?: string;
  profileImage?: string;
  role?: string;
  preferences?: {
    language: string;
    darkMode: boolean;
    notifications: boolean;
  };
}

const genderData = [
  { label: "Nam", value: "male" },
  { label: "Nữ", value: "female" },
  { label: "Khác", value: "other" },
];

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [nickName, setNickName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [originalRole, setOriginalRole] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<{ uri: string; mimeType?: string; name?: string } | null>(null);
  const [verificationMsg, setVerificationMsg] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        // Lấy username từ AsyncStorage
        const username = await AsyncStorage.getItem("currentUsername");

        if (!username) {
          navigation.getParent()?.navigate("Auth" as never);
          return;
        }

        // Lấy thông tin chi tiết của user từ API
        const userData = await getUserByUsername(username);
        if (userData) {
          setUser(userData);
          // Điền thông tin vào form
          setFullName(userData.fullName || "");
          setNickName(userData.nickName || "");
          setEmail(userData.email || "");
          setPhoneNumber(userData.phoneNumber || "");
          setGender(userData.gender || null);
          setRole(userData.role || "student");
          setOriginalRole(userData.role || "student");

          // Xử lý ngày sinh nếu có
          if (userData.dateOfBirth) {
            setDateOfBirth(new Date(userData.dateOfBirth));
          }
        } else {
          setError("Không tìm thấy thông tin người dùng");
          Alert.alert("Lỗi", "Không thể tải thông tin người dùng");
        }
      } catch (err) {
        console.error("Lỗi khi tải thông tin người dùng:", err);
        setError("Có lỗi xảy ra khi tải thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [navigation]);

  const uploadViaBackend = async (localUri: string, mimeType?: string, name?: string) => {
    return uploadProofFile({ uri: localUri, type: mimeType, name });
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setVerificationMsg("");

      const updatedData = {
        fullName,
        nickName,
        email,
        phoneNumber,
        gender,
        role,
        dateOfBirth: dateOfBirth
          ? dateOfBirth.toISOString().split("T")[0]
          : undefined,
        updatedAt: new Date(),
      };

      await updateUser(user.uid, updatedData);

      // Nếu đổi role so với ban đầu, và có minh chứng -> upload cloudinary và lưu MinhChung
      if (originalRole && role && role !== originalRole) {
        if (proofFile?.uri) {
          try {
            const url = await uploadViaBackend(proofFile.uri, proofFile.mimeType, proofFile.name);
            await createProof(user.uid, url, proofFile.mimeType || undefined, { name: proofFile.name });
          } catch (e: any) {
            // Không chặn luồng chính, chỉ cảnh báo
            console.warn("Upload proof failed:", e?.message || e);
            Alert.alert("Cảnh báo", "Tải minh chứng thất bại. Bạn có thể thử lại sau.");
          }
        }
        setVerificationMsg("Hệ thống đang xác thực");
      }

      // Quay về màn hình Profile trước
      navigation.goBack();

      // Sau đó hiển thị thông báo thành công
      setTimeout(() => {
        Alert.alert("Thành công", "Đã cập nhật thông tin cá nhân");
      }, 100);
    } catch (err) {
      console.error("Lỗi khi cập nhật thông tin:", err);
      Alert.alert(
        "Lỗi",
        "Không thể cập nhật thông tin cá nhân. Vui lòng thử lại."
      );
    } finally {
      setSaving(false);
    }
  };

  const pickProofFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Quyền truy cập", "Ứng dụng cần quyền truy cập thư viện để chọn minh chứng.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const a = result.assets[0];
        setProofFile({ uri: a.uri, mimeType: a.mimeType || undefined, name: a.fileName || undefined });
      }
    } catch (e) {
      console.warn(e);
      Alert.alert("Lỗi", "Không thể chọn tệp minh chứng.");
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

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
          onPress={() => navigation.goBack()}
        >
          <ThemedText style={styles.retryButtonText}>Quay lại</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Chỉnh sửa hồ sơ</ThemedText>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileImageSection}>
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
          </View>

          <View style={styles.formSection}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Họ và tên</ThemedText>
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#999"
              />
            </View>

            {/* Nick Name */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Biệt danh</ThemedText>
              <TextInput
                style={styles.textInput}
                value={nickName}
                onChangeText={setNickName}
                placeholder="Nhập biệt danh"
                placeholderTextColor="#999"
              />
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Ngày sinh</ThemedText>
              <TouchableOpacity
                style={styles.textInput}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.datePickerButton}>
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color="#666"
                    style={styles.dateIcon}
                  />
                  <ThemedText style={styles.dateText}>
                    {dateOfBirth
                      ? dateOfBirth.toLocaleDateString()
                      : "Chọn ngày sinh"}
                  </ThemedText>
                </View>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth || new Date()}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Email</ThemedText>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Nhập email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Số điện thoại</ThemedText>
              <View style={styles.phoneContainer}>
                <View style={styles.phonePrefix}>
                  <ThemedText style={styles.phonePrefixText}>+84</ThemedText>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Giới tính</ThemedText>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.dropdownPlaceholderText}
                selectedTextStyle={styles.dropdownSelectedText}
                data={genderData}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Chọn giới tính"
                value={gender}
                onChange={(item) => {
                  setGender(item.value);
                }}
              />
            </View>

            {/* Role - chọn student/instructor */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Vai trò</ThemedText>
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.dropdownPlaceholderText}
                selectedTextStyle={styles.dropdownSelectedText}
                data={[{ label: "Học viên", value: "student" }, { label: "Giảng viên", value: "instructor" }]}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Chọn vai trò"
                value={role}
                onChange={(item) => setRole(item.value)}
              />
            </View>

            {/* Minh chứng (ảnh/video/tài liệu) */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Minh chứng (khi đổi vai trò)</ThemedText>
              <TouchableOpacity style={styles.textInput} onPress={pickProofFromLibrary}>
                <View style={styles.datePickerButton}>
                  <MaterialIcons name="attach-file" size={20} color="#666" style={styles.dateIcon} />
                  <ThemedText style={styles.dateText}>
                    {proofFile?.name || proofFile?.uri?.split("/").pop() || "Chọn tệp minh chứng"}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>

            {/* Update Button */}
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdateProfile}
              disabled={saving}
            >
              <ThemedText style={styles.updateButtonText}>Cập nhật</ThemedText>
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={styles.buttonLoader}
                />
              ) : (
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              )}
            </TouchableOpacity>
            {verificationMsg ? (
              <ThemedText style={{ color: "#20B2AA", marginTop: 8 }}>{verificationMsg}</ThemedText>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  keyboardView: {
    flex: 1,
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
  profileImageSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
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
  formSection: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333",
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    color: "#999",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  dateIcon: {
    marginRight: 10,
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  phoneContainer: {
    flexDirection: "row",
    height: 50,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
  },
  phonePrefix: {
    width: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  phonePrefixText: {
    fontSize: 16,
    color: "#666",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#333",
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
  },
  dropdownPlaceholderText: {
    fontSize: 16,
    color: "#999",
  },
  dropdownSelectedText: {
    fontSize: 16,
    color: "#333",
  },
  updateButton: {
    backgroundColor: "#20B2AA",
    borderRadius: 30,
    height: 56,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  updateButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  buttonLoader: {
    marginLeft: 10,
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

export default EditProfileScreen;
