import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getUserById, getCourses } from "../api/api";

type Props = NativeStackScreenProps<RootStackParamList, "InstructorDetail">;

const InstructorDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { instructorId } = route.params;
  const [courseCount, setCourseCount] = useState<number>(0);
  const [studentsTotal, setStudentsTotal] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [coursesByInstructor, setCoursesByInstructor] = useState<any[]>([]);
  const [instructorName, setInstructorName] = useState<string>("Instructor");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [user, courses] = await Promise.all([
          getUserById(instructorId),
          getCourses(),
        ]);
        if (!mounted) return;
        const username = (user?.username || "").toString();
        const fullName = (user?.fullName || "").toString();
        setInstructorName(fullName || username || "Instructor");
        const taughtCourses = (courses || []).filter((c: any) => {
          const ins = (c.instructor || c.instructorName || "").toString();
          return ins && (ins === username || ins === fullName);
        });
        setCoursesByInstructor(taughtCourses);
        setCourseCount(taughtCourses.length);
        const studentsSum = taughtCourses.reduce((sum: number, c: any) => sum + (Number(c.students) || 0), 0);
        setStudentsTotal(studentsSum);
        const ratings = taughtCourses.map((c: any) => Number(c.rating)).filter((n: number) => !Number.isNaN(n));
        const avg = ratings.length ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) : 0;
        setAvgRating(Number(avg.toFixed(1)));
      } catch {}
    })();
    return () => { mounted = false; };
  }, [instructorId]);

  return (
    <View style={styles.container}>
      {/* Header back like CourseDetail */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 80, paddingBottom: 24 }}>

        <View style={styles.header}>
          <View style={styles.avatar} />
          <Text style={styles.name}>{instructorName}</Text>
          <Text style={styles.sub}>ID: {instructorId}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statValue}>{courseCount}</Text><Text style={styles.statLabel}>Courses</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{studentsTotal}</Text><Text style={styles.statLabel}>Students</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{avgRating}</Text><Text style={styles.statLabel}>Rating</Text></View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.follow}><Text style={styles.actionText}>Follow</Text></TouchableOpacity>
            <TouchableOpacity style={styles.message}><Text style={styles.messageText}>Message</Text></TouchableOpacity>
          </View>
        </View>

        {/* Courses list from instructor */}
        <View style={styles.section}>
          <View style={styles.tabs}><Text style={styles.tabActive}>Courses</Text><Text style={styles.tab}>Ratings</Text></View>
          {coursesByInstructor.map((c, idx) => (
            <TouchableOpacity key={c.id || idx} style={[styles.card, { marginBottom: 10 }] } activeOpacity={0.85} onPress={() => navigation.navigate('CourseDetail', { courseId: c.id })}>
              <View style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cat}>{c.categoryName || c.category || "Category"}</Text>
                <Text style={styles.title} numberOfLines={1}>{c.title}</Text>
                <View style={styles.row}><Text style={styles.priceNew}>${Number(c.price || 0)}</Text></View>
                <View style={styles.row}><Text style={styles.star}>★ {Number(c.rating || 0).toFixed(1)}</Text><Text style={styles.muted}>  {Number(c.students || 0)} Std</Text></View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f9fc" },
  headerBar: { position: "absolute", zIndex: 2, top: 40, left: 16, right: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", padding: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#111", marginBottom: 12 },
  name: { fontSize: 16, fontWeight: "700", color: "#111" },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 24, marginTop: 12 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 14, fontWeight: "700", color: "#111" },
  statLabel: { fontSize: 10, color: "#6b7280" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  follow: { paddingHorizontal: 22, paddingVertical: 12, backgroundColor: "#e8eefc", borderRadius: 20 },
  message: { paddingHorizontal: 22, paddingVertical: 12, backgroundColor: "#20B2AA", borderRadius: 20 },
  actionText: { color: "#111", fontWeight: "600" },
  messageText: { color: "#fff", fontWeight: "600" },
  section: { paddingHorizontal: 16, paddingTop: 12 },
  tabs: { flexDirection: "row", backgroundColor: "#edf2f7", borderRadius: 10, padding: 4, gap: 12, alignSelf: "flex-start", marginBottom: 12 },
  tab: { color: "#6b7280", paddingHorizontal: 10, paddingVertical: 4 },
  tabActive: { color: "#111", fontWeight: "700", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  card: { flexDirection: "row", backgroundColor: "#fff", padding: 12, borderRadius: 12, gap: 12, elevation: 2 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#111" },
  cat: { color: "#FF8C00", fontSize: 12 },
  title: { color: "#111", fontSize: 14, fontWeight: "700", marginVertical: 2 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  priceNew: { color: "#20B2AA", fontWeight: "700" },
  priceOld: { color: "#9ca3af", textDecorationLine: "line-through", marginLeft: 6 },
  star: { color: "#f59e0b", fontWeight: "600" },
  muted: { color: "#6b7280" },
});

export default InstructorDetailScreen;


