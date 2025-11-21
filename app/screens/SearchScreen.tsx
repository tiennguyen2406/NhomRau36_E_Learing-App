import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useThemeColors } from "../../hooks/use-theme-colors";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SearchHistory {
  id: string;
  query: string;
}

const recentSearches: SearchHistory[] = [
  { id: "1", query: "3D Design" },
  { id: "2", query: "Graphic Design" },
  { id: "3", query: "Programming" },
  { id: "4", query: "SEO & Marketing" },
  { id: "5", query: "Web Development" },
  { id: "6", query: "Office Productivity" },
  { id: "7", query: "Personal Development" },
  { id: "8", query: "Finance & Accounting" },
  { id: "9", query: "HR Management" },
];

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const [searchText, setSearchText] = useState("");

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
    searchContainer: {
      backgroundColor: colors.headerBackground,
    },
    searchBar: {
      backgroundColor: colors.searchBackground,
    },
    searchInput: {
      color: colors.primaryText,
    },
    sectionTitle: {
      color: colors.primaryText,
    },
    historyItem: {
      borderBottomColor: colors.borderColor,
    },
    historyText: {
      color: colors.primaryText,
    },
  }), [colors]);

  const handleSearch = () => {
    if (searchText.trim()) {
      navigation.navigate("CourseList", {
        searchQuery: searchText.trim(),
        categoryName: `Kết quả tìm kiếm: "${searchText.trim()}"`,
        categoryId: "all",
      } as never);
    }
  };

  const handleSearchHistoryClick = (query: string) => {
    setSearchText(query);
    navigation.navigate("CourseList", {
      searchQuery: query,
      categoryName: `Kết quả tìm kiếm: "${query}"`,
      categoryId: "all",
    } as never);
  };

  const renderSearchHistoryItem = ({ item }: { item: SearchHistory }) => (
    <TouchableOpacity
      style={[styles.historyItem, dynamicStyles.historyItem]}
      onPress={() => handleSearchHistoryClick(item.query)}
    >
      <ThemedText style={[styles.historyText, dynamicStyles.historyText]}>{item.query}</ThemedText>
      <TouchableOpacity style={styles.removeButton}>
        <MaterialIcons name="close" size={18} color={colors.placeholderText} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>Search</ThemedText>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
        <View style={[styles.searchBar, dynamicStyles.searchBar]}>
          <MaterialIcons name="search" size={20} color={colors.placeholderText} />
          <TextInput
            style={[styles.searchInput, dynamicStyles.searchInput]}
            placeholder="Tìm kiếm..."
            placeholderTextColor={colors.placeholderText}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <MaterialIcons name="search" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Recent Search Section */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Recents Search</ThemedText>
          <TouchableOpacity>
            <ThemedText style={styles.viewAllText}>SEE ALL {">"}</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Search History List */}
        <FlatList
          data={recentSearches}
          renderItem={renderSearchHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
        />
      </View>
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
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
  },
  recentSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  viewAllText: {
    fontSize: 14,
    color: "#20B2AA",
  },
  historyList: {
    paddingBottom: 20,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  historyText: {
    fontSize: 16,
  },
  removeButton: {
    padding: 4,
  },
});

export default SearchScreen;
