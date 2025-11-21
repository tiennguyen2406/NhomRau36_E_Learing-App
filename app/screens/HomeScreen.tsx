import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import { ThemedView } from "../../components/themed-view";
import { ThemedText } from "../../components/themed-text";
import { RootStackParamList } from "../navigation/AppNavigator";
import { database } from "../firebase";
import { DataSnapshot, onValue, off, ref } from "firebase/database";
import { getCategories, getCourses, getCoursesByCategory, getUsers, updateAllCategoryCounts, getUserByUsername, saveCourse, unsaveCourse, getSavedCourses } from '../api/api';
import { useThemeColors } from "../../hooks/use-theme-colors";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Course {
  id: string;
  title: string;
  category: string;
  categoryName?: string;
  description?: string;
  totalLessons: number;
  rating: number;
  students: number;
  image?: string;
  thumbnailUrl?: string;
}

interface Instructor {
  uid: string;
  fullName: string;
  profileImage?: string;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [username, setUsername] = useState<string>("KhaiTien");
  const [categories, setCategories] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [popularCourses, setPopularCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // Auto promo carousel
  const promotions = [
    { id: "promo-1", title: "Ưu đãi hôm nay!", desc: "Giảm 25% cho khóa học hot." },
    { id: "promo-2", title: "Giảm giá cuối tuần", desc: "Nhận voucher 50k cho đơn đầu tiên." },
    { id: "promo-3", title: "Học nhóm siêu rẻ", desc: "Mua 2 tặng 1 cho bạn bè." },
  ];
  const promoRef = useRef<FlatList>(null as any);
  const [promoIndex, setPromoIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [savedCourses, setSavedCourses] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('currentUsername');
        if (stored && isMounted) setUsername(stored);
        if (stored) {
          try {
            const user = await getUserByUsername(stored);
            if (user?.uid || user?.id) {
              setCurrentUserId(String(user.uid || user.id));
            }
          } catch {}
        }
      } catch {}
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!currentUserId || !database) return;
    const notifRef = ref(database, `notifications/${currentUserId}`);
    const unsubscribe = onValue(
      notifRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        if (!data) {
          setHasUnreadNotifications(false);
          return;
        }
        const hasUnread = Object.values(data).some(
          (value: any) => value?.status !== "read"
        );
        setHasUnreadNotifications(hasUnread);
      },
      () => setHasUnreadNotifications(false)
    );
    return () => {
      off(notifRef);
    };
  }, [currentUserId]);

  const fetchAll = async (isInitial: boolean = false) => {
    try {
      if (isInitial) setLoading(true); else setRefreshing(true);
      
      // Cập nhật số lượng khóa học cho tất cả danh mục trước
      try {
        await updateAllCategoryCounts();
        console.log('✅ Đã cập nhật courseCount cho tất cả danh mục');
      } catch (updateErr) {
        console.log('⚠️ Không thể tự động cập nhật courseCount, tiếp tục tải dữ liệu...');
      }
      
      const [cat, cou, users] = await Promise.all([
        getCategories(),
        getCourses(),
        getUsers(),
      ]);
      // Sort categories để đảm bảo thứ tự nhất quán
      const sortedCategories = [...(cat || [])].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setCategories(sortedCategories);
      console.log('Categories với courseCount:', sortedCategories.map(c => `${c.name}: ${c.courseCount || 0} khóa học`));
      setCourses(cou);
      setPopularCourses(cou);
      setSelectedFilter(0); // Reset filter về "Tất cả" khi load lại
      const instructorUsers = (users || []).filter((u: any) => (u.role || "").toLowerCase() === "instructor");
      setInstructors(instructorUsers.map((u: any) => ({ uid: u.uid, fullName: u.fullName || u.username || "Instructor", profileImage: u.profileImage })));
    } catch (err) {
      setError("Không tải được dữ liệu. Kiểm tra kết nối backend!");
    } finally {
      if (isInitial) setLoading(false); else setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll(true);
  }, []);

  // Auto-rotate promotions
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (promoIndex + 1) % promotions.length;
      setPromoIndex(next);
      promoRef.current?.scrollToIndex?.({ index: next, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [promoIndex]);

  const courseFilters = categories.length ? ["Tất cả", ...categories.map(c => c.name)] : ["Tất cả"];

  // Reset selectedFilter nếu không hợp lệ khi categories thay đổi
  useEffect(() => {
    const maxFilterIndex = categories.length; // "Tất cả" = 0, categories = 1..n
    if (selectedFilter > maxFilterIndex && maxFilterIndex >= 0) {
      setSelectedFilter(0);
    }
  }, [categories.length]); // Chỉ check khi categories.length thay đổi

  // Refetch popular courses when filter changes (backend by category)
  useEffect(() => {
    // Chờ categories load xong
    if (categories.length === 0 && selectedFilter > 0) return;
    
    const fetchByFilter = async () => {
      try {
        if (selectedFilter === 0) {
          const all = await getCourses();
          setPopularCourses(all);
        } else {
          const categoryIndex = selectedFilter - 1; // because 0 is "Tất cả"
          if (categoryIndex < 0 || categoryIndex >= categories.length) {
            // Index không hợp lệ, reset về "Tất cả"
            console.warn(`Invalid categoryIndex: ${categoryIndex}, categories.length: ${categories.length}`);
            setSelectedFilter(0);
            const all = await getCourses();
            setPopularCourses(all);
            return;
          }
          const category = categories[categoryIndex];
          if (!category || !category.id) {
            // Category không hợp lệ, reset về "Tất cả"
            console.warn(`Invalid category at index ${categoryIndex}:`, category);
            setSelectedFilter(0);
            const all = await getCourses();
            setPopularCourses(all);
            return;
          }
          console.log(`Fetching courses for category: ${category.name} (ID: ${category.id})`);
          const byCategory = await getCoursesByCategory(category.id);
          console.log(`Found ${byCategory?.length || 0} courses for category ${category.name}`);
          console.log(`Courses data:`, byCategory?.map((c: any) => ({ id: c.id, title: c.title })) || []);
          // Tạo array mới để đảm bảo re-render
          const coursesArray = Array.isArray(byCategory) ? [...byCategory] : [];
          console.log(`Setting popularCourses with ${coursesArray.length} courses`);
          setPopularCourses(coursesArray);
        }
      } catch (e: any) {
        console.error("Error fetching courses by filter:", e);
        // Giữ dữ liệu cũ khi lỗi
      }
    };
    fetchByFilter();
  }, [selectedFilter, categories]);

  // Debug: Log popularCourses khi thay đổi
  useEffect(() => {
    console.log(`popularCourses updated: ${popularCourses.length} courses`);
    if (popularCourses.length > 0) {
      console.log('First course:', popularCourses[0]?.title, popularCourses[0]?.id);
    }
  }, [popularCourses]);

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

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity style={[styles.courseCard, dynamicStyles.courseCard]} activeOpacity={0.8} onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}>
      <View style={styles.courseImageContainer}>
        { (item.thumbnailUrl || item.image) ? (
          <Image source={{ uri: (item.thumbnailUrl || item.image) as string }} style={styles.courseImage} resizeMode="cover" />
        ) : (
          <View style={styles.courseImagePlaceholder} />
        ) }
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleBookmark(item.id);
          }}
        >
          <MaterialIcons
            name={savedCourses[item.id] ? "bookmark" : "bookmark-border"}
            size={20}
            color={savedCourses[item.id] ? "#20B2AA" : colors.secondaryText}
          />
        </TouchableOpacity>
      </View>
      <ThemedText style={[styles.courseCategory, dynamicStyles.courseCategory]} numberOfLines={1}>{item.categoryName || item.category || 'Course'}</ThemedText>
      <ThemedText style={[styles.courseTitle, dynamicStyles.courseTitle]} numberOfLines={2}>
        {item.title}
      </ThemedText>
      <View style={styles.courseStats}>
        <ThemedText style={[styles.lessonCount, dynamicStyles.lessonCount]}>{item.totalLessons} bài</ThemedText>
        <View style={styles.ratingContainer}>
          <MaterialIcons name="star" size={14} color="#FFD700" />
          <ThemedText style={[styles.rating, dynamicStyles.rating]}>{item.rating}</ThemedText>
        </View>
        <ThemedText style={[styles.studentCount, dynamicStyles.studentCount]}>{item.students} Std</ThemedText>
      </View>
    </TouchableOpacity>
  );

  const renderInstructor = ({ item }: { item: Instructor }) => (
    <TouchableOpacity
      style={[styles.instructorItem, dynamicStyles.instructorItem]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('InstructorDetail', { instructorId: item.uid })}
    >
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.instructorAvatar} />
      ) : (
        <View style={[styles.instructorAvatar, dynamicStyles.instructorAvatar]}>
          <ThemedText style={styles.instructorInitial}>{(item.fullName || "?").charAt(0)}</ThemedText>
        </View>
      )}
      <ThemedText style={[styles.instructorName, dynamicStyles.instructorName]} numberOfLines={1}>{item.fullName}</ThemedText>
    </TouchableOpacity>
  );

  // Dynamic styles dựa trên theme
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.containerBackground,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 20,
      backgroundColor: colors.headerBackground,
    },
    greeting: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.primaryText,
      marginBottom: 4,
    },
    subGreeting: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.searchBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: colors.primaryText,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primaryText,
    },
    viewAllText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.tint,
    },
    courseCategory: {
      fontSize: 12,
      color: "#FF8C00",
      marginBottom: 4,
    },
    courseTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.primaryText,
      marginBottom: 6,
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
    },
    instructorName: {
      fontSize: 12,
      color: colors.primaryText,
      marginTop: 4,
      textAlign: "center",
    },
    categoryText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primaryText,
    },
    categoryCountText: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 2,
    },
    filterText: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.primaryText,
    },
    emptyText: {
      color: colors.secondaryText,
    },
    categoryChip: {
      backgroundColor: colors.tabBackground,
    },
    filterChip: {
      backgroundColor: colors.tabBackground,
    },
    courseCard: {
      backgroundColor: colors.cardBackground,
    },
    section: {
      backgroundColor: colors.sectionBackground,
    },
    instructorItem: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    instructorAvatar: {
      backgroundColor: colors.tint,
    },
  }), [colors]);

  if (loading) return (
    <ThemedView style={{flex:1,justifyContent:'center',alignItems:'center'}}>
      <ThemedText>Đang tải...</ThemedText>
    </ThemedView>
  );
  if (error) return (
    <ThemedView style={{flex:1,justifyContent:'center',alignItems:'center'}}>
      <ThemedText>{error}</ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, dynamicStyles.container]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(false)} />}
      >
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <View style={styles.greetingContainer}>
            <ThemedText style={[styles.greeting, dynamicStyles.greeting]}>Xin chào, {username}</ThemedText>
            <ThemedText style={[styles.subGreeting, dynamicStyles.subGreeting]}>Bạn muốn học gì vào hôm nay?</ThemedText>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <MaterialIcons
              name={hasUnreadNotifications ? "notifications-active" : "notifications-none"}
              size={24}
              color="#20B2AA"
            />
            {hasUnreadNotifications ? <View style={styles.notificationBadge} /> : null}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={[styles.searchBar, dynamicStyles.searchBar]}
            onPress={() => navigation.navigate("Search")}
            activeOpacity={0.8}
          >
            <MaterialIcons name="search" size={20} color={colors.placeholderText} />
            <TextInput
              style={[styles.searchInput, dynamicStyles.searchInput]}
              placeholder="Tìm kiếm..."
              placeholderTextColor={colors.placeholderText}
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <MaterialIcons name="tune" size={20} color="#20B2AA" />
          </TouchableOpacity>
        </View>

        {/* Banner Carousel */}
        <View style={{ height: 150 }}>
          <FlatList
            ref={promoRef}
            data={promotions}
            keyExtractor={(i) => i.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={screenWidth}
            decelerationRate="fast"
            getItemLayout={(data, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
            renderItem={({ item }) => (
              <LinearGradient
                colors={["#20B2AA", "#2E8B57"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.banner, { width: screenWidth - 40 }]}
              >
                <View style={styles.bannerContent}>
                  <ThemedText style={styles.bannerDiscount}>SPECIAL</ThemedText>
                  <ThemedText style={styles.bannerTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.bannerDescription}>{item.desc}</ThemedText>
                </View>
              </LinearGradient>
            )}
            onMomentumScrollEnd={(e) => {
              const width = screenWidth || e.nativeEvent.layoutMeasurement.width;
              const index = Math.round((e.nativeEvent.contentOffset.x || 0) / width);
              if (!Number.isNaN(index)) setPromoIndex(index);
            }}
          />
          <View style={styles.bannerDots}>
            {promotions.map((p, i) => (
              <View key={p.id} style={[styles.bannerDot, i === promoIndex && { opacity: 1 }]} />
            ))}
          </View>
        </View>

        {/* Khám phá Section */}
        <View style={[styles.section, dynamicStyles.section]}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Khám phá</ThemedText>
            <TouchableOpacity onPress={() => navigation.navigate("Category")}>
              <ThemedText style={[styles.viewAllText, dynamicStyles.viewAllText]}>XEM TẤT CẢ</ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {categories.map((category, index) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  dynamicStyles.categoryChip,
                  selectedCategory === index && styles.categoryChipActive,
                ]}
                onPress={() => {
                  setSelectedCategory(index);
                  if (category?.id && category?.name) {
                    navigation.navigate('CourseList', { categoryName: category.name, categoryId: category.id });
                  }
                }}
              >
                <ThemedText
                  style={[
                    styles.categoryText,
                    dynamicStyles.categoryText,
                    selectedCategory === index && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.categoryCountText,
                    dynamicStyles.categoryCountText,
                    selectedCategory === index && styles.categoryCountTextActive,
                  ]}
                >
                  {category.courseCount ?? 0} khóa học
                </ThemedText>
                {category.iconUrl ? (
                  <Image
                    source={{ uri: category.iconUrl }}
                    style={styles.categoryImage}
                    resizeMode="cover"
                  />
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Khóa học phổ biến Section */}
        <View style={[styles.section, dynamicStyles.section]}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Khóa học phổ biến</ThemedText>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("CourseList", {
                  categoryName: "Tất cả khóa học",
                  categoryId: "all",
                })
              }
            >
              <ThemedText style={[styles.viewAllText, dynamicStyles.viewAllText]}>XEM TẤT CẢ</ThemedText>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
          >
            {courseFilters.map((filter, index) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  dynamicStyles.filterChip,
                  selectedFilter === index && styles.filterChipActive,
                ]}
                onPress={() => {
                  console.log(`Filter selected: "${filter}" at index ${index}`);
                  if (index > 0) {
                    const categoryIndex = index - 1;
                    const category = categories[categoryIndex];
                    console.log(`Category at index ${categoryIndex}:`, category ? `${category.name} (${category.id})` : 'undefined');
                  }
                  setSelectedFilter(index);
                }}
              >
                <ThemedText
                  style={[
                    styles.filterText,
                    dynamicStyles.filterText,
                    selectedFilter === index && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {popularCourses.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', minHeight: 200 }}>
              <ThemedText style={[dynamicStyles.emptyText]}>Không có khóa học nào (count: {popularCourses.length})</ThemedText>
              <ThemedText style={[dynamicStyles.emptyText, { fontSize: 12, marginTop: 5 }]}>
                Filter: {selectedFilter}, Categories: {categories.length}
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={popularCourses}
              renderItem={renderCourseCard}
              keyExtractor={(item) => item.id || Math.random().toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.coursesContainer}
              extraData={selectedFilter}
              nestedScrollEnabled={true}
            />
          )}
        </View>

        {/* Người hướng dẫn hàng đầu Section */}
        <View style={[styles.section, dynamicStyles.section]}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Người hướng dẫn hàng đầu</ThemedText>
            <TouchableOpacity onPress={() => navigation.navigate('MentorList')}>
              <ThemedText style={[styles.viewAllText, dynamicStyles.viewAllText]}>XEM TẤT CẢ</ThemedText>
            </TouchableOpacity>
          </View>
          <FlatList
            data={instructors}
            renderItem={renderInstructor}
            keyExtractor={(item) => item.uid}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.instructorsContainer}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: "#666",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ff4d4f",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  banner: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    position: "relative",
  },
  bannerContent: {
    marginBottom: 20,
  },
  bannerDiscount: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 8,
  },
  bannerDescription: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    lineHeight: 20,
  },
  bannerDots: {
    flexDirection: "row",
    justifyContent: "center",
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    marginHorizontal: 3,
    opacity: 0.6,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  viewAllText: {
    fontSize: 14,
    color: "#20B2AA",
    fontWeight: "500",
  },
  categoriesContainer: {
    paddingLeft: 20,
  },
  categoryChip: {
    width: 120,
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 18,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: "#20B2AA",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 116,
    lineHeight: 18,
    marginBottom: 0,
    marginTop: 6,
    paddingHorizontal: 4,
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'hidden',
  },
  categoryTextActive: {
    color: "#fff",
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  categoryCountTextActive: {
    color: "#fff",
    opacity: 0.9,
  },
  categoryImage: {
    width: 54,
    height: 54,
    borderRadius: 5,
    marginTop: 10,
    backgroundColor: '#eee',
  },
  filtersContainer: {
    paddingLeft: 20,
    marginBottom: 15,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  filterChipActive: {
    backgroundColor: "#20B2AA",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#fff",
  },
  coursesContainer: {
    paddingLeft: 20,
  },
  courseCard: {
    width: 200,
    marginRight: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseImageContainer: {
    position: "relative",
    width: "100%",
    height: 120,
    marginBottom: 12,
    overflow: "hidden",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
  bookmarkButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  courseCategory: {
    fontSize: 12,
    color: "#FF8C00",
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  courseStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  lessonCount: {
    fontSize: 12,
    color: "#20B2AA",
    fontWeight: "500",
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  rating: {
    fontSize: 12,
    marginLeft: 2,
  },
  studentCount: {
    fontSize: 12,
  },
  instructorsContainer: {
    paddingLeft: 20,
  },
  instructorItem: {
    alignItems: "center",
    marginRight: 16,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructorAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#20B2AA",
  },
  instructorInitial: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  instructorName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: 'center',
    maxWidth: 100,
  },
});
