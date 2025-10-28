import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Category {
  id: string;
  name: string;
  iconSource: any;
}

const CategoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const categories: Category[] = [
    {
      id: "1",
      name: "3D Design",
      iconSource: require("../../assets/images/3DDesignICON.png"),
    },
    {
      id: "2",
      name: "Graphic Design",
      iconSource: require("../../assets/images/GraphicDesignICON.png"),
    },
    {
      id: "3",
      name: "Web Development",
      iconSource: require("../../assets/images/WebDevelopmentICON.png"),
    },
    {
      id: "4",
      name: "SEO & Marketing",
      iconSource: require("../../assets/images/SEO&MarketingICON.png"),
    },
    {
      id: "5",
      name: "Finance & Accounting",
      iconSource: require("../../assets/images/Finance&AccountingICON.png"),
    },
    {
      id: "6",
      name: "Personal Development",
      iconSource: require("../../assets/images/PersonalDevelopmentICON.png"),
    },
    {
      id: "7",
      name: "Office Productivity",
      iconSource: require("../../assets/images/OfficeProductivityICON.png"),
    },
    {
      id: "8",
      name: "HR Management",
      iconSource: require("../../assets/images/HRManagementICON.png"),
    },
  ];

  const renderCategoryItem = ({
    item,
    index,
  }: {
    item: Category;
    index: number;
  }) => {
    const isEven = index % 2 === 0;

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
            navigation.navigate("CourseList", { categoryName: item.name })
          }
        >
          <View style={styles.iconContainer}>
            <Image
              source={item.iconSource}
              style={styles.categoryIcon}
              resizeMode="contain"
            />
          </View>
          <ThemedText style={styles.categoryName}>{item.name}</ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>All Category</ThemedText>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for..."
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
    textAlign: "center",
    color: "#333",
  },
});

export default CategoryScreen;
