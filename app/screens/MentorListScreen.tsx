import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getUsers, getCourses } from "../api/api";
import { useThemeColors } from "../../hooks/use-theme-colors";
import { ThemedText } from "../../components/themed-text";

type Props = NativeStackScreenProps<RootStackParamList, "MentorList">;

interface InstructorItem {
  uid: string;
  fullName: string;
  username?: string;
  profileImage?: string;
}

const MentorListScreen: React.FC<Props> = ({ navigation }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<InstructorItem[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<string[]>(["Tất cả"]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("Tất cả");
  const colors = useThemeColors();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: colors.containerBackground },
        header: { backgroundColor: colors.headerBackground },
        headerTitle: { color: colors.primaryText },
        searchContainer: { backgroundColor: colors.headerBackground, borderBottomColor: colors.borderColor },
        searchBar: { backgroundColor: colors.searchBackground, borderColor: colors.borderColor },
        searchInput: { color: colors.primaryText },
        resultText: { color: colors.secondaryText },
        resultHighlight: { color: colors.tint || "#20B2AA" },
        resultCountText: { color: colors.tint || "#20B2AA" },
        item: { backgroundColor: colors.cardBackground },
        name: { color: colors.primaryText },
        sub: { color: colors.secondaryText },
        modalContent: { backgroundColor: colors.cardBackground },
        modalTitle: { color: colors.primaryText },
        modalItemText: { color: colors.primaryText },
        modalItemTextActive: { color: colors.tint || "#20B2AA" },
        modalDivider: { backgroundColor: colors.borderColor },
      }),
    [colors]
  );

  useEffect(() => {
    (async () => {
      try {
        const [users, courses] = await Promise.all([getUsers(), getCourses()]);

        // Map instructor username -> top/matched category name by counting
        const instructorToCategory = new Map<string, string>();
        const categoryCountByInstructor: Record<string, Record<string, number>> = {};

        (courses || []).forEach((c: any) => {
          const instructorKey = (c.instructor || "").toString();
          const cat = (c.categoryName || c.category || "").toString();
          if (!instructorKey || !cat) return;
          if (!categoryCountByInstructor[instructorKey]) categoryCountByInstructor[instructorKey] = {};
          categoryCountByInstructor[instructorKey][cat] = (categoryCountByInstructor[instructorKey][cat] || 0) + 1;
        });

        Object.entries(categoryCountByInstructor).forEach(([instructor, counts]) => {
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
          if (top) instructorToCategory.set(instructor, top);
        });

        const ins: InstructorItem[] = (users || [])
          .filter((u: any) => (u.role || "").toLowerCase() === "instructor")
          .map((u: any) => ({
            uid: u.uid,
            fullName: u.fullName || u.username || "Instructor",
            username: u.username,
            profileImage: u.profileImage,
            categoryLabel:
              instructorToCategory.get(u.username || "") || undefined,
          }));
        setInstructors(ins);

        const uniqueCategories = Array.from(
          new Set(ins.map((i: any) => i.categoryLabel).filter(Boolean))
        ) as string[];
        setCategoryFilters(["Tất cả", ...uniqueCategories]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instructors.filter((i: any) => {
      const matchQuery =
        !q ||
        (i.fullName || "").toLowerCase().includes(q) ||
        (i.username || "").toLowerCase().includes(q) ||
        ((i.categoryLabel || "").toLowerCase().includes(q));
      const matchCategory =
        selectedCategoryFilter === "Tất cả" ||
        (i.categoryLabel || "") === selectedCategoryFilter;
      return matchQuery && matchCategory;
    });
  }, [query, instructors, selectedCategoryFilter]);

  const renderItem = ({ item }: { item: InstructorItem & { categoryLabel?: string } }) => (
    <TouchableOpacity
      style={[styles.item, dynamicStyles.item]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate("InstructorDetail", { instructorId: item.uid })}
    >
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.initial}>{(item.fullName || "?").charAt(0)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.name, dynamicStyles.name]} numberOfLines={1}>
          {item.fullName}
        </ThemedText>
        <ThemedText style={[styles.sub, dynamicStyles.sub]} numberOfLines={1}>
          {item.categoryLabel || "General"}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>Người hướng dẫn</ThemedText>
      </View>

      <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
        <View style={[styles.searchBar, dynamicStyles.searchBar]}>
          <MaterialIcons name="search" size={20} color={colors.placeholderText} />
          <TextInput
            placeholder="Tìm kiếm mentor..."
            placeholderTextColor={colors.placeholderText}
            style={[styles.searchInput, dynamicStyles.searchInput]}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="filter-list" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.resultRow}>
        <ThemedText style={[styles.resultText, dynamicStyles.resultText]}>
          Kết quả cho{" "}
          <Text style={[styles.resultHighlight, dynamicStyles.resultHighlight]}>“{query || "All"}”</Text>
        </ThemedText>
        <View style={styles.resultCountButton}>
          <Text style={[styles.resultCountText, dynamicStyles.resultCountText]}>
            {loading ? "…" : `${filtered.length} Kết quả tìm thấy`}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="#20B2AA" />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.uid}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={filterModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, dynamicStyles.modalTitle]}>Chọn lĩnh vực</ThemedText>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <MaterialIcons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categoryFilters}
              keyExtractor={(item) => item}
              ItemSeparatorComponent={() => (
                <View style={styles.modalDivider} />
              )}
              renderItem={({ item }) => {
                const isActive = selectedCategoryFilter === item;
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedCategoryFilter(item);
                      setFilterModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        dynamicStyles.modalItemText,
                        isActive && styles.modalItemTextActive,
                        isActive && dynamicStyles.modalItemTextActive,
                      ]}
                    >
                      {item}
                    </Text>
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
    </View>
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
    paddingBottom: 16,
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
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
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
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
  },
  resultHighlight: {
    fontWeight: "600",
  },
  resultCountButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultCountText: {
    fontSize: 13,
    marginRight: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#20B2AA",
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  initial: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  name: {
    fontWeight: "700",
    fontSize: 16,
  },
  sub: {
    fontSize: 13,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
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
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  modalItemText: {
    fontSize: 15,
  },
  modalItemTextActive: {
    fontWeight: "600",
  },
});

export default MentorListScreen;


