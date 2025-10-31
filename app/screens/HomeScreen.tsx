import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
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
import { getCategories, getCourses, getCoursesByCategory, getUsers } from '../api/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Course {
  id: string;
  title: string;
  category: string;
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
      const [cat, cou, users] = await Promise.all([
        getCategories(),
        getCourses(),
        getUsers(),
      ]);
      setCategories(cat);
      setCourses(cou);
      setPopularCourses(cou);
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

  const courseFilters = categories.length ? ["Tất cả", ...categories.map(c => c.name)] : ["Tất cả"];

  // Refetch popular courses when filter changes (backend by category)
  useEffect(() => {
    const fetchByFilter = async () => {
      try {
        if (selectedFilter === 0) {
          const all = await getCourses();
          setPopularCourses(all);
        } else {
          const categoryIndex = selectedFilter - 1; // because 0 is "Tất cả"
          const category = categories[categoryIndex];
          if (!category) return;
          const byCategory = await getCoursesByCategory(category.id);
          setPopularCourses(byCategory);
        }
      } catch (e) {
        // Keep previous data on error; optionally set error toast/state
      }
    };
    fetchByFilter();
  }, [selectedFilter, categories]);

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity style={styles.courseCard} activeOpacity={0.8} onPress={() => navigation.navigate('CourseDetail' as never, { courseId: item.id } as never)}>
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
      <Text style={styles.courseCategory} numberOfLines={2} ellipsizeMode="tail">{item.description}</Text>
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
    <View style={styles.instructorItem}>
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.instructorAvatar} />
      ) : (
        <View style={styles.instructorAvatar}>
          <Text style={styles.instructorInitial}>{(item.fullName || "?").charAt(0)}</Text>
        </View>
      )}
      <Text style={styles.instructorName} numberOfLines={1}>{item.fullName}</Text>
    </View>
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

        {/* Banner */}
        <LinearGradient
          colors={["#20B2AA", "#2E8B57"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerDiscount}>25% OFF*</Text>
            <Text style={styles.bannerTitle}>Ưu đãi hôm nay!</Text>
            <Text style={styles.bannerDescription}>
              Nhận ưu đãi giảm giá cho mỗi khóa học — chỉ áp dụng trong hôm nay
              thôi!
            </Text>
          </View>
          <View style={styles.bannerDots}>
            <View style={styles.bannerDot} />
            <View style={styles.bannerDot} />
            <View style={styles.bannerDot} />
          </View>
        </LinearGradient>

        {/* Khám phá Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Khám phá</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Category")}>
              <Text style={styles.viewAllText}>XEM TẤT CẢ {">"}</Text>
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
                onPress={() => setSelectedCategory(index)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === index && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
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
              <Text style={styles.viewAllText}>XEM TẤT CẢ {">"}</Text>
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
                onPress={() => setSelectedFilter(index)}
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
          <FlatList
            data={popularCourses}
            renderItem={renderCourseCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.coursesContainer}
          />
        </View>

        {/* Người hướng dẫn hàng đầu Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Người hướng dẫn hàng đầu</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>XEM TẤT CẢ {">"}</Text>
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
    height: 128,
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
    fontSize: 15,
    color: "#444",
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 116,
    minHeight: 40,
    lineHeight: 20,
    marginBottom: 0,
    marginTop: 4,
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'hidden',
  },
  categoryTextActive: {
    color: "#fff",
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
    height: 120,
    marginBottom: 12,
  },
  courseImagePlaceholder: {
    flex: 1,
    backgroundColor: "#333",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  courseImage: {
    flex: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
    color: "#999",
    marginBottom: 4,
    lineHeight: 16,
    minHeight: 32,
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
    marginRight: 20,
  },
  instructorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  instructorInitial: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  instructorName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
});
