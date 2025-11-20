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
    <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={() => navigation.navigate("InstructorDetail", { instructorId: item.uid })}>
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}><Text style={styles.initial}>{(item.fullName || "?").charAt(0)}</Text></View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
        <Text style={styles.sub} numberOfLines={1}>{item.categoryLabel || "General"}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Người hướng dẫn</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput
            placeholder="Tìm kiếm mentor..."
            placeholderTextColor="#999"
            style={styles.searchInput}
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
        <Text style={styles.resultText}>
          Kết quả cho{" "}
          <Text style={styles.resultHighlight}>“{query || "All"}”</Text>
        </Text>
        <View style={styles.resultCountButton}>
          <Text style={styles.resultCountText}>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn lĩnh vực</Text>
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
                        isActive && styles.modalItemTextActive,
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
    backgroundColor: "#f8f8f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
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
    alignItems: "center",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
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
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  resultText: {
    color: "#666",
    fontSize: 14,
  },
  resultHighlight: {
    color: "#20B2AA",
    fontWeight: "600",
  },
  resultCountButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultCountText: {
    color: "#20B2AA",
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
    backgroundColor: "#fff",
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
    color: "#111",
    fontWeight: "700",
    fontSize: 16,
  },
  sub: {
    color: "#6b7280",
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
  modalItemText: {
    fontSize: 15,
    color: "#444",
  },
  modalItemTextActive: {
    color: "#20B2AA",
    fontWeight: "600",
  },
});

export default MentorListScreen;


