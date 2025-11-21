import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState, useMemo } from "react";
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
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useThemeColors } from "../../hooks/use-theme-colors";
import {
  getUserByUsername,
  getUserCourses,
  unenrollCourse,
  getCoursesByInstructor,
  getSavedCourses,
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
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<
    "completed" | "ongoing" | "created" | "saved"
  >("ongoing");
  const [searchText, setSearchText] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [savedCourses, setSavedCourses] = useState<Course[]>([]);
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

      // Load created courses nếu là instructor - chỉ lấy các khóa học đã được duyệt
      if ((user.role || "").toLowerCase() === "instructor") {
        const instructorCourses = await getCoursesByInstructor(user.uid);
        const publishedCourses = (instructorCourses || []).filter(
          (course: Course) => course.isPublished === true
        );
        setCreatedCourses(publishedCourses);
      } else {
        setCreatedCourses([]);
      }

      // Load saved courses
      try {
        const saved = await getSavedCourses(user.uid);
        if (Array.isArray(saved) && saved.length > 0) {
          // Map saved courses to Course format
          const savedCoursesList = saved
            .map((item: any) => {
              // getSavedCourses trả về { course, courseId }
              const course = item.course || item;
              if (!course || (!course.id && !course._id && !item.courseId)) {
                return null;
              }
              return {
                id: course.id || course._id || item.courseId,
                title: course.title || "",
                category: course.category,
                categoryName: course.categoryName,
                description: course.description,
                currentPrice: course.currentPrice || course.price,
                originalPrice: course.originalPrice,
                rating: course.rating,
                students: course.students,
                totalLessons: course.totalLessons,
                thumbnailUrl: course.thumbnailUrl || course.image,
                image: course.image,
                imageUrl: course.imageUrl,
                status: course.status,
                isPublished: course.isPublished,
              } as Course;
            })
            .filter((c: Course | null): c is Course => c !== null && !!c.id);
          setSavedCourses(savedCoursesList);
        } else {
          setSavedCourses([]);
        }
      } catch (e) {
        console.error("Error loading saved courses:", e);
        setSavedCourses([]);
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

  // Refresh saved courses khi chuyển sang tab "Đã lưu"
  useEffect(() => {
    if (activeTab === "saved") {
      loadCourses().catch(() => {});
    }
  }, [activeTab]);

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

  const filteredSaved = savedCourses.filter(
    (c) =>
      !searchText ||
      (c.title || "").toLowerCase().includes(searchText.toLowerCase())
  );

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
    searchBar: {
      backgroundColor: colors.searchBackground,
    },
    searchInput: {
      color: colors.primaryText,
    },
    tabButton: {
      backgroundColor: colors.tabBackground,
    },
    tabText: {
      color: colors.primaryText,
    },
    card: {
      backgroundColor: colors.cardBackground,
    },
    category: {
      color: colors.secondaryText,
    },
    title: {
      color: colors.primaryText,
    },
    mutedSmall: {
      color: colors.secondaryText,
    },
  }), [colors]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, dynamicStyles.container, styles.center]}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <ThemedText style={[styles.muted, { color: colors.secondaryText }]}>Đang tải khóa học...</ThemedText>
      </ThemedView>
    );
  }
  if (error) {
    return (
      <ThemedView style={[styles.container, dynamicStyles.container, styles.center]}>
        <MaterialIcons name="error-outline" size={40} color="#e74c3c" />
        <ThemedText style={[styles.error, { color: colors.primaryText }]}>{error}</ThemedText>
      </ThemedView>
    );
  }

  const renderEnrolledCourse = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={[styles.card, dynamicStyles.card]}
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
        <ThemedText style={[styles.category, dynamicStyles.category]} numberOfLines={1}>
          {item.categoryName || item.category || "Course"}
        </ThemedText>
        <ThemedText style={[styles.title, dynamicStyles.title]} numberOfLines={2}>
          {item.title || item.id}
        </ThemedText>
        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={14} color="#FFD700" />
            <ThemedText style={[styles.mutedSmall, dynamicStyles.mutedSmall]}>{item.rating ?? 0}</ThemedText>
          </View>
          <ThemedText style={[styles.mutedSmall, dynamicStyles.mutedSmall]}>{item.totalLessons ?? 0} bài</ThemedText>
        </View>
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.cta}
            onPress={(e) => {
              e.stopPropagation();
              // TODO: Navigate to certificate screen
            }}
          >
            <Text style={styles.ctaText}>XEM CHỨNG CHỈ</Text>
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
      style={[styles.card, dynamicStyles.card]}
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
          <ThemedText style={[styles.category, dynamicStyles.category]} numberOfLines={1}>
            {item.categoryName || item.category || "Course"}
          </ThemedText>
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
        <ThemedText style={[styles.title, dynamicStyles.title]} numberOfLines={2}>
          {item.title || item.id}
        </ThemedText>
        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <MaterialIcons name="people" size={14} color="#20B2AA" />
            <ThemedText style={[styles.mutedSmall, dynamicStyles.mutedSmall]}>{item.students ?? 0} học viên</ThemedText>
          </View>
          <ThemedText style={[styles.mutedSmall, dynamicStyles.mutedSmall]}>{item.totalLessons ?? 0} bài</ThemedText>
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
    <ThemedView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>Khóa học của tôi</ThemedText>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBar, dynamicStyles.searchBar]}>
          <MaterialIcons name="search" size={20} color={colors.placeholderText} />
          <TextInput
            style={[styles.searchInput, dynamicStyles.searchInput]}
            placeholder="Tìm kiếm khóa học..."
            placeholderTextColor={colors.placeholderText}
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
          style={[styles.tab, dynamicStyles.tabButton, activeTab === "completed" && styles.tabActive]}
          onPress={() => setActiveTab("completed")}
        >
          <ThemedText
            style={[
              styles.tabText,
              dynamicStyles.tabText,
              activeTab === "completed" && styles.tabTextActive,
            ]}
            numberOfLines={1}
          >
            Hoàn thành
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, dynamicStyles.tabButton, activeTab === "ongoing" && styles.tabActive]}
          onPress={() => setActiveTab("ongoing")}
        >
          <ThemedText
            style={[
              styles.tabText,
              dynamicStyles.tabText,
              activeTab === "ongoing" && styles.tabTextActive,
            ]}
            numberOfLines={1}
          >
            Đang học
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            dynamicStyles.tabButton,
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
              size={12}
              color={colors.placeholderText}
              style={{ marginRight: 2 }}
            />
          )}
          <ThemedText
            style={[
              styles.tabText,
              dynamicStyles.tabText,
              activeTab === "created" && styles.tabTextActive,
              userRole !== "instructor" && styles.tabTextLocked,
            ]}
            numberOfLines={1}
          >
            Đã tạo
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, dynamicStyles.tabButton, activeTab === "saved" && styles.tabActive]}
          onPress={() => setActiveTab("saved")}
        >
          <ThemedText
            style={[
              styles.tabText,
              dynamicStyles.tabText,
              activeTab === "saved" && styles.tabTextActive,
            ]}
            numberOfLines={1}
          >
            Đã lưu
          </ThemedText>
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
      ) : activeTab === "saved" ? (
        <FlatList
          data={filteredSaved}
          renderItem={renderEnrolledCourse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <ThemedText
              style={[{ textAlign: "center", marginTop: 40, color: colors.secondaryText }]}
            >
              Chưa có khóa học đã lưu
            </ThemedText>
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
            <ThemedText
              style={[{ textAlign: "center", marginTop: 40, color: colors.secondaryText }]}
            >
              Chưa có khóa học
            </ThemedText>
          }
        />
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8 },
  searchBtn: {
    marginLeft: 10,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
  },
  tabs: { 
    flexDirection: "row", 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  tabActive: { backgroundColor: "#20B2AA" },
  tabLocked: { backgroundColor: "#f5f5f5", opacity: 0.6 },
  tabText: { 
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },
  tabTextActive: { color: "#fff" },
  tabTextLocked: { color: "#999" },
  card: {
    flexDirection: "row",
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
  category: { fontSize: 12, marginBottom: 4 },
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
