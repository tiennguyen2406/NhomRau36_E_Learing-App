import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getCategories, updateAllCategoryCounts } from "../api/api";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Category {
  id: string;
  name: string;
  iconUrl?: string;
  description?: string;
  courseCount?: number;
  isActive?: boolean;
}

const getIconSource = (categoryName: string) => {
  switch (categoryName) {
    case "3D Design": 
      return require("../../assets/images/3DDesignICON.png");
    case "Graphic Design": 
      return require("../../assets/images/GraphicDesignICON.png");
    case "Web Development": 
      return require("../../assets/images/WebDevelopmentICON.png");
    case "SEO & Marketing": 
      return require("../../assets/images/SEO&MarketingICON.png");
    case "Finance & Accounting": 
      return require("../../assets/images/Finance&AccountingICON.png");
    case "Personal Development": 
      return require("../../assets/images/PersonalDevelopmentICON.png");
    case "Office Productivity": 
      return require("../../assets/images/OfficeProductivityICON.png");
    case "HR Management": 
      return require("../../assets/images/HRManagementICON.png");
    default: 
      return require("../../assets/images/WebDevelopmentICON.png");
  }
};

const CategoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error("Lỗi khi tải danh mục:", err);
        setError("Không thể tải danh mục, vui lòng thử lại sau");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  const renderCategoryItem = ({
    item,
    index,
  }: {
    item: Category;
    index: number;
  }) => {
    const isEven = index % 2 === 0;
    const iconSource = getIconSource(item.name);

    return (
      <View
        style={[
          styles.categoryItemContainer,
          isEven ? { marginRight: 16 } : {},
        ]}
      >
        <TouchableOpacity
          style={styles.categoryItem}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate("CourseList", { categoryName: item.name, categoryId: item.id })
          }
        >
          <View style={styles.iconContainer}>
            <Image
              source={iconSource}
              style={styles.categoryIcon}
              resizeMode="contain"
            />
          </View>
          <ThemedText style={styles.categoryName}>{item.name}</ThemedText>
          {item.courseCount !== undefined && (
            <ThemedText style={styles.courseCount}>{item.courseCount} khóa học</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <ThemedText style={{marginTop: 16}}>Đang tải danh mục...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <MaterialIcons name="error-outline" size={40} color="#e74c3c" />
        <ThemedText style={{marginTop: 16}}>{error}</ThemedText>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            setLoading(true);
            setError("");
            getCategories()
              .then(data => setCategories(data))
              .catch(err => setError("Không thể tải danh mục"))
              .finally(() => setLoading(false));
          }}
        >
          <ThemedText style={styles.retryText}>Thử lại</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Danh mục</ThemedText>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={async () => {
            try {
              setUpdating(true);
              const result = await updateAllCategoryCounts();
              // Sau khi cập nhật, tải lại danh sách danh mục
              const updatedCategories = await getCategories();
              setCategories(updatedCategories);
              // Hiển thị thông báo thành công nếu muốn
            } catch (error) {
              console.error("Lỗi khi cập nhật số lượng khóa học:", error);
              setError("Không thể cập nhật số lượng khóa học");
            } finally {
              setUpdating(false);
            }
          }}
          disabled={updating}
        >
          <MaterialIcons 
            name="refresh" 
            size={22} 
            color={updating ? "#999" : "#20B2AA"} 
          />
          {updating && <ActivityIndicator size="small" color="#20B2AA" style={styles.updateIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm..."
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <MaterialIcons name="search" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Categories Grid */}
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.categoriesContainer}
        columnWrapperStyle={styles.categoryRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="category" size={40} color="#ccc" />
            <ThemedText style={styles.emptyText}>Không có danh mục nào</ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  refreshButton: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  updateIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    height: 48,
    backgroundColor: "#f5f5f5",
    borderRadius: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
  },
  categoriesContainer: {
    padding: 16,
    paddingBottom: 80, // Để không bị che bởi bottom tab bar
  },
  categoryRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  categoryItemContainer: {
    flex: 1,
    maxWidth: "48%", // Để có khoảng cách giữa các cột
  },
  categoryItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    aspectRatio: 1, // Để tạo hình vuông
  },
  iconContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryIcon: {
    width: 50,
    height: 50,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: "center",
    color: "#333",
    marginBottom: 4,
  },
  courseCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#20B2AA',
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default CategoryScreen;
