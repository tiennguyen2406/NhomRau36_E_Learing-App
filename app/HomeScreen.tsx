import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Course {
  id: string;
  name: string;
  teacher: string;
  color: string;
  image?: string;
}

const courses: Course[] = [
  { id: '1', name: '12A11', teacher: 'Xuân Hùng Phạm', color: '#3F51B5' },
  { id: '2', name: 'KHỐI 12', teacher: 'Xuân Hùng Phạm', color: '#FF7043' },
  { id: '3', name: 'Địa lí 12A11 (2021 - 2022)', teacher: 'Lý Nguyễn', color: '#2196F3' },
  { id: '4', name: 'Hoá -12A11', teacher: 'Trịnh Ngọc Lan', color: '#455A64' },
  { id: '5', name: 'LỚP VĂN 12A11 (2021)', teacher: 'Vũ Thị Chu', color: '#F4511E' },
  { id: '6', name: 'Lý 10A11 năm học 2019...', teacher: 'Hoàng Lam', color: '#1E88E5' },
  { id: '7', name: 'Yh', teacher: 'Tiến Nguyễn', color: '#37474F' },
  { id: '8', name: '10A11', teacher: 'Nhu Xuân Nguyễn Thị', color: '#FFB300' },
];

const HomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          <MaterialIcons name="school" size={26} color="#4CAF50" />{' '}
          <Text style={styles.logoText}>Lớp học</Text>
        </Text>
        <TouchableOpacity>
          <Image
            source={{ uri: 'https://i.pravatar.cc/100' }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      {/* Danh sách lớp */}
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.courseCard} activeOpacity={0.9}>
            <View style={[styles.cardHeader, { backgroundColor: item.color }]}>
              <Text style={styles.courseTitle}>{item.name}</Text>
              <View style={styles.teacherAvatar}>
                <Text style={styles.teacherAvatarText}>
                  {item.teacher.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.courseInfo}>
              <Text numberOfLines={1} style={styles.teacherName}>
                {item.teacher}
              </Text>
              <View style={styles.iconRow}>
                <MaterialIcons name="camera-alt" size={18} color="#777" />
                <MaterialIcons name="folder" size={18} color="#777" />
                <MaterialIcons name="more-vert" size={18} color="#777" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <MaterialIcons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    marginTop: 45,
    marginHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  logoText: {
    color: '#333',
    fontWeight: '600',
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
  },
  list: {
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  courseCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 8,
    overflow: 'hidden',
    elevation: 3,
  },
  cardHeader: {
    height: 90,
    justifyContent: 'space-between',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teacherAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  courseInfo: {
    padding: 12,
    backgroundColor: '#fff',
  },
  teacherName: {
    color: '#555',
    fontSize: 14,
    marginBottom: 10,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 25,
    backgroundColor: '#1E88E5',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
