import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, StyleSheet, View, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from "react-native";
import { getUsers, getCategories, getLessons, getCourses } from "../api/api";
import { Dropdown } from "react-native-element-dropdown";

// Kiểu dữ liệu cho từng section thống kê
type StatsSection = "users" | "categories" | "lessons" | "courses";

type BarDatum = { label: string; value: number; delta?: number };

// Biểu đồ cột đơn giản thuần RN, không dùng lib ngoài
// props.data: mảng { label: string; value: number, delta?: number }
const SimpleBarChart = ({
  title,
  data,
  maxBars = 8,
  height,
  barColor = "#20B2AA",
}: {
  title: string;
  data: BarDatum[];
  maxBars?: number;
  height?: number; // nếu không truyền => auto chiều cao (không cố định)
  barColor?: string;
}) => {
  const screenWidth = Dimensions.get("window").width;
  const horizontalPadding = 32;
  const chartWidth = Math.max(320, screenWidth - horizontalPadding * 2);

  const topN = useMemo(() => {
    const trimmed = (data || [])
      .filter((d) => Number.isFinite(d.value))
      .sort((a, b) => b.value - a.value)
      .slice(0, maxBars);
    const maxVal = Math.max(1, ...trimmed.map((d) => d.value));
    return { trimmed, maxVal };
  }, [data, maxBars]);

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={[styles.chartBox, height ? { height } : undefined]}>
        {topN.trimmed.length === 0 ? (
          <Text style={styles.chartEmpty}>Không có dữ liệu</Text>
        ) : (
          topN.trimmed.map((d, idx) => {
            const ratio = Math.max(0, Math.min(1, d.value / topN.maxVal));
            const barWidth = ratio * (chartWidth - 140);
            const delta = Number.isFinite(d.delta as number) ? (d.delta as number) : undefined;
            const deltaColor = delta === undefined ? "#666" : delta >= 0 ? "#2ECC71" : "#E74C3C";
            const deltaText = delta === undefined ? "" : `${delta >= 0 ? "+" : ""}${delta}`;
            return (
              <View key={idx} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{d.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: barWidth, backgroundColor: barColor }]} />
                </View>
                <Text style={styles.barValue}>{d.value}</Text>
                {delta !== undefined && (
                  <Text style={[styles.barDelta, { color: deltaColor }]}>{deltaText}</Text>
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const AdminStatsScreen: React.FC = () => {
  const [section, setSection] = useState<StatsSection>("users");
  const [loading, setLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Tháng/năm được chọn
  const today = new Date();
  const currentYearDefault = today.getFullYear();
  const currentMonthDefault = today.getMonth(); // 0-11

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthDefault);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearDefault);

  const load = async () => {
    setLoading(true);
    try {
      const [u, c, l, cs] = await Promise.all([
        getUsers().catch(() => []),
        getCategories().catch(() => []),
        getLessons().catch(() => []),
        getCourses().catch(() => []),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setCategories(Array.isArray(c) ? c : []);
      setLessons(Array.isArray(l) ? l : []);
      setCourses(Array.isArray(cs) ? cs : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Helpers thời gian theo tháng/năm được chọn
  const selectedPrevMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
  const prevMonth = selectedPrevMonthDate.getMonth();
  const prevYearForMonth = selectedPrevMonthDate.getFullYear();

  const inCurrentPeriod = (d?: Date) => {
    if (!d || isNaN(d.getTime())) return true; // nếu thiếu createdAt, gán về kỳ hiện tại
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  };

  const inPrevPeriod = (d?: Date) => {
    if (!d || isNaN(d.getTime())) return false;
    return d.getFullYear() === prevYearForMonth && d.getMonth() === prevMonth;
  };

  // Dữ liệu cho biểu đồ theo từng section
  const userRoleStats = useMemo(() => {
    const stats: Record<string, { cur: number; prev: number }> = {};

    users.forEach((u) => {
      const role = String(u.role || "unknown");
      if (!stats[role]) {
        stats[role] = { cur: 0, prev: 0 };
      }
      const createdAt = u.createdAt ? new Date(u.createdAt) : undefined;
      if (inCurrentPeriod(createdAt)) stats[role].cur += 1;
      else if (inPrevPeriod(createdAt)) stats[role].prev += 1;
    });

    return Object.entries(stats).map(([label, s]) => ({
      label,
      value: s.cur,
      delta: s.cur - s.prev,
    }));
  }, [users, selectedMonth, selectedYear, prevMonth, prevYearForMonth]);

  const categoryGrowthStats = useMemo(() => {
    const stats: Record<string, { name: string; cur: number; prev: number }> = {};

    categories.forEach((cat) => {
      const id = String(cat.id);
      stats[id] = { name: String(cat.name || id), cur: 0, prev: 0 };
    });

    (courses || []).forEach((c) => {
      const catId = String(c.category || "");
      if (!catId || !stats[catId]) return;
      const createdAt = c.createdAt ? new Date(c.createdAt) : undefined;
      if (inCurrentPeriod(createdAt)) stats[catId].cur += 1;
      else if (inPrevPeriod(createdAt)) stats[catId].prev += 1;
    });

    const data: BarDatum[] = Object.entries(stats).map(([id, s]) => ({
      label: s.name,
      value: s.cur,
      delta: s.cur - s.prev,
    }));

    return data;
  }, [categories, courses, selectedMonth, selectedYear, prevMonth, prevYearForMonth]);

  const lessonsPerCourseStats = useMemo(() => {
    const stats: Record<string, { name: string; cur: number; prev: number }> = {};

    const idToName: Record<string, string> = {};
    (courses || []).forEach((c) => {
      idToName[String(c.id)] = String(c.title || c.name || c.id);
    });

    (lessons || []).forEach((l) => {
      const cid = String(l.courseId || "?");
      if (!stats[cid]) {
        stats[cid] = { name: idToName[cid] || cid, cur: 0, prev: 0 };
      }
      const createdAt = l.createdAt ? new Date(l.createdAt) : undefined;
      if (inCurrentPeriod(createdAt)) stats[cid].cur += 1;
      else if (inPrevPeriod(createdAt)) stats[cid].prev += 1;
    });

    return Object.entries(stats).map(([cid, s]) => ({
      label: s.name,
      value: s.cur,
      delta: s.cur - s.prev,
    }));
  }, [lessons, courses, selectedMonth, selectedYear, prevMonth, prevYearForMonth]);

  const coursePublishedStats = useMemo(() => {
    const stats = {
      published: { cur: 0, prev: 0 },
      draft: { cur: 0, prev: 0 },
    };

    (courses || []).forEach((c) => {
      const createdAt = c.createdAt ? new Date(c.createdAt) : undefined;
      if (inCurrentPeriod(createdAt)) {
        if (c.isPublished) stats.published.cur += 1;
        else stats.draft.cur += 1;
      } else if (inPrevPeriod(createdAt)) {
        if (c.isPublished) stats.published.prev += 1;
        else stats.draft.prev += 1;
      }
    });

    return [
      {
        label: "Published",
        value: stats.published.cur,
        delta: stats.published.cur - stats.published.prev,
      },
      {
        label: "Draft",
        value: stats.draft.cur,
        delta: stats.draft.cur - stats.draft.prev,
      },
    ];
  }, [courses, selectedMonth, selectedYear, prevMonth, prevYearForMonth]);

  const SectionSelector = () => {
    const opts: { key: StatsSection; label: string }[] = [
      { key: "users", label: "Users" },
      { key: "categories", label: "Categories" },
      { key: "lessons", label: "Lessons" },
      { key: "courses", label: "Courses" },
    ];
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorRow}
        style={styles.selectorRowContainer}
      >
        {opts.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => setSection(o.key)}
            style={[styles.selectorBtn, section === o.key && styles.selectorBtnActive]}
          >
            <Text style={[styles.selectorText, section === o.key && styles.selectorTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Dropdown dữ liệu
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ label: `Tháng ${i + 1}`, value: i }));
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({ label: `${currentYearDefault - i}`, value: currentYearDefault - i }));

  const FiltersDropdown = () => {
    return (
      <View style={styles.dropdownRow}>
        <View style={styles.dropdownItem}>
          <Dropdown
            data={monthOptions}
            labelField="label"
            valueField="value"
            value={selectedMonth}
            placeholder="Chọn tháng"
            onChange={(item: any) => setSelectedMonth(item.value)}
            style={styles.dropdown}
            selectedTextStyle={styles.dropdownText}
            placeholderStyle={styles.dropdownPlaceholder}
          />
        </View>
        <View style={styles.dropdownItem}>
          <Dropdown
            data={yearOptions}
            labelField="label"
            valueField="value"
            value={selectedYear}
            placeholder="Chọn năm"
            onChange={(item: any) => setSelectedYear(item.value)}
            style={styles.dropdown}
            selectedTextStyle={styles.dropdownText}
            placeholderStyle={styles.dropdownPlaceholder}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Thống kê</Text>

        <SectionSelector />
        <FiltersDropdown />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#20B2AA" />
            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
          </View>
        ) : (
          <>
            {section === "users" && (
              <>
                <SimpleBarChart title={`Số người dùng mới theo vai trò (tháng ${selectedMonth + 1}/${selectedYear})`} data={userRoleStats} barColor="#20B2AA" />
                <SimpleBarChart title={`Top 8 vai trò phổ biến (tháng ${selectedMonth + 1}/${selectedYear})`} data={userRoleStats} maxBars={8} barColor="#5DADE2" />
              </>
            )}

            {section === "categories" && (
              <>
                <SimpleBarChart title={`Số khóa học mới theo danh mục (tháng ${selectedMonth + 1}/${selectedYear})`} data={categoryGrowthStats} barColor="#F4A261" />
              </>
            )}

            {section === "lessons" && (
              <>
                <SimpleBarChart title={`Số bài học mới theo khóa học (tháng ${selectedMonth + 1}/${selectedYear})`} data={lessonsPerCourseStats} barColor="#9B59B6" />
              </>
            )}

            {section === "courses" && (
              <>
                <SimpleBarChart title={`Số khóa học mới theo trạng thái (tháng ${selectedMonth + 1}/${selectedYear})`} data={coursePublishedStats} barColor="#2ECC71" />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    paddingLeft: 30,
    paddingTop: 30,
    marginBottom: 12,
  },
  selectorRowContainer: {
    marginBottom: 12,
  },
  selectorRow: {
    flexDirection: "row",
    paddingLeft: 30,
    paddingRight: 30,
  },
  selectorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#eaeaea",
    borderRadius: 8,
    marginRight: 8,
    marginTop: 8,
  },
  selectorBtnActive: {
    backgroundColor: "#20B2AA",
  },
  selectorText: {
    color: "#333",
    fontWeight: "600",
  },
  selectorTextActive: {
    color: "#fff",
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 30,
    marginBottom: 12,
  },
  dropdownItem: {
    flex: 1,
    marginRight: 8,
  },
  dropdown: {
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
  },
  dropdownPlaceholder: {
    color: "#999",
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  loadingText: { color: "#666", marginTop: 8 },

  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  chartBox: {
    backgroundColor: "#fafafa",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  chartEmpty: { color: "#666" },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  barLabel: {
    width: 120,
    fontSize: 12,
    color: "#333",
    marginRight: 8,
  },
  barTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#eee",
    overflow: "hidden",
    marginRight: 8,
  },
  barFill: {
    height: 14,
    borderRadius: 7,
  },
  barValue: {
    width: 40,
    fontSize: 12,
    textAlign: "right",
    color: "#333",
    marginRight: 8,
  },
  barDelta: {
    width: 48,
    fontSize: 12,
    textAlign: "left",
    fontWeight: "700",
  },
});

export default AdminStatsScreen;


