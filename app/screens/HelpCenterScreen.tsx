import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();

  const faqs = [
    {
      question: "Làm sao để cập nhật thông tin tài khoản?",
      answer:
        "Vào mục Chỉnh sửa hồ sơ trong trang Tài khoản để cập nhật tên, email, ảnh đại diện.",
    },
    {
      question: "Tôi quên mật khẩu phải làm sao?",
      answer:
        "Sử dụng chức năng Quên mật khẩu trên màn hình đăng nhập hoặc liên hệ đội hỗ trợ.",
    },
    {
      question: "Làm sao để liên hệ giảng viên?",
      answer:
        "Bạn có thể truy cập trang giảng viên và sử dụng nút Message để mở cuộc trò chuyện.",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trung tâm trợ giúp</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Liên hệ nhanh</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL("mailto:support@36learning.vn")}
          >
            <MaterialIcons name="email" size={20} color="#20B2AA" />
            <Text style={styles.contactText}>support@36learning.vn</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL("tel:+84000000000")}
          >
            <MaterialIcons name="phone" size={20} color="#20B2AA" />
            <Text style={styles.contactText}>+84 000 000 000</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>
          {faqs.map((faq) => (
            <View key={faq.question} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Gửi yêu cầu hỗ trợ</Text>
          <Text style={styles.sectionText}>
            Nếu bạn gặp lỗi hoặc cần tư vấn, hãy gửi thông tin chi tiết cho đội
            ngũ hỗ trợ. Chúng tôi sẽ phản hồi trong vòng 24h.
          </Text>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Gửi yêu cầu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#20B2AA",
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#333",
  },
  sectionText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 12,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#20B2AA",
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  faqItem: {
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
});

export default HelpCenterScreen;

