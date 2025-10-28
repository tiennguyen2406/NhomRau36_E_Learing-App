import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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
  const [searchText, setSearchText] = useState("Graphic Design");

  const renderSearchHistoryItem = ({ item }: { item: SearchHistory }) => (
    <View style={styles.historyItem}>
      <ThemedText style={styles.historyText}>{item.query}</ThemedText>
      <TouchableOpacity style={styles.removeButton}>
        <MaterialIcons name="close" size={18} color="#999" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Search</ThemedText>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <MaterialIcons name="search" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Recent Search Section */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Recents Search</ThemedText>
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
    backgroundColor: "#fff",
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
    color: "#333",
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
    color: "#333",
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
    borderBottomColor: "#f0f0f0",
  },
  historyText: {
    fontSize: 16,
    color: "#555",
  },
  removeButton: {
    padding: 4,
  },
});

export default SearchScreen;
