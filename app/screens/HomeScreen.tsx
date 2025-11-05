import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getCategories, getCourses, getCoursesByCategory, getUsers, updateAllCategoryCounts } from '../api/api';

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

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('currentUsername');
        if (stored && isMounted) setUsername(stored);
      } catch {}
    })();
    return () => { isMounted = false; };
  }, []);

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

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity style={styles.courseCard} activeOpacity={0.8} onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}>
      <View style={styles.courseImageContainer}>
        { (item.thumbnailUrl || item.image) ? (
          <Image source={{ uri: (item.thumbnailUrl || item.image) as string }} style={styles.courseImage} resizeMode="cover" />
        ) : (
          <View style={styles.courseImagePlaceholder} />
        ) }
        <TouchableOpacity style={styles.bookmarkButton}>
          <MaterialIcons name="bookmark-border" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      <Text style={styles.courseCategory} numberOfLines={1}>{item.categoryName || item.category || 'Course'}</Text>
      <Text style={styles.courseTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.courseStats}>
        <Text style={styles.lessonCount}>{item.totalLessons} bài</Text>
        <View style={styles.ratingContainer}>
          <MaterialIcons name="star" size={14} color="#FFD700" />
          <Text style={styles.rating}>{item.rating}</Text>
        </View>
        <Text style={styles.studentCount}>{item.students} Std</Text>
      </View>
    </TouchableOpacity>
  );

  const renderInstructor = ({ item }: { item: Instructor }) => (
    <TouchableOpacity
      style={styles.instructorItem}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('InstructorDetail', { instructorId: item.uid })}
    >
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.instructorAvatar} />
      ) : (
        <View style={styles.instructorAvatar}>
          <Text style={styles.instructorInitial}>{(item.fullName || "?").charAt(0)}</Text>
        </View>
      )}
      <Text style={styles.instructorName} numberOfLines={1}>{item.fullName}</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Đang tải...</Text></View>;
  if (error) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(false)} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Xin chào, {username}</Text>
            <Text style={styles.subGreeting}>Bạn muốn học gì vào hôm nay?</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <MaterialIcons
              name="notifications-none"
              size={24}
              color="#20B2AA"
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate("Search")}
            activeOpacity={0.8}
          >
            <MaterialIcons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm..."
              placeholderTextColor="#999"
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
                  <Text style={styles.bannerDiscount}>SPECIAL</Text>
                  <Text style={styles.bannerTitle}>{item.title}</Text>
                  <Text style={styles.bannerDescription}>{item.desc}</Text>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Khám phá</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Category")}>
              <Text style={styles.viewAllText}>XEM TẤT CẢ</Text>
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
                  selectedCategory === index && styles.categoryChipActive,
                ]}
                onPress={() => {
                  setSelectedCategory(index);
                  if (category?.id && category?.name) {
                    navigation.navigate('CourseList', { categoryName: category.name, categoryId: category.id });
                  }
                }}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === index && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
                <Text
                  style={[
                    styles.categoryCountText,
                    selectedCategory === index && styles.categoryCountTextActive,
                  ]}
                >
                  {category.courseCount ?? 0} khóa học
                </Text>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Khóa học phổ biến</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>XEM TẤT CẢ</Text>
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
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === index && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {popularCourses.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', minHeight: 200 }}>
              <Text style={{ color: '#999' }}>Không có khóa học nào (count: {popularCourses.length})</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 5 }}>
                Filter: {selectedFilter}, Categories: {categories.length}
              </Text>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Người hướng dẫn hàng đầu</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MentorList')}>
              <Text style={styles.viewAllText}>XEM TẤT CẢ</Text>
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
    </View>
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
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
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
    color: "#333",
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
    backgroundColor: "#f5f5f5",
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
    color: "#444",
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
    color: "#888",
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
    backgroundColor: "#f5f5f5",
  },
  filterChipActive: {
    backgroundColor: "#20B2AA",
  },
  filterText: {
    fontSize: 14,
    color: "#666",
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
    backgroundColor: "#fff",
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
    color: "#333",
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
    color: "#666",
    marginLeft: 2,
  },
  studentCount: {
    fontSize: 12,
    color: "#666",
  },
  instructorsContainer: {
    paddingLeft: 20,
  },
  instructorItem: {
    alignItems: "center",
    marginRight: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  instructorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  instructorInitial: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  instructorName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    textAlign: 'center',
  },
});
