import React from "react";
import { SafeAreaView, Text, StyleSheet } from "react-native";

const AdminStatsScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Thống kê</Text>
      <Text style={styles.subtitle}>Bảng điều khiển thống kê đang phát triển...</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
});

export default AdminStatsScreen;


