import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from "../navigation/AppNavigator";
import { getUserByUsername, getUserCourses } from "../api/api";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Course {
  id: string;
  title: string;
  category?: string;
  description?: string;
  currentPrice?: number;
  originalPrice?: number;
  rating?: number;
  students?: number;
  totalLessons?: number;
}

const MyCoursesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'completed' | 'ongoing'>('completed');
  const [searchText, setSearchText] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const stored = await AsyncStorage.getItem('currentUsername');
        const username = stored || 'instructor01';
        const user = await getUserByUsername(username);
        if (!user) throw new Error('User not found');
        const userCourses = await getUserCourses(user.uid);
        setCourses(userCourses || []);
      } catch (e) {
        setError('Không thể tải khóa học của bạn');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = courses.filter(c =>
    !searchText || (c.title || '').toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <Text style={styles.muted}>Đang tải khóa học...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <MaterialIcons name="error-outline" size={40} color="#e74c3c" />
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Course }) => (
    <View style={styles.card}>
      <View style={styles.thumb} />
      <View style={styles.cardBody}>
        <Text style={styles.category} numberOfLines={1}>{item.category || 'Course'}</Text>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={14} color="#FFD700" />
            <Text style={styles.mutedSmall}>{item.rating ?? 0}</Text>
          </View>
          <Text style={styles.mutedSmall}>{item.totalLessons ?? 0} bài</Text>
        </View>
        <TouchableOpacity style={styles.cta}>
          <Text style={styles.ctaText}>VIEW CERTIFICATE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Courses</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for ..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <MaterialIcons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>Completed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ongoing' && styles.tabActive]}
          onPress={() => setActiveTab('ongoing')}
        >
          <Text style={[styles.tabText, activeTab === 'ongoing' && styles.tabTextActive]}>Ongoing</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', marginTop: 40 }]}>Chưa có khóa học</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: '#fff' },
  headerTitle: { marginLeft: 12, fontSize: 18, fontWeight: '700', color: '#333' },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, color: '#333' },
  searchBtn: { marginLeft: 10, width: 44, height: 44, borderRadius: 12, backgroundColor: '#20B2AA', justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12 },
  tab: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#eee', marginRight: 10 },
  tabActive: { backgroundColor: '#20B2AA' },
  tabText: { color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  thumb: { width: 100, height: 90, backgroundColor: '#111' },
  cardBody: { flex: 1, padding: 12 },
  category: { color: '#FF8C00', fontSize: 12, marginBottom: 4 },
  title: { color: '#333', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  cta: { alignSelf: 'flex-start', borderRadius: 14, backgroundColor: '#e8f8f7', paddingHorizontal: 12, paddingVertical: 6 },
  ctaText: { color: '#20B2AA', fontSize: 12, fontWeight: '700' },
  muted: { color: '#777' },
  mutedSmall: { color: '#777', fontSize: 12, marginLeft: 4 },
  error: { color: '#e74c3c', marginTop: 16, textAlign: 'center' },
});

export default MyCoursesScreen;


