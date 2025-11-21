import React, { useMemo } from "react";
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
import { useThemeColors } from "../../hooks/use-theme-colors";
import { ThemedText } from "../../components/themed-text";

const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: colors.containerBackground },
        header: { backgroundColor: colors.headerBackground, borderBottomColor: colors.borderColor },
        headerTitle: { color: colors.primaryText },
        card: { backgroundColor: colors.cardBackground },
        sectionTitle: { color: colors.tint || "#20B2AA" },
        contactText: { color: colors.primaryText },
        sectionText: { color: colors.secondaryText },
        faqQuestion: { color: colors.primaryText },
        faqAnswer: { color: colors.secondaryText },
        primaryButton: { backgroundColor: colors.tint || "#20B2AA" },
      }),
    [colors]
  );

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
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>Trung tâm trợ giúp</ThemedText>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Liên hệ nhanh</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL("mailto:support@36learning.vn")}
          >
            <MaterialIcons name="email" size={20} color="#20B2AA" />
            <Text style={[styles.contactText, dynamicStyles.contactText]}>support@36learning.vn</Text>
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
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Câu hỏi thường gặp</Text>
          {faqs.map((faq) => (
            <View key={faq.question} style={styles.faqItem}>
              <Text style={[styles.faqQuestion, dynamicStyles.faqQuestion]}>{faq.question}</Text>
              <Text style={[styles.faqAnswer, dynamicStyles.faqAnswer]}>{faq.answer}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, dynamicStyles.card]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Gửi yêu cầu hỗ trợ</Text>
          <Text style={[styles.sectionText, dynamicStyles.sectionText]}>
            Nếu bạn gặp lỗi hoặc cần tư vấn, hãy gửi thông tin chi tiết cho đội
            ngũ hỗ trợ. Chúng tôi sẽ phản hồi trong vòng 24h.
          </Text>
          <TouchableOpacity style={[styles.primaryButton, dynamicStyles.primaryButton]}>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
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
  },
  sectionText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  primaryButton: {
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
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default HelpCenterScreen;

