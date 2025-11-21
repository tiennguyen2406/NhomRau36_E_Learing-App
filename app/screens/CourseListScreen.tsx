import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState, useEffect, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useThemeColors } from "../../hooks/use-theme-colors";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getCategoryById,
  getCoursesByCategory,
  getCourses,
  getCategories,
  saveCourse,
  unsaveCourse,
  getSavedCourses,
  getUserByUsername,
} from "../api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Course {
  id: string;
  title: string;
  category: string; // ID của danh mục
  categoryName?: string; // Tên danh mục (thêm từ API)
  categoryId?: string; // ID danh mục (dự phòng)
  originalPrice?: number;
  currentPrice?: number;
  price?: number; // Giá khóa học (VND)
  rating?: number;
  students?: number;
  totalLessons?: number;
  thumbnailUrl?: string;
  image?: string;
}

interface RouteParams {
  categoryName?: string;
  categoryId?: string;
  searchQuery?: string;
}

type FilterCategory = {
  id: string;
  name: string;
};

const CourseListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const colors = useThemeColors();
  const { categoryName: initialCategoryName, categoryId, searchQuery } =
    route.params as RouteParams;
  const [activeTab, setActiveTab] = useState("courses");
  const [categoryName, setCategoryName] = useState<string>(
    initialCategoryName || ""
  );
  const [searchText, setSearchText] = useState(searchQuery || "");
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [savedCourses, setSavedCourses] = useState<{ [key: string]: boolean }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filterCategories, setFilterCategories] = useState<FilterCategory[]>([
    { id: "all", name: "Tất cả" },
  ]);
  const [selectedFilterId, setSelectedFilterId] = useState<string>(
    categoryId || "all"
  );
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Cập nhật filter mặc định khi route params thay đổi
  useEffect(() => {
    setSelectedFilterId(categoryId || "all");
    if (searchQuery) {
      setSearchText(searchQuery);
      setCategoryName(`Kết quả tìm kiếm: "${searchQuery}"`);
    }
  }, [categoryId, searchQuery]);

  // Lấy danh sách categories để hiển thị filter
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        if (Array.isArray(categoriesData)) {
          const mapped = categoriesData
            .map((cat: any) => ({
              id: cat.id || cat._id,
              name: cat.name || "Danh mục",
            }))
            .filter((cat) => !!cat.id);
          setFilterCategories([{ id: "all", name: "Tất cả" }, ...mapped]);
        }
      } catch (fetchError) {
        console.warn("Không thể tải danh mục cho bộ lọc:", fetchError);
        setFilterCategories([{ id: "all", name: "Tất cả" }]);
      }
    };
    fetchCategories();
  }, []);

  // Lấy thông tin chi tiết về danh mục và khóa học khi filter thay đổi
  useEffect(() => {
    const fetchCoursesByFilter = async () => {
      try {
        setLoading(true);
        setError("");

        // Nếu có searchQuery, lấy tất cả courses và filter ở client
        if (searchQuery) {
          const allCourses = await getCourses();
          const coursesArray = Array.isArray(allCourses) ? allCourses : [];
          setCourses(coursesArray);
          // Filter sẽ được xử lý trong useEffect riêng
        } else if (selectedFilterId === "all") {
          const title = initialCategoryName || "Tất cả khóa học";
          setCategoryName(title);
          // Không set searchText khi categoryId="all" để tránh filter không mong muốn
          if (!searchQuery) {
            setSearchText("");
          }
          const allCourses = await getCourses();
          const coursesArray = Array.isArray(allCourses) ? allCourses : [];
          console.log('CourseListScreen - Fetched all courses:', coursesArray.length);
          if (coursesArray.length > 0) {
            console.log('CourseListScreen - First course:', coursesArray[0]);
            console.log('CourseListScreen - First course ID:', coursesArray[0]?.id);
          }
          setCourses(coursesArray);
        } else {
          // Đặt tên category
          const currentFilter =
            filterCategories.find((cat) => cat.id === selectedFilterId) || null;

          if (currentFilter) {
            setCategoryName(currentFilter.name);
            if (!searchQuery) {
              setSearchText(currentFilter.name);
            }
          } else if (!initialCategoryName) {
            try {
              const categoryData = await getCategoryById(selectedFilterId);
              setCategoryName(categoryData.name);
              if (!searchQuery) {
                setSearchText(categoryData.name);
              }
            } catch (catErr) {
              console.warn("Không thể tải thông tin danh mục:", catErr);
            }
          }

          const coursesData = await getCoursesByCategory(selectedFilterId);
          const coursesArray = Array.isArray(coursesData) ? coursesData : [];
          console.log('CourseListScreen - Fetched courses by category:', coursesArray.length);
          if (coursesArray.length > 0) {
            console.log('CourseListScreen - First course:', coursesArray[0]);
            console.log('CourseListScreen - First course ID:', coursesArray[0]?.id);
          }
          setCourses(coursesArray);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        setError("Không thể tải thông tin. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchCoursesByFilter();
  }, [
    selectedFilterId,
    initialCategoryName,
    filterCategories,
    searchQuery,
  ]);

  // Filter courses theo searchText
  useEffect(() => {
    if (searchText && searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      const filtered = courses.filter((course) => {
        const titleMatch = course.title?.toLowerCase().includes(query);
        const categoryMatch = course.categoryName?.toLowerCase().includes(query);
        return titleMatch || categoryMatch;
      });
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses(courses);
    }
  }, [searchText, courses]);

  // Load saved courses và currentUserId
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("currentUsername");
        if (stored && mounted) {
          const user = await getUserByUsername(stored);
          if (user?.uid || user?.id) {
            const uid = String(user.uid || user.id);
            setCurrentUserId(uid);
            // Load saved courses
            try {
              const saved = await getSavedCourses(uid);
              const savedMap: { [key: string]: boolean } = {};
              if (Array.isArray(saved)) {
                saved.forEach((course: any) => {
                  const courseId = course.id || course._id || course.courseId;
                  if (courseId) savedMap[courseId] = true;
                });
              }
              if (mounted) setSavedCourses(savedMap);
            } catch (e) {
              console.error("Error loading saved courses:", e);
            }
          }
        }
      } catch (e) {
        console.error("Error loading user:", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Hàm xử lý khi người dùng nhấn vào bookmark
  const toggleBookmark = async (courseId: string) => {
    if (!currentUserId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để lưu khóa học");
      return;
    }

    const isSaved = savedCourses[courseId];
    try {
      if (isSaved) {
        await unsaveCourse(currentUserId, courseId);
        setSavedCourses((prev) => ({ ...prev, [courseId]: false }));
      } else {
        await saveCourse(currentUserId, courseId);
        setSavedCourses((prev) => ({ ...prev, [courseId]: true }));
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể lưu khóa học");
    }
  };

  // Không sử dụng dữ liệu mẫu nữa, dùng state courses đã được fetch từ API

  const renderCourseItem = ({ item }: { item: Course }) => {
    // Hiển thị tên danh mục nếu có, hoặc dùng categoryName từ state, hoặc dùng placeholder
    const categoryDisplay = item.categoryName || categoryName || "Danh mục";

    // Debug log
    console.log('CourseListScreen - Rendering course:', item.title, 'ID:', item.id);

    return (
      <TouchableOpacity 
        style={[styles.courseItem, dynamicStyles.courseItem]} 
        activeOpacity={0.8} 
        onPress={() => {
          console.log('CourseListScreen - Navigate to CourseDetail with courseId:', item.id);
          navigation.navigate('CourseDetail', { courseId: item.id } as never);
        }}
      >
        <View style={styles.courseImageContainer}>
          { (item.thumbnailUrl || item.image) ? (
            <Image source={{ uri: (item.thumbnailUrl || item.image) as string }} style={styles.courseImage} resizeMode="cover" />
          ) : (
            <View style={styles.courseImagePlaceholder} />
          ) }
        </View>
        <View style={styles.courseContent}>
          <ThemedText style={styles.courseCategory}>
            {categoryDisplay}
          </ThemedText>
          <ThemedText style={[styles.courseTitle, dynamicStyles.courseTitle]} numberOfLines={2}>
            {item.title}
          </ThemedText>
          <View style={styles.priceContainer}>
            {item.price === 0 || !item.price ? (
              <ThemedText style={styles.freePrice}>Miễn phí</ThemedText>
            ) : (
              <ThemedText style={styles.currentPrice}>
                {item.price.toLocaleString('vi-VN')} VND
              </ThemedText>
            )}
          </View>
          <View style={styles.courseStats}>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={14} color="#FFD700" />
              <ThemedText style={[styles.rating, dynamicStyles.rating]}>{item.rating || 0}</ThemedText>
            </View>
            <ThemedText style={[styles.studentCount, dynamicStyles.studentCount]}>
              {item.students || 0} học viên
            </ThemedText>
            <ThemedText style={[styles.lessonCount, dynamicStyles.lessonCount]}>
              {item.totalLessons || 0} bài
            </ThemedText>
          </View>
        </View>
        <View style={styles.courseActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => toggleBookmark(item.id)}
          >
            <MaterialIcons
              name={savedCourses[item.id] ? "bookmark" : "bookmark-border"}
              size={20}
              color={savedCourses[item.id] ? "#20B2AA" : colors.secondaryText}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Dynamic styles dựa trên theme
  const dynamicStyles = useMemo(() => StyleSheet.create({
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
    searchContainer: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.headerBackground,
    },
    searchBarContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.searchBackground,
      borderRadius: 24,
      paddingHorizontal: 16,
      marginRight: 12,
      height: 48,
    },
    searchInput: {
      flex: 1,
      paddingLeft: 8,
      fontSize: 16,
      color: colors.primaryText,
    },
    tabButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 24,
      backgroundColor: colors.tabBackground,
      marginRight: 12,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.primaryText,
    },
    courseItem: {
      flexDirection: "row",
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      overflow: "hidden",
    },
    courseTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.primaryText,
      marginBottom: 6,
    },
    courseCategory: {
      fontSize: 12,
      color: "#FF8C00",
      marginBottom: 4,
    },
    rating: {
      fontSize: 12,
      color: colors.secondaryText,
      marginLeft: 4,
    },
    studentCount: {
      fontSize: 12,
      color: colors.secondaryText,
      marginLeft: 8,
    },
    lessonCount: {
      fontSize: 12,
      color: colors.secondaryText,
      marginLeft: 8,
    },
    resultText: {
      fontSize: 14,
      color: colors.secondaryText,
    },
  }), [colors]);

  // Hiển thị trạng thái loading
  if (loading) {
    return (
      <ThemedView style={[styles.container, dynamicStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <ThemedText style={[styles.loadingText, { color: colors.secondaryText }]}>Đang tải khóa học...</ThemedText>
      </ThemedView>
    );
  }

  // Hiển thị trạng thái lỗi
  if (error) {
    return (
      <ThemedView style={[styles.container, dynamicStyles.container, styles.errorContainer]}>
        <MaterialIcons name="error-outline" size={40} color="#e74c3c" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError("");
            if (categoryId) {
              getCoursesByCategory(categoryId)
                .then((data) => setCourses(data))
                .catch((err) => setError("Không thể tải thông tin"))
                .finally(() => setLoading(false));
            } else {
              getCourses()
                .then((data) => setCourses(data))
                .catch((err) => setError("Không thể tải thông tin"))
                .finally(() => setLoading(false));
            }
          }}
        >
          <ThemedText style={styles.retryButtonText}>Thử lại</ThemedText>
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
        <ThemedText style={[styles.headerTitle, { color: colors.primaryText }]}>{categoryName}</ThemedText>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
        <View style={[styles.searchBarContainer, dynamicStyles.searchBarContainer]}>
          <MaterialIcons name="search" size={20} color={colors.placeholderText} />
          <TextInput
            style={[styles.searchInput, dynamicStyles.searchInput]}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Tìm kiếm khóa học..."
            placeholderTextColor={colors.placeholderText}
            onSubmitEditing={() => {
              // Filter courses khi nhấn Enter
            }}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="filter-list" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            dynamicStyles.tabButton,
            activeTab === "courses" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("courses")}
        >
          <ThemedText
            style={[
              styles.tabText,
              dynamicStyles.tabText,
              activeTab === "courses" && styles.activeTabText,
            ]}
          >
            Các khóa học
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Result Count */}
      <View style={styles.resultContainer}>
        <ThemedText style={[styles.resultText, dynamicStyles.resultText]}>
          Kết quả cho{" "}
          <ThemedText style={styles.resultHighlight}>
            &quot;{searchText}&quot;
          </ThemedText>
        </ThemedText>
        <TouchableOpacity style={styles.resultCountButton}>
          <ThemedText style={styles.resultCount}>
            {(searchText && searchText.trim() ? filteredCourses : courses).length} Kết quả tìm thấy
          </ThemedText>
          <MaterialIcons name="chevron-right" size={20} color="#20B2AA" />
        </TouchableOpacity>
      </View>

      {/* Course List */}
      <FlatList
        data={searchText && searchText.trim() ? filteredCourses : courses}
        renderItem={renderCourseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.courseList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={[styles.emptyText, { color: colors.secondaryText }]}>
              {searchText && searchText.trim()
                ? `Không tìm thấy khóa học nào cho "${searchText}"`
                : "Không tìm thấy khóa học nào trong danh mục này"}
            </ThemedText>
          </View>
        }
      />

      {/* Filter modal */}
      <Modal
        visible={filterModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.primaryText }]}>
                Chọn danh mục
              </ThemedText>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={22} color={colors.primaryText} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={filterCategories}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => (
                <View style={styles.modalDivider} />
              )}
              renderItem={({ item }) => {
                const isActive = selectedFilterId === item.id;
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedFilterId(item.id);
                      setFilterModalVisible(false);
                    }}
                  >
                    <View style={styles.modalItemInfo}>
                      <MaterialIcons
                        name="category"
                        size={20}
                        color={isActive ? "#20B2AA" : "#999"}
                      />
                      <ThemedText
                        style={[
                          styles.modalItemText,
                          { color: isActive ? "#20B2AA" : colors.primaryText },
                          isActive && styles.modalItemTextActive,
                        ]}
                      >
                        {item.name}
                      </ThemedText>
                    </View>
                    {isActive ? (
                      <MaterialIcons
                        name="check-circle"
                        size={22}
                        color="#20B2AA"
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 16,
    marginRight: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 8,
    fontSize: 16,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 16,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginRight: 12,
  },
  activeTabButton: {
    backgroundColor: "#20B2AA",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fff",
  },
  resultContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  resultText: {
    fontSize: 14,
    color: "#666",
  },
  resultHighlight: {
    color: "#20B2AA",
    fontWeight: "500",
  },
  resultCountButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultCount: {
    fontSize: 12,
    color: "#20B2AA",
    marginRight: 4,
  },
  courseList: {
    paddingHorizontal: 20,
    paddingBottom: 80, // Để không bị che bởi bottom tab bar
  },
  courseItem: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },
  courseImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#333",
  },
  courseImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333",
  },
  courseImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#222",
  },
  courseContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  courseCategory: {
    fontSize: 12,
    color: "#FF8C00", // Orange color
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  currentPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#20B2AA",
  },
  freePrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#27ae60",
  },
  originalPrice: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
  },
  courseStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  rating: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  studentCount: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  lessonCount: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  courseActions: {
    position: "absolute",
    top: 8,
    right: 8,
    alignItems: "center",
  },
  iconButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  // Styles cho các trạng thái
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  modalItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalItemText: {
    fontSize: 15,
    color: "#333",
  },
  modalItemTextActive: {
    color: "#20B2AA",
    fontWeight: "600",
  },
});

export default CourseListScreen;
