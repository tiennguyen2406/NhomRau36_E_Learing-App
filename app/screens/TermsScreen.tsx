import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const TermsScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Điều khoản & Điều kiện</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Giới thiệu</Text>
          <Text style={styles.sectionText}>
            Khi sử dụng nền tảng 36Learning, bạn đồng ý tuân thủ các điều khoản
            và chính sách được nêu dưới đây. Vui lòng đọc kỹ trước khi tiếp tục
            sử dụng dịch vụ.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Tài khoản người dùng</Text>
          <Text style={styles.sectionText}>
            Bạn chịu trách nhiệm bảo mật thông tin tài khoản và mọi hoạt động
            diễn ra dưới tài khoản của mình. Không chia sẻ thông tin đăng nhập
            với bên thứ ba.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Nội dung & khóa học</Text>
          <Text style={styles.sectionText}>
            Nội dung khóa học thuộc quyền sở hữu của giảng viên và 36Learning.
            Bạn không được sao chép, tái phân phối hoặc sử dụng vào mục đích
            thương mại khi chưa có sự cho phép.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Chính sách hoàn tiền</Text>
          <Text style={styles.sectionText}>
            Các yêu cầu hoàn tiền sẽ được xem xét dựa trên chính sách hiện hành.
            Vui lòng liên hệ trung tâm trợ giúp để được hỗ trợ cụ thể.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Liên hệ</Text>
          <Text style={styles.sectionText}>
            Nếu bạn có câu hỏi về điều khoản, hãy liên hệ trung tâm trợ giúp
            hoặc gửi email đến support@36learning.vn.
          </Text>
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
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#20B2AA",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
});

export default TermsScreen;

