import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import React, { useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getCourseReviews,
  submitCourseReview,
  updateCourseReview,
  deleteCourseReview,
  getUserByUsername,
} from "../api/api";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { useThemeColors } from "../../hooks/use-theme-colors";

type RouteParams = {
  courseId: string;
  courseTitle?: string;
};

type Review = {
  id: string;
  userId: string;
  username: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
};

const CourseReviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useThemeColors();
  const { courseId, courseTitle } = (route.params || {}) as RouteParams;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await getCourseReviews(courseId);
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading reviews:", error);
      Alert.alert("Lỗi", "Không thể tải đánh giá");
    } finally {
      setLoading(false);
    }
  };

  const loadUserInfo = async () => {
    try {
      const username = await AsyncStorage.getItem("currentUsername");
      if (!username) return;
      setCurrentUsername(username);
      const user = await getUserByUsername(username);
      if (user?.uid || user?.id) {
        setCurrentUserId(String(user.uid || user.id));
      }
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReviews();
      loadUserInfo();
    }, [courseId])
  );

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const userReview = reviews.find((r) => r.userId === currentUserId);

  const handleOpenModal = () => {
    if (userReview) {
      // Edit existing review
      setEditingReview(userReview);
      setRating(userReview.rating);
      setComment(userReview.comment || "");
    } else {
      // Create new review
      setEditingReview(null);
      setRating(5);
      setComment("");
    }
    setModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (!currentUserId) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập để đánh giá");
      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert("Lỗi", "Vui lòng chọn số sao từ 1 đến 5");
      return;
    }

    try {
      setSubmitting(true);

      if (editingReview) {
        // Update existing review
        await updateCourseReview(editingReview.id, {
          rating,
          comment: comment.trim(),
          userId: currentUserId,
        });
        Alert.alert("Thành công", "Đã cập nhật đánh giá của bạn");
      } else {
        // Create new review
        await submitCourseReview({
          courseId,
          rating,
          comment: comment.trim(),
          userId: currentUserId,
          username: currentUsername,
        });
        Alert.alert("Thành công", "Đã gửi đánh giá của bạn");
      }

      setModalVisible(false);
      loadReviews();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      Alert.alert("Lỗi", error?.message || "Không thể gửi đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!currentUserId) return;

    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc muốn xóa đánh giá này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCourseReview(reviewId, currentUserId);
              Alert.alert("Thành công", "Đã xóa đánh giá");
              loadReviews();
            } catch (error: any) {
              Alert.alert("Lỗi", error?.message || "Không thể xóa đánh giá");
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating: number, size: number = 16, color: string = "#FFD700") => {
    return (
      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialIcons
            key={star}
            name={star <= rating ? "star" : "star-border"}
            size={size}
            color={color}
          />
        ))}
      </View>
    );
  };

  // Dynamic styles
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.containerBackground,
    },
    header: {
      backgroundColor: colors.headerBackground,
    },
    headerTitle: {
      color: colors.primaryText,
    },
    summaryCard: {
      backgroundColor: colors.cardBackground,
    },
    courseTitle: {
      color: colors.primaryText,
    },
    averageRating: {
      color: colors.primaryText,
    },
    reviewCount: {
      color: colors.secondaryText,
    },
    reviewItem: {
      backgroundColor: colors.cardBackground,
    },
    username: {
      color: colors.primaryText,
    },
    date: {
      color: colors.secondaryText,
    },
    comment: {
      color: colors.primaryText,
    },
    emptyText: {
      color: colors.secondaryText,
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
    },
    modalTitle: {
      color: colors.primaryText,
    },
    label: {
      color: colors.primaryText,
    },
    commentInput: {
      backgroundColor: colors.searchBackground,
      color: colors.primaryText,
    },
  }), [colors]);

  const renderReviewItem = ({ item }: { item: Review }) => {
    const isOwnReview = item.userId === currentUserId;
    return (
      <View style={[styles.reviewItem, dynamicStyles.reviewItem]}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewUserInfo}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={20} color={colors.placeholderText} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.username, dynamicStyles.username]}>{item.username}</ThemedText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {renderStars(item.rating, 14)}
                <ThemedText style={[styles.date, dynamicStyles.date]}>
                  {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </ThemedText>
              </View>
            </View>
          </View>
          {isOwnReview && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={handleOpenModal}
                style={styles.iconButton}
              >
                <MaterialIcons name="edit" size={18} color="#20B2AA" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteReview(item.id)}
                style={styles.iconButton}
              >
                <MaterialIcons name="delete" size={18} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {item.comment && (
          <ThemedText style={[styles.comment, dynamicStyles.comment]}>{item.comment}</ThemedText>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, dynamicStyles.headerTitle]} numberOfLines={1}>
          Đánh giá khóa học
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.summaryCard, dynamicStyles.summaryCard]}>
        <ThemedText style={[styles.courseTitle, dynamicStyles.courseTitle]} numberOfLines={2}>
          {courseTitle || "Khóa học"}
        </ThemedText>
        <View style={styles.ratingRow}>
          <ThemedText style={[styles.averageRating, dynamicStyles.averageRating]}>
            {averageRating.toFixed(1)}
          </ThemedText>
          {renderStars(Math.round(averageRating), 24)}
          <ThemedText style={[styles.reviewCount, dynamicStyles.reviewCount]}>
            ({reviews.length} đánh giá)
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.addReviewButton}
          onPress={handleOpenModal}
        >
          <MaterialIcons
            name={userReview ? "edit" : "add"}
            size={20}
            color="#fff"
          />
          <ThemedText style={styles.addReviewText}>
            {userReview ? "Sửa đánh giá của bạn" : "Viết đánh giá"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="rate-review" size={48} color={colors.placeholderText} />
              <ThemedText style={[styles.emptyText, dynamicStyles.emptyText]}>
                Chưa có đánh giá nào. Hãy là người đầu tiên!
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Review Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.modalContent, dynamicStyles.modalContent]}>
                  <View style={styles.modalHeader}>
                    <ThemedText style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                      {editingReview ? "Sửa đánh giá" : "Viết đánh giá"}
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setModalVisible(false);
                      }}
                    >
                      <MaterialIcons name="close" size={24} color={colors.primaryText} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <ThemedText style={[styles.label, dynamicStyles.label]}>Đánh giá của bạn</ThemedText>
                    <View style={styles.starSelector}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => setRating(star)}
                        >
                          <MaterialIcons
                            name={star <= rating ? "star" : "star-border"}
                            size={40}
                            color="#FFD700"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    <ThemedText style={[styles.label, dynamicStyles.label]}>Nhận xét (không bắt buộc)</ThemedText>
                    <TextInput
                      style={[styles.textInput, dynamicStyles.commentInput]}
                      placeholder="Chia sẻ trải nghiệm của bạn về khóa học này..."
                      placeholderTextColor={colors.placeholderText}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      numberOfLines={4}
                      maxLength={500}
                      blurOnSubmit={true}
                      returnKeyType="done"
                    />

                    <TouchableOpacity
                      style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleSubmitReview();
                      }}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <ThemedText style={styles.submitButtonText}>
                          {editingReview ? "Cập nhật" : "Gửi đánh giá"}
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginHorizontal: 16,
  },
  summaryCard: {
    padding: 16,
    borderBottomWidth: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  averageRating: {
    fontSize: 32,
    fontWeight: "700",
  },
  reviewCount: {
    fontSize: 14,
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#20B2AA",
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  addReviewText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  reviewItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewUserInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  iconButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  starSelector: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  textInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#20B2AA",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CourseReviewScreen;

