import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Course {
  id: string;
  title: string;
  category: string;
  originalPrice: number;
  currentPrice: number;
  rating: number;
  students: number;
}

interface RouteParams {
  categoryName: string;
}

const CourseListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { categoryName } = route.params as RouteParams;
  const [activeTab, setActiveTab] = useState("courses");
  const [searchText, setSearchText] = useState(
    categoryName || "Graphic Design"
  );
  const [savedCourses, setSavedCourses] = useState<{ [key: string]: boolean }>({
    // Khởi tạo với các khóa học đã được lưu
    "2": true, // ID của khóa học thứ 2
  });

  // Hàm xử lý khi người dùng nhấn vào bookmark
  const toggleBookmark = (courseId: string) => {
    setSavedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  // Danh sách khóa học mẫu
  const courses: Course[] = [
    {
      id: "1",
      title: "Graphic Design Advanced",
      category: "Graphic Design",
      originalPrice: 42,
      currentPrice: 28,
      rating: 4.2,
      students: 7830,
    },
    {
      id: "2",
      title: "Advance Diploma in Graphic Design",
      category: "Graphic Design",
      originalPrice: 56,
      currentPrice: 39,
      rating: 4.0,
      students: 12880,
    },
    {
      id: "3",
      title: "Graphic Design Advanced",
      category: "Graphic Design",
      originalPrice: 41,
      currentPrice: 37,
      rating: 4.2,
      students: 990,
    },
    {
      id: "4",
      title: "Web Developer concepts",
      category: "Web Development",
      originalPrice: 65,
      currentPrice: 55,
      rating: 4.5,
      students: 8200,
    },
  ];

  const renderCourseItem = ({ item }: { item: Course }) => (
    <View style={styles.courseItem}>
      <View style={styles.courseImageContainer}>
        <View style={styles.courseImagePlaceholder} />
      </View>
      <View style={styles.courseContent}>
        <ThemedText style={styles.courseCategory}>{item.category}</ThemedText>
        <ThemedText style={styles.courseTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <View style={styles.priceContainer}>
          <ThemedText style={styles.currentPrice}>
            ${item.currentPrice}
          </ThemedText>
          <ThemedText style={styles.originalPrice}>
            ${item.originalPrice}
          </ThemedText>
        </View>
        <View style={styles.courseStats}>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={14} color="#FFD700" />
            <ThemedText style={styles.rating}>{item.rating}</ThemedText>
          </View>
          <ThemedText style={styles.studentCount}>
            {item.students} Std
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
            color={savedCourses[item.id] ? "#20B2AA" : "#666"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Online Courses</ThemedText>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBarContainer}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search courses..."
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <MaterialIcons name="filter-list" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "courses" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("courses")}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "courses" && styles.activeTabText,
            ]}
          >
            Courses
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "mentors" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("mentors")}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "mentors" && styles.activeTabText,
            ]}
          >
            Mentors
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Result Count */}
      <View style={styles.resultContainer}>
        <ThemedText style={styles.resultText}>
          Result for{" "}
          <ThemedText style={styles.resultHighlight}>
            &quot;{searchText}&quot;
          </ThemedText>
        </ThemedText>
        <TouchableOpacity style={styles.resultCountButton}>
          <ThemedText style={styles.resultCount}>2480 FOUNDS</ThemedText>
          <MaterialIcons name="chevron-right" size={20} color="#20B2AA" />
        </TouchableOpacity>
      </View>

      {/* Course List */}
      <FlatList
        data={courses}
        renderItem={renderCourseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.courseList}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
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
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 24,
    paddingHorizontal: 16,
    marginRight: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 8,
    fontSize: 16,
    color: "#333",
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
    backgroundColor: "#f0f0f0",
    marginRight: 12,
  },
  activeTabButton: {
    backgroundColor: "#20B2AA",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
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
    backgroundColor: "#fff",
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
    color: "#333",
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E8BC0", // Blue color
    marginRight: 8,
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
  // Các style khác có thể được thêm vào đây khi cần
});

export default CourseListScreen;
