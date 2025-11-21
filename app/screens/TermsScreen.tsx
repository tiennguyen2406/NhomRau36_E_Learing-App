import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "../../hooks/use-theme-colors";
import { ThemedText } from "../../components/themed-text";

const TermsScreen: React.FC = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: colors.containerBackground },
        header: { backgroundColor: colors.headerBackground },
        headerTitle: { color: colors.primaryText },
        section: { backgroundColor: colors.cardBackground },
        sectionTitle: { color: colors.tint || "#20B2AA" },
        sectionText: { color: colors.secondaryText },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]}>Điều khoản & Điều kiện</ThemedText>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>1. Giới thiệu</Text>
          <ThemedText style={[styles.sectionText, dynamicStyles.sectionText]}>
            Khi sử dụng nền tảng 36Learning, bạn đồng ý tuân thủ các điều khoản
            và chính sách được nêu dưới đây. Vui lòng đọc kỹ trước khi tiếp tục
            sử dụng dịch vụ.
          </ThemedText>
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>2. Tài khoản người dùng</Text>
          <ThemedText style={[styles.sectionText, dynamicStyles.sectionText]}>
            Bạn chịu trách nhiệm bảo mật thông tin tài khoản và mọi hoạt động
            diễn ra dưới tài khoản của mình. Không chia sẻ thông tin đăng nhập
            với bên thứ ba.
          </ThemedText>
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>3. Nội dung & khóa học</Text>
          <ThemedText style={[styles.sectionText, dynamicStyles.sectionText]}>
            Nội dung khóa học thuộc quyền sở hữu của giảng viên và 36Learning.
            Bạn không được sao chép, tái phân phối hoặc sử dụng vào mục đích
            thương mại khi chưa có sự cho phép.
          </ThemedText>
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>4. Chính sách hoàn tiền</Text>
          <ThemedText style={[styles.sectionText, dynamicStyles.sectionText]}>
            Các yêu cầu hoàn tiền sẽ được xem xét dựa trên chính sách hiện hành.
            Vui lòng liên hệ trung tâm trợ giúp để được hỗ trợ cụ thể.
          </ThemedText>
        </View>

        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>5. Liên hệ</Text>
          <ThemedText style={[styles.sectionText, dynamicStyles.sectionText]}>
            Nếu bạn có câu hỏi về điều khoản, hãy liên hệ trung tâm trợ giúp
            hoặc gửi email đến support@36learning.vn.
          </ThemedText>
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
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
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
    lineHeight: 20,
  },
});

export default TermsScreen;

