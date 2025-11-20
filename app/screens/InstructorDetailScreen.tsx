import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getUserById,
  getCourses,
  getUserByUsername,
  getInstructorReviews,
  submitInstructorReview,
  deleteInstructorReview,
  followInstructor,
  unfollowInstructor,
  checkFollowStatus,
} from "../api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "../firebase";
import { ref, update } from "firebase/database";

type Props = NativeStackScreenProps<RootStackParamList, "InstructorDetail">;

const InstructorDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { instructorId } = route.params;
  const [courseCount, setCourseCount] = useState<number>(0);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [coursesByInstructor, setCoursesByInstructor] = useState<any[]>([]);
  const [instructorName, setInstructorName] = useState<string>("Instructor");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewCount, setReviewCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"courses" | "ratings">("courses");
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

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
          const ins = (c.instructor || c.instructorName || "").toString().trim().toLowerCase();
          const instructorNames = [username, fullName]
            .map((n) => n.trim().toLowerCase())
            .filter(Boolean);
          return ins && instructorNames.includes(ins);
        });
        setCoursesByInstructor(taughtCourses);
        setCourseCount(taughtCourses.length);
        // Không lấy avgRating từ khóa học, avgRating sẽ được tính hoàn toàn từ đánh giá của học viên (reviews)
      } catch {}
    })();
    return () => { mounted = false; };
  }, [instructorId]);

  const fetchReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const data = await getInstructorReviews(instructorId);
      const list = Array.isArray(data?.reviews) ? data.reviews : [];
      setReviews(list);

      const ratings = list
        .map((rev: any) => Number(rev.rating))
        .filter((value: number) => !Number.isNaN(value));

      const computedAverage =
        ratings.length > 0
          ? ratings.reduce((sum: number, value: number) => sum + value, 0) /
            ratings.length
          : 0;

      const serverAverage =
        typeof data?.averageRating === "number" ? data.averageRating : null;

      const finalAverage =
        serverAverage !== null ? serverAverage : computedAverage;

      setAvgRating(Number(finalAverage.toFixed(1)));
      setReviewCount(Number(data?.totalReviews || list.length || 0));
    } catch (error) {
      console.warn("Error loading instructor reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  }, [instructorId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const username = await AsyncStorage.getItem("currentUsername");
        if (!username || !mounted) return;
        const currentUser = await getUserByUsername(username);
        const uid = currentUser?.uid || currentUser?.id;
        if (mounted) {
          if (uid) setCurrentUserId(String(uid));
          setCurrentUsername(currentUser?.username || username);
        }
      } catch (error) {
        console.warn("Error loading current user:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load followers count và follow status
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const instructor = await getUserById(instructorId);
        if (!mounted || !instructor) return;
        
        // Lấy số lượng followers
        const followers = instructor.followers || [];
        setFollowersCount(Array.isArray(followers) ? followers.length : 0);

        // Kiểm tra follow status nếu đã đăng nhập
        if (currentUserId) {
          const status = await checkFollowStatus(currentUserId, instructorId);
          if (mounted) {
            setIsFollowing(status.isFollowing || false);
          }
        }
      } catch (error) {
        console.warn("Error loading followers:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [instructorId, currentUserId]);

  const handleFollowPress = async () => {
    if (!currentUserId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để follow instructor.");
      return;
    }
    if (String(currentUserId) === String(instructorId)) {
      Alert.alert("Thông báo", "Bạn không thể follow chính mình.");
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowInstructor(currentUserId, instructorId);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
        Alert.alert("Thành công", "Đã unfollow instructor.");
      } else {
        await followInstructor(currentUserId, instructorId);
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        Alert.alert("Thành công", "Đã follow instructor.");
      }
    } catch (error: any) {
      console.error("Error following/unfollowing:", error);
      Alert.alert("Lỗi", error?.error || error?.message || "Không thể follow/unfollow instructor.");
    } finally {
      setFollowLoading(false);
    }
  };

  const createConversationInBackground = (
    conversationId: string,
    me: string,
    other: string
  ) => {
    if (!database) return;
    const conversationRef = ref(database, `conversations/${conversationId}`);
    const now = Date.now();
    update(conversationRef, {
      participants: [String(me), String(other)],
      lastMessage: "",
      lastMessageTime: now,
      createdAt: now,
    }).catch((error) => console.error("Error creating conversation:", error));
  };

  const handleMessagePress = async () => {
    if (messageLoading) return;
    if (!currentUserId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập lại để nhắn tin.");
      return;
    }
    if (!database) {
      Alert.alert("Thông báo", "Chức năng chat chưa được cấu hình.");
      return;
    }
    if (String(currentUserId) === String(instructorId)) {
      Alert.alert("Thông báo", "Bạn không thể trò chuyện với chính mình.");
      return;
    }

    const sortedIds = [String(currentUserId), String(instructorId)].sort();
    const conversationId = `${sortedIds[0]}_${sortedIds[1]}`;

    setMessageLoading(true);
    try {
      navigation.navigate(
        "MainTabs" as any,
        {
          screen: "Inbox",
          params: {
            initialChat: {
              chatId: conversationId,
              name: instructorName,
              otherUserId: instructorId,
              currentUserId,
            },
          },
        } as any
      );
      createConversationInBackground(conversationId, currentUserId, instructorId);
    } catch (error) {
      console.error("Error navigating to chat:", error);
      Alert.alert("Lỗi", "Không thể mở cuộc trò chuyện. Vui lòng thử lại sau.");
    } finally {
      setMessageLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!currentUserId || !currentUsername) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để đánh giá.");
      return;
    }
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      Alert.alert("Thông báo", "Vui lòng chọn số sao hợp lệ (1-5).");
      return;
    }
    try {
      setSubmittingReview(true);
      await submitInstructorReview({
        instructorId,
        rating: reviewRating,
        comment: reviewComment.trim(),
        userId: currentUserId,
        username: currentUsername,
      });
      setReviewComment("");
      setReviewRating(5);
      fetchReviews();
      Alert.alert("Cảm ơn bạn", "Đánh giá của bạn đã được ghi nhận.");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể gửi đánh giá.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId?: string) => {
    if (!reviewId) return;
    if (!currentUserId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để xoá đánh giá của bạn.");
      return;
    }
    try {
      setDeletingReviewId(reviewId);
      await deleteInstructorReview(reviewId, currentUserId);
      await fetchReviews();
      Alert.alert("Đã xoá", "Đánh giá của bạn đã được xoá.");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.message || "Không thể xoá đánh giá.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const confirmDeleteReview = (reviewId?: string) => {
    if (!reviewId) return;
    Alert.alert(
      "Xoá đánh giá",
      "Bạn chắc chắn muốn xoá đánh giá này?",
      [
        { text: "Huỷ", style: "cancel" },
        { text: "Xoá", style: "destructive", onPress: () => handleDeleteReview(reviewId) },
      ],
      { cancelable: true }
    );
  };

  const renderStars = (value: number) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialIcons
          key={star}
          name="star"
          size={18}
          color={value >= star ? "#FFC107" : "#E0E0E0"}
        />
      ))}
    </View>
  );

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
            <View style={styles.stat}><Text style={styles.statValue}>{courseCount}</Text><Text style={styles.statLabel}>Khóa học</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{followersCount}</Text><Text style={styles.statLabel}>Người theo dõi</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{avgRating}</Text><Text style={styles.statLabel}>Đánh giá</Text></View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.follow,
                isFollowing && styles.followActive,
                followLoading && { opacity: 0.6 },
              ]}
              onPress={handleFollowPress}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? "#fff" : "#111"} />
              ) : (
                <Text style={[styles.actionText, isFollowing && styles.actionTextActive]}>
                  {isFollowing ? "Đang theo dõi" : "Theo dõi"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.message, messageLoading && { opacity: 0.6 }]}
              onPress={handleMessagePress}
              disabled={messageLoading}
            >
              {messageLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.messageText}>Tin nhắn</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Courses list from instructor */}
        <View style={styles.section}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "courses" && styles.tabButtonActive]}
              onPress={() => setActiveTab("courses")}
            >
              <Text style={[styles.tabText, activeTab === "courses" && styles.tabTextActive]}>Khóa học</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "ratings" && styles.tabButtonActive]}
              onPress={() => setActiveTab("ratings")}
            >
              <Text style={[styles.tabText, activeTab === "ratings" && styles.tabTextActive]}>Đánh giá</Text>
            </TouchableOpacity>
          </View>

          {activeTab === "courses" && coursesByInstructor.map((c, idx) => (
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

        {activeTab === "ratings" && (
        <View style={styles.section}>
          <Text style={styles.reviewSectionTitle}>Đánh giá từ học viên</Text>
          <View style={styles.reviewSummary}>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.reviewAverage}>{avgRating.toFixed(1)}</Text>
              {renderStars(Math.round(avgRating))}
              <Text style={styles.reviewCount}>{reviewCount} lượt đánh giá</Text>
            </View>
            <View style={styles.reviewFormContainer}>
              <Text style={styles.smallLabel}>Đánh giá của bạn</Text>
              <View style={styles.starSelectRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    style={styles.starSelectBtn}
                  >
                    <MaterialIcons
                      name="star"
                      size={24}
                      color={reviewRating >= star ? "#FFC107" : "#CFD8DC"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Chia sẻ cảm nhận của bạn..."
                multiline
                value={reviewComment}
                onChangeText={setReviewComment}
              />
              <TouchableOpacity
                style={[
                  styles.submitReviewBtn,
                  submittingReview && { opacity: 0.6 },
                ]}
                disabled={submittingReview}
                onPress={handleSubmitReview}
              >
                <Text style={styles.submitReviewText}>
                  {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {reviewsLoading ? (
            <ActivityIndicator color="#20B2AA" style={{ marginTop: 12 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>
              Chưa có đánh giá nào cho giảng viên này.
            </Text>
          ) : (
            reviews.map((rev) => {
              const reviewId = rev.id || rev._id;
              const reviewOwnerId = rev.userId ? String(rev.userId) : "";
              const isOwner =
                currentUserId &&
                reviewOwnerId &&
                reviewOwnerId === String(currentUserId);
              const reviewDate = rev.createdAt
                ? new Date(rev.createdAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "";

              return (
                <View key={reviewId || rev.username} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewUsername}>
                      {rev.username || "Người dùng"}
                    </Text>
                    <View style={styles.reviewHeaderRight}>
                      {reviewDate ? (
                        <Text style={styles.reviewDate}>{reviewDate}</Text>
                      ) : null}
                      {isOwner ? (
                        <TouchableOpacity
                          style={styles.deleteReviewBtn}
                          onPress={() => confirmDeleteReview(reviewId)}
                          disabled={deletingReviewId === reviewId}
                        >
                          {deletingReviewId === reviewId ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <MaterialIcons
                              name="delete-outline"
                              size={18}
                              color="#ef4444"
                            />
                          )}
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  {renderStars(rev.rating || 0)}
                  {rev.comment ? (
                    <Text style={styles.reviewComment}>{rev.comment}</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
        )}
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
  followActive: { backgroundColor: "#20B2AA" },
  message: { paddingHorizontal: 22, paddingVertical: 12, backgroundColor: "#20B2AA", borderRadius: 20 },
  actionText: { color: "#111", fontWeight: "600" },
  actionTextActive: { color: "#fff" },
  messageText: { color: "#fff", fontWeight: "600" },
  section: { paddingHorizontal: 16, paddingTop: 12 },
  tabs: { flexDirection: "row", backgroundColor: "#edf2f7", borderRadius: 10, padding: 4, gap: 8, alignSelf: "flex-start", marginBottom: 12 },
  tabButton: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  tabButtonActive: { backgroundColor: "#fff" },
  tabText: { color: "#6b7280", fontWeight: "600" },
  tabTextActive: { color: "#111" },
  card: { flexDirection: "row", backgroundColor: "#fff", padding: 12, borderRadius: 12, gap: 12, elevation: 2 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#111" },
  cat: { color: "#FF8C00", fontSize: 12 },
  title: { color: "#111", fontSize: 14, fontWeight: "700", marginVertical: 2 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  priceNew: { color: "#20B2AA", fontWeight: "700" },
  priceOld: { color: "#9ca3af", textDecorationLine: "line-through", marginLeft: 6 },
  star: { color: "#f59e0b", fontWeight: "600" },
  muted: { color: "#6b7280" },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1f2d3d",
  },
  reviewSummary: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    gap: 16,
  },
  reviewAverage: {
    fontSize: 34,
    fontWeight: "700",
    color: "#20B2AA",
  },
  reviewCount: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 13,
  },
  reviewFormContainer: {
    flex: 1,
  },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#0f172a",
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
    marginTop: 4,
  },
  smallLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  starRow: {
    flexDirection: "row",
    marginTop: 4,
    marginBottom: 4,
  },
  starSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  starSelectBtn: {
    padding: 4,
  },
  submitReviewBtn: {
    backgroundColor: "#20B2AA",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 6,
  },
  submitReviewText: {
    color: "#fff",
    fontWeight: "700",
  },
  emptyReviews: {
    marginTop: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  reviewHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewUsername: {
    fontWeight: "700",
    color: "#1f2d3d",
  },
  reviewDate: {
    color: "#94a3b8",
    fontSize: 11,
  },
  deleteReviewBtn: {
    padding: 4,
  },
  reviewComment: {
    marginTop: 6,
    color: "#475569",
    lineHeight: 18,
  },
});

export default InstructorDetailScreen;


