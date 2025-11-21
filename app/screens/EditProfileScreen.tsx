import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState, useEffect, useMemo } from "react";
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
import { useThemeColors } from "../../hooks/use-theme-colors";

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
  const colors = useThemeColors();
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
  const [profileImageLocal, setProfileImageLocal] = useState<{ uri: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
          // Reset profileImageLocal khi load lại
          setProfileImageLocal(null);
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

      const wantsInstructor =
        originalRole === "student" && role === "instructor";

      if (wantsInstructor && !proofFile?.uri) {
        Alert.alert(
          "Thiếu minh chứng",
          "Vui lòng chọn tệp minh chứng khi đăng ký làm giảng viên."
        );
        return;
      }

      // Ảnh profile đã được upload và update ngay khi chọn, không cần upload lại
      const updatedData = {
        fullName,
        nickName,
        email,
        phoneNumber,
        gender,
        role: wantsInstructor ? originalRole : role,
        dateOfBirth: dateOfBirth
          ? dateOfBirth.toISOString().split("T")[0]
          : undefined,
        profileImage: user.profileImage, // Sử dụng profileImage đã được update
        updatedAt: new Date(),
      };

      await updateUser(user.uid, updatedData);

      if (wantsInstructor && proofFile?.uri) {
        try {
          const url = await uploadViaBackend(
            proofFile.uri,
            proofFile.mimeType,
            proofFile.name
          );
          await createProof(
            user.uid,
            url,
            proofFile.mimeType || undefined,
            { name: proofFile.name },
            "instructor"
          );
          setVerificationMsg("Đang xem xét");
          Alert.alert(
            "Đã gửi yêu cầu",
            "Hệ thống đang xem xét yêu cầu trở thành giảng viên. Bạn sẽ được thông báo khi hoàn tất."
          );
          setRole(originalRole || "student");
          setProofFile(null);
        } catch (e: any) {
          console.warn("Upload proof failed:", e?.message || e);
          Alert.alert(
            "Cảnh báo",
            "Tải minh chứng thất bại. Bạn có thể thử lại sau."
          );
        }
      } else {
        navigation.goBack();

        setTimeout(() => {
          Alert.alert("Thành công", "Đã cập nhật thông tin cá nhân");
        }, 100);
      }
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

  const handleProfileImagePicker = () => {
    Alert.alert(
      "Chọn ảnh đại diện",
      "Bạn muốn chọn ảnh từ đâu?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Thư viện", onPress: pickProfileImageFromLibrary },
        { text: "Camera", onPress: captureProfileImage },
      ]
    );
  };

  const pickProfileImageFromLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh để chọn ảnh.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0] && user) {
        // Upload và update ngay lập tức khi chọn ảnh
        await uploadAndUpdateProfileImageImmediately(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.");
    }
  };

  const captureProfileImage = async () => {
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

      if (!result.canceled && result.assets && result.assets[0] && user) {
        // Upload và update ngay lập tức khi chụp ảnh
        await uploadAndUpdateProfileImageImmediately(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh. Vui lòng thử lại.");
    }
  };

  const uploadAndUpdateProfileImageImmediately = async (imageUri: string) => {
    if (!user) return;

    try {
      setUploadingImage(true);
      
      // Upload ảnh lên Cloudinary trực tiếp
      const imageUrl = await uploadViaBackend(
        imageUri,
        "image/jpeg",
        `profile_${user.uid}_${Date.now()}.jpg`
      );

      // Cập nhật profileImage vào database ngay lập tức (không cần duyệt)
      await updateUser(user.uid, {
        profileImage: imageUrl,
      });

      // Cập nhật state để hiển thị ngay
      setUser({ ...user, profileImage: imageUrl });
      setProfileImageLocal({ uri: imageUri });
    } catch (error) {
      console.error("Lỗi khi upload ảnh:", error);
      Alert.alert("Lỗi", "Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploadingImage(false);
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

  // Dynamic styles
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.containerBackground,
    },
    header: {
      backgroundColor: colors.headerBackground,
    },
    headerTitle: {
      color: colors.primaryText,
    },
    inputLabel: {
      color: colors.primaryText,
    },
    textInput: {
      backgroundColor: colors.searchBackground,
      color: colors.primaryText,
      borderColor: colors.borderColor,
    },
    dateText: {
      color: colors.primaryText,
    },
    dropdown: {
      backgroundColor: colors.searchBackground,
      borderColor: colors.borderColor,
    },
    dropdownPlaceholderText: {
      color: colors.placeholderText,
    },
    dropdownSelectedText: {
      color: colors.primaryText,
    },
    phonePrefixText: {
      color: colors.primaryText,
    },
  }), [colors]);

  // Hiển thị trạng thái loading
  if (loading) {
    return (
      <ThemedView style={[styles.container, dynamicStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <ThemedText style={[styles.loadingText, { color: colors.secondaryText }]}>
          Đang tải thông tin...
        </ThemedText>
      </ThemedView>
    );
  }

  // Hiển thị trạng thái lỗi
  if (error) {
    return (
      <ThemedView style={[styles.container, dynamicStyles.container, styles.centerContent]}>
        <MaterialIcons name="error-outline" size={40} color="#e74c3c" />
        <ThemedText style={[styles.errorText, { color: colors.primaryText }]}>{error}</ThemedText>
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
    <ThemedView style={[styles.container, dynamicStyles.container]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>Chỉnh sửa hồ sơ</ThemedText>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileImageSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {profileImageLocal?.uri ? (
                  <Image
                    source={{ uri: profileImageLocal.uri }}
                    style={styles.avatarImage}
                  />
                ) : user?.profileImage ? (
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
                onPress={handleProfileImagePicker}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="photo-camera" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formSection}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, dynamicStyles.inputLabel]}>Họ và tên</ThemedText>
              <TextInput
                style={[styles.textInput, dynamicStyles.textInput]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
                placeholderTextColor={colors.placeholderText}
              />
            </View>

            {/* Nick Name */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, dynamicStyles.inputLabel]}>Biệt danh</ThemedText>
              <TextInput
                style={[styles.textInput, dynamicStyles.textInput]}
                value={nickName}
                onChangeText={setNickName}
                placeholder="Nhập biệt danh"
                placeholderTextColor={colors.placeholderText}
              />
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Ngày sinh</ThemedText>
              <TouchableOpacity
                style={[styles.textInput, dynamicStyles.textInput]}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.datePickerButton}>
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={colors.placeholderText}
                    style={styles.dateIcon}
                  />
                  <ThemedText style={[styles.dateText, dynamicStyles.dateText]}>
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
              <ThemedText style={[styles.inputLabel, dynamicStyles.inputLabel]}>Email</ThemedText>
              <TextInput
                style={[styles.textInput, dynamicStyles.textInput]}
                value={email}
                onChangeText={setEmail}
                placeholder="Nhập email"
                placeholderTextColor={colors.placeholderText}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, dynamicStyles.inputLabel]}>Số điện thoại</ThemedText>
              <View style={styles.phoneContainer}>
                <View style={styles.phonePrefix}>
                  <ThemedText style={[styles.phonePrefixText, dynamicStyles.phonePrefixText]}>+84</ThemedText>
                </View>
                <TextInput
                  style={[styles.phoneInput, dynamicStyles.textInput]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, dynamicStyles.inputLabel]}>Giới tính</ThemedText>
              <Dropdown
                style={[styles.dropdown, dynamicStyles.dropdown]}
                placeholderStyle={[styles.dropdownPlaceholderText, dynamicStyles.dropdownPlaceholderText]}
                selectedTextStyle={[styles.dropdownSelectedText, dynamicStyles.dropdownSelectedText]}
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
              <ThemedText style={[styles.inputLabel, dynamicStyles.inputLabel]}>Vai trò</ThemedText>
              <Dropdown
                style={[styles.dropdown, dynamicStyles.dropdown]}
                placeholderStyle={[styles.dropdownPlaceholderText, dynamicStyles.dropdownPlaceholderText]}
                selectedTextStyle={[styles.dropdownSelectedText, dynamicStyles.dropdownSelectedText]}
                data={[
                  { label: "Học viên", value: "student" },
                  { label: "Giảng viên", value: "instructor" },
                ]}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Chọn vai trò"
                value={role}
                onChange={(item) => {
                  setRole(item.value);
                  if (!(originalRole === "student" && item.value === "instructor")) {
                    setProofFile(null);
                    setVerificationMsg("");
                  }
                }}
              />
            </View>

            {originalRole === "student" && role === "instructor" && (
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, dynamicStyles.inputLabel]}>
                  Minh chứng (ảnh/video/tài liệu)
                </ThemedText>
                <TouchableOpacity
                  style={[styles.textInput, dynamicStyles.textInput]}
                  onPress={pickProofFromLibrary}
                >
                  <View style={styles.datePickerButton}>
                    <MaterialIcons
                      name="attach-file"
                      size={20}
                      color={colors.placeholderText}
                      style={styles.dateIcon}
                    />
                    <ThemedText style={[styles.dateText, dynamicStyles.dateText]}>
                      {proofFile?.name ||
                        proofFile?.uri?.split("/").pop() ||
                        "Chọn tệp minh chứng"}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Update Button */}
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdateProfile}
              disabled={
                saving ||
                uploadingImage ||
                (originalRole === "student" &&
                  role === "instructor" &&
                  !proofFile?.uri)
              }
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
              <ThemedText style={styles.reviewNote}>{verificationMsg}</ThemedText>
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
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
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
  reviewNote: {
    marginTop: 12,
    color: "#ff8c00",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "left",
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
