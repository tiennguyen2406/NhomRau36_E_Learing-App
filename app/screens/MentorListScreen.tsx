import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Image } from "react-native";
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
            // attach resolved category label if found
            categoryLabel: instructorToCategory.get(u.username || "") || undefined,
          }));
        setInstructors(ins);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return instructors;
    return instructors.filter(i =>
      (i.fullName || "").toLowerCase().includes(q) ||
      (i.username || "").toLowerCase().includes(q) ||
      ((i as any).categoryLabel || "").toLowerCase().includes(q)
    );
  }, [query, instructors]);

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
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Mentors</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBar}>
        <TextInput
          placeholder="Search"
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.resultRow}>
        <Text style={styles.resultText}>Result for <Text style={{ color: "#20B2AA"}}>“{query || "All"}”</Text></Text>
        <Text style={styles.countText}>{loading ? "…" : `${filtered.length} FOUND`} ▸</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.uid}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 40, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#111" },
  searchBar: { marginHorizontal: 16, backgroundColor: "#f5f5f5", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchInput: { fontSize: 14, color: "#111" },
  resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },
  resultText: { color: "#6b7280", fontSize: 12 },
  countText: { color: "#6b7280", fontSize: 12 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  sep: { height: 1, backgroundColor: "#eee" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#111", marginRight: 12, justifyContent: "center", alignItems: "center" },
  initial: { color: "#fff", fontWeight: "700" },
  name: { color: "#111", fontWeight: "700" },
  sub: { color: "#6b7280", fontSize: 12, marginTop: 2 },
});

export default MentorListScreen;


