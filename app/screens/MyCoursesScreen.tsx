import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getUserByUsername,
  getUserCourses,
  unenrollCourse,
  getCoursesByInstructor,
} from "../api/api";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Course {
  id: string;
  title: string;
  category?: string;
  categoryName?: string;
  description?: string;
  currentPrice?: number;
  originalPrice?: number;
  rating?: number;
  students?: number;
  totalLessons?: number;
  thumbnailUrl?: string;
  image?: string;
  imageUrl?: string;
  status?: string;
  isPublished?: boolean;
}

const MyCoursesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<
    "completed" | "ongoing" | "created"
  >("ongoing");
  const [searchText, setSearchText] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("student");

  const loadCourses = async () => {
    try {
      const stored = await AsyncStorage.getItem("currentUsername");
      const username = stored || "instructor01";
      const user = await getUserByUsername(username);
      if (!user) throw new Error("User not found");

      // Lưu user info
      setUserRole((user.role || "student").toLowerCase());

      // Load enrolled courses
      const userCourses = await getUserCourses(user.uid);
      setCourses(userCourses || []);

      // Load created courses nếu là instructor
      if ((user.role || "").toLowerCase() === "instructor") {
        const instructorCourses = await getCoursesByInstructor(user.uid);
        setCreatedCourses(instructorCourses || []);
      } else {
        setCreatedCourses([]);
      }

      setError(""); // Clear error nếu thành công
    } catch (e) {
      console.error("Load courses error:", e);
      setError("Không thể tải khóa học của bạn");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadCourses();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Tự động refresh khi quay lại màn hình này
  useFocusEffect(
    useCallback(() => {
      // Refresh mỗi khi màn hình được focus (quay lại từ màn hình khác)
      const timer = setTimeout(() => {
        loadCourses().catch(() => {});
      }, 100); // Delay nhỏ để tránh conflict với loading ban đầu
      return () => clearTimeout(timer);
    }, [])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      await loadCourses();
    } catch {
      setError("Không thể tải khóa học của bạn");
    } finally {
      setRefreshing(false);
    }
  };

  const handleUnenroll = async (courseId: string, courseTitle: string) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc muốn hủy tham gia khóa học "${courseTitle}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          style: "destructive",
          onPress: async () => {
            try {
              setUnenrollingId(courseId);
              const stored = await AsyncStorage.getItem("currentUsername");
              const username = stored || "instructor01";
              const user = await getUserByUsername(username);
              if (!user || !user.uid) {
                Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
                return;
              }
              await unenrollCourse(user.uid, courseId);
              Alert.alert("Thành công", "Đã hủy tham gia khóa học");
              // Refresh danh sách
              await loadCourses();
            } catch (e: any) {
              const msg = e?.message || "Không thể hủy tham gia khóa học";
              Alert.alert("Lỗi", msg);
            } finally {
              setUnenrollingId(null);
            }
          },
        },
      ]
    );
  };

  const filteredEnrolled = courses.filter(
    (c) =>
      !searchText ||
      (c.title || "").toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredCreated = createdCourses.filter(
    (c) =>
      !searchText ||
      (c.title || "").toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <Text style={styles.muted}>Đang tải khóa học...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <MaterialIcons name="error-outline" size={40} color="#e74c3c" />
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const renderEnrolledCourse = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() =>
        navigation.navigate("CourseLessons" as any, {
          courseId: item.id,
          title: item.title,
        })
      }
    >
      {item.thumbnailUrl || item.image || item.imageUrl ? (
        <Image
          source={{
            uri: (item.thumbnailUrl || item.image || item.imageUrl) as string,
          }}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.cardBody}>
        <Text style={styles.category} numberOfLines={1}>
          {item.categoryName || item.category || "Course"}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title || item.id}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.mutedSmall}>{item.rating ?? 0}</Text>
          </View>
          <Text style={styles.mutedSmall}>{item.totalLessons ?? 0} bài</Text>
        </View>
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.cta}
            onPress={(e) => {
              e.stopPropagation();
              // TODO: Navigate to certificate screen
            }}
          >
            <Text style={styles.ctaText}>VIEW CERTIFICATE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unenrollBtn,
              unenrollingId === item.id && styles.unenrollBtnDisabled,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleUnenroll(item.id, item.title || item.id);
            }}
            disabled={unenrollingId === item.id}
          >
            {unenrollingId === item.id ? (
              <ActivityIndicator size="small" color="#e74c3c" />
            ) : (
              <Text style={styles.unenrollText} numberOfLines={1}>
                Hủy
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCreatedItem = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() =>
        navigation.navigate("CourseDetail" as any, { courseId: item.id })
      }
    >
      {item.thumbnailUrl || item.image || item.imageUrl ? (
        <Image
          source={{
            uri: (item.thumbnailUrl || item.image || item.imageUrl) as string,
          }}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.categoryRow}>
          <Text style={styles.category} numberOfLines={1}>
            {item.categoryName || item.category || "Course"}
          </Text>
          <View
            style={[
              styles.statusBadge,
              item.isPublished ? styles.statusPublished : styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>
              {item.isPublished ? "Đã duyệt" : "Chờ duyệt"}
            </Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title || item.id}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <MaterialIcons name="people" size={14} color="#20B2AA" />
            <Text style={styles.mutedSmall}>{item.students ?? 0} học viên</Text>
          </View>
          <Text style={styles.mutedSmall}>{item.totalLessons ?? 0} bài</Text>
        </View>
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("CreateCourse" as any, {
                courseId: item.id,
                mode: "edit",
              });
            }}
          >
            <MaterialIcons name="edit" size={16} color="#fff" />
            <Text style={styles.editText}>CHỈNH SỬA</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Courses</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for ..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <MaterialIcons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.tabActive]}
          onPress={() => setActiveTab("completed")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "completed" && styles.tabTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "ongoing" && styles.tabActive]}
          onPress={() => setActiveTab("ongoing")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "ongoing" && styles.tabTextActive,
            ]}
          >
            Ongoing
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "created" && styles.tabActive,
            userRole !== "instructor" && styles.tabLocked,
          ]}
          onPress={() => {
            if (userRole === "instructor") {
              setActiveTab("created");
            } else {
              Alert.alert(
                "Chỉ dành cho giảng viên",
                "Tính năng này chỉ dành cho tài khoản Instructor. Nâng cấp tài khoản để tạo khóa học của riêng bạn!",
                [{ text: "OK" }]
              );
            }
          }}
          disabled={userRole !== "instructor"}
        >
          {userRole !== "instructor" && (
            <MaterialIcons
              name="lock"
              size={14}
              color="#999"
              style={{ marginRight: 4 }}
            />
          )}
          <Text
            style={[
              styles.tabText,
              activeTab === "created" && styles.tabTextActive,
              userRole !== "instructor" && styles.tabTextLocked,
            ]}
          >
            Khóa học đã tạo
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === "created" ? (
        <FlatList
          data={filteredCreated}
          renderItem={renderCreatedItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Text
              style={[styles.muted, { textAlign: "center", marginTop: 40 }]}
            >
              Bạn chưa tạo khóa học nào
            </Text>
          }
        />
      ) : (
        <FlatList
          data={filteredEnrolled}
          renderItem={renderEnrolledCourse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Text
              style={[styles.muted, { textAlign: "center", marginTop: 40 }]}
            >
              Chưa có khóa học
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, color: "#333" },
  searchBtn: {
    marginLeft: 10,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
  },
  tabs: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 10,
  },
  tabActive: { backgroundColor: "#20B2AA" },
  tabLocked: { backgroundColor: "#f5f5f5", opacity: 0.6 },
  tabText: { color: "#666", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  tabTextLocked: { color: "#999" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  thumb: { width: 100, height: 90, backgroundColor: "#111" },
  cardBody: { flex: 1, padding: 12 },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  category: { color: "#FF8C00", fontSize: 12, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPublished: { backgroundColor: "#d4edda" },
  statusPending: { backgroundColor: "#fff3cd" },
  statusText: { fontSize: 10, fontWeight: "600", color: "#333" },
  title: { color: "#333", fontSize: 14, fontWeight: "700", marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  cta: {
    borderRadius: 14,
    backgroundColor: "#e8f8f7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  ctaText: { color: "#20B2AA", fontSize: 12, fontWeight: "700" },
  unenrollBtn: {
    borderRadius: 14,
    backgroundColor: "#fee",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#fcc",
    justifyContent: "center",
    alignItems: "center",
  },
  unenrollBtnDisabled: { opacity: 0.6 },
  unenrollText: { color: "#e74c3c", fontSize: 12, fontWeight: "700" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#20B2AA",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editText: { color: "#fff", fontSize: 12, fontWeight: "700", marginLeft: 4 },
  muted: { color: "#777" },
  mutedSmall: { color: "#777", fontSize: 12, marginLeft: 4 },
  error: { color: "#e74c3c", marginTop: 16, textAlign: "center" },
});

export default MyCoursesScreen;
