import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCourseById, getUsers, getLessonCountByCourse, enrollCourse, getUserByUsername, createPaymentLink, checkPaymentStatus, getUserCourses, getCourseReviews } from "../api/api";

type RouteParams = { courseId: string };

const CourseDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { courseId } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [instructorName, setInstructorName] = useState<string>("Instructor");
  const [instructorAvatar, setInstructorAvatar] = useState<string | undefined>(undefined);
  const [lessonCount, setLessonCount] = useState<number | undefined>(undefined);
  const [enrolling, setEnrolling] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    console.log('CourseDetailScreen - courseId:', courseId);
    console.log('CourseDetailScreen - route.params:', route.params);
    
    // Kiểm tra courseId trước khi gọi API
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      console.error('CourseDetailScreen - Invalid courseId:', courseId);
      setError("ID khóa học không hợp lệ");
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [courseData, users, lessons, reviews] = await Promise.all([
          getCourseById(courseId),
          getUsers().catch(() => []),
          getLessonCountByCourse(courseId).catch(() => ({ count: undefined })),
          getCourseReviews(courseId).catch(() => []),
        ]);
        if (!mounted) return;
        setCourse(courseData);
        setLessonCount(typeof lessons?.count === 'number' ? lessons.count : undefined);

        // Tính toán rating trung bình
        if (Array.isArray(reviews) && reviews.length > 0) {
          const avgRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length;
          setAverageRating(avgRating);
          setReviewCount(reviews.length);
        }

        const nameFromCourse = courseData?.instructorName || courseData?.instructor || "";
        const nameFromUsers = (() => {
          const id = courseData?.instructorId || courseData?.instructorUID || courseData?.uid;
          if (!id) return "";
          const u = (users || []).find((x: any) => x.uid === id);
          if (!u) return "";
          setInstructorAvatar(u.profileImage);
          return (u.fullName || u.username || "Instructor");
        })();
        setInstructorName(nameFromCourse || nameFromUsers || "Instructor");
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Không tải được chi tiết khóa học");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [courseId]);

  const thumbnail = useMemo(() => course?.thumbnailUrl || course?.image || course?.coverUrl || undefined, [course]);
  const durationText = useMemo(() => {
    if (!course) return "";
    const d = course.duration || course.totalDuration || course.totalTime;
    if (typeof d === "number") return `${d} phút`;
    if (typeof d === "string" && d.trim()) return d;
    if (typeof course.totalLessons === "number") return `${course.totalLessons} bài học`;
    return "";
  }, [course]);

  const handleCheckPayment = async (orderCode: string, userId: string) => {
    try {
      setCheckingPayment(true);
      
      // Đợi một chút để backend xử lý thanh toán và enroll
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Bước 1: Kiểm tra xem user đã được enroll vào khóa học chưa
      console.log('Checking enrollment for user:', userId, 'course:', courseId);
      const userCourses = await getUserCourses(userId);
      const isEnrolled = Array.isArray(userCourses) && 
        userCourses.some((c: any) => (c.id || c._id) === courseId);
      
      console.log('User courses:', userCourses?.length, 'Is enrolled:', isEnrolled);
      
      if (isEnrolled) {
        // Đã được enroll - Thanh toán thành công
        console.log('Payment successful - User enrolled in course');
        Alert.alert(
          'Thanh toán thành công!',
          'Bạn đã tham gia khóa học thành công.',
          [
            { 
              text: 'OK', 
              onPress: () => (navigation as any).navigate('MainTabs', { screen: 'Courses' }) 
            }
          ]
        );
        return;
      }
      
      // Bước 2: Nếu chưa enroll, kiểm tra trạng thái thanh toán
      console.log('Not enrolled yet, checking payment status...');
      const paymentStatus = await checkPaymentStatus(orderCode);
      console.log('Payment status:', paymentStatus);
      
      const status = paymentStatus?.status?.toLowerCase();
      
      if (status === 'paid' || status === 'completed' || status === 'success') {
        // Thanh toán thành công nhưng chưa enroll - Có thể backend đang xử lý
        Alert.alert(
          'Thanh toán thành công!',
          'Thanh toán của bạn đã được xác nhận. Khóa học sẽ được kích hoạt trong giây lát.',
          [
            { 
              text: 'OK', 
              onPress: () => (navigation as any).navigate('MainTabs', { screen: 'Courses' }) 
            }
          ]
        );
      } else if (status === 'cancelled' || status === 'canceled') {
        // Thanh toán bị hủy
        Alert.alert(
          'Thanh toán bị hủy',
          'Bạn đã hủy thanh toán. Vui lòng thử lại nếu muốn tham gia khóa học.',
          [{ text: 'OK' }]
        );
      } else if (status === 'pending' || status === 'processing') {
        // Thanh toán đang chờ xử lý
        Alert.alert(
          'Đang xử lý thanh toán',
          'Thanh toán của bạn đang được xử lý. Vui lòng kiểm tra lại trong "Khóa học của tôi" sau vài phút.',
          [{ text: 'OK' }]
        );
      } else {
        // Trạng thái không xác định - Cho user biết kiểm tra lại
        Alert.alert(
          'Vui lòng kiểm tra lại',
          'Không thể xác nhận trạng thái thanh toán. Vui lòng kiểm tra trong "Khóa học của tôi" sau vài phút.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error checking payment:', error);
      Alert.alert(
        'Không thể kiểm tra thanh toán',
        'Vui lòng kiểm tra lại trong "Khóa học của tôi" sau vài phút.',
        [{ text: 'OK' }]
      );
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const username = await AsyncStorage.getItem('currentUsername');
      if (!username) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để tham gia khóa học');
        setEnrolling(false);
        return;
      }
      const user = await getUserByUsername(username);
      if (!user || !user.uid) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        setEnrolling(false);
        return;
      }

      // Kiểm tra khóa học có phí không
      const coursePrice = course?.price || 0;
      if (coursePrice > 0) {
        // Khóa học có phí - Tạo link thanh toán
        try {
          const paymentData = await createPaymentLink(user.uid, courseId);
          if (paymentData?.checkoutUrl && paymentData?.orderCode) {
            const orderCode = paymentData.orderCode;
            
            // Mở link thanh toán trong trình duyệt
            const supported = await Linking.canOpenURL(paymentData.checkoutUrl);
            if (supported) {
              await Linking.openURL(paymentData.checkoutUrl);
              
              // Hiển thị alert và kiểm tra thanh toán khi nhấn OK
              Alert.alert(
                'Chuyển đến trang thanh toán',
                'Vui lòng hoàn tất thanh toán. Sau khi thanh toán xong, nhấn OK để kiểm tra.',
                [
                  { 
                    text: 'Hủy', 
                    style: 'cancel',
                    onPress: () => {
                      setEnrolling(false);
                    }
                  },
                  { 
                    text: 'OK', 
                    onPress: async () => {
                      await handleCheckPayment(orderCode, user.uid);
                      setEnrolling(false);
                    }
                  }
                ]
              );
              // Không set enrolling = false ở đây vì sẽ set trong callback
              return;
            } else {
              Alert.alert('Lỗi', 'Không thể mở link thanh toán');
              setEnrolling(false);
            }
          } else {
            Alert.alert('Lỗi', 'Không thể tạo link thanh toán');
            setEnrolling(false);
          }
        } catch (paymentError: any) {
          const errorMsg = paymentError?.message || 'Không thể tạo thanh toán';
          Alert.alert('Lỗi thanh toán', errorMsg);
          setEnrolling(false);
        }
      } else {
        // Khóa học miễn phí - Enroll trực tiếp
        await enrollCourse(user.uid, courseId);
        Alert.alert('Thành công', 'Đã tham gia khóa học thành công!', [
          { text: 'OK', onPress: () => (navigation as any).navigate('MainTabs', { screen: 'Courses' }) }
        ]);
      }
    } catch (e: any) {
      const msg = e?.message || 'Không thể tham gia khóa học';
      Alert.alert('Lỗi', msg.includes('đã tham gia') ? msg : 'Có lỗi xảy ra. Vui lòng thử lại.');
      setEnrolling(false);
    }
  };

  if (loading) return <View style={styles.center}><Text>Đang tải...</Text></View>;
  if (error) return (
    <View style={styles.center}>
      <Text>{error}</Text>
      <TouchableOpacity style={styles.retry} onPress={() => navigation.goBack()}>
        <Text style={{color:'#fff'}}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ImageBackground source={thumbnail ? { uri: thumbnail } : undefined} style={styles.cover} imageStyle={{opacity: thumbnail ? 1 : 0.5}}>
          {!thumbnail && <View style={{flex:1, backgroundColor:'#333'}} />}
        </ImageBackground>

        <View style={styles.content}>
          <Text style={styles.title}>{course?.title || "Course"}</Text>
          
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{course?.description || "Không có mô tả"}</Text>

          {instructorName ? (
            <View style={[styles.row, {marginTop: 16}]}> 
              {instructorAvatar ? (
                <Image source={{ uri: instructorAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar,{backgroundColor:'#ccc',alignItems:'center',justifyContent:'center'}]}>
                  <MaterialIcons name="person" size={18} color="#666" />
                </View>
              )}
              <View style={{marginLeft: 10}}>
                <Text style={styles.rowText}>{instructorName}</Text>
              </View>
            </View>
          ) : null}
          {course?.level ? (
            <View style={styles.row}>
              <MaterialIcons name="trending-up" size={18} color="#20B2AA" />
              <Text style={styles.rowText}>Level: {course.level}</Text>
            </View>
          ) : null}
          {durationText ? (
            <View style={styles.row}>
              <MaterialIcons name="schedule" size={18} color="#20B2AA" />
              <Text style={styles.rowText}>{durationText}</Text>
            </View>
          ) : null}
          {typeof lessonCount === 'number' ? (
            <View style={styles.row}>
              <MaterialIcons name="menu-book" size={18} color="#20B2AA" />
              <Text style={styles.rowText}>{lessonCount} bài học</Text>
            </View>
          ) : null}
          {typeof course?.price !== 'undefined' ? (
            <View style={styles.row}>
              <MaterialIcons name="attach-money" size={18} color="#20B2AA" />
              <Text style={styles.rowText}>Giá: </Text>
              <Text style={styles.priceText}>
                {course.price === 0 || !course.price ? 'Miễn phí' : `${course.price.toLocaleString('vi-VN')} VND`}
              </Text>
            </View>
          ) : null}
          {reviewCount > 0 ? (
            <TouchableOpacity 
              style={styles.reviewRow} 
              onPress={() => (navigation as any).navigate('CourseReview', { 
                courseId, 
                courseTitle: course?.title 
              })}
            >
              <MaterialIcons name="star" size={18} color="#FFD700" />
              <Text style={styles.ratingText}>
                {averageRating.toFixed(1)}
              </Text>
              <Text style={styles.reviewCountText}>
                ({reviewCount} đánh giá)
              </Text>
              <MaterialIcons name="chevron-right" size={18} color="#999" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.reviewRow} 
              onPress={() => (navigation as any).navigate('CourseReview', { 
                courseId, 
                courseTitle: course?.title 
              })}
            >
              <MaterialIcons name="rate-review" size={18} color="#999" />
              <Text style={styles.reviewCountText}>
                Chưa có đánh giá
              </Text>
              <MaterialIcons name="chevron-right" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footerCta}>
        <TouchableOpacity 
          style={[styles.joinBtn, (enrolling || checkingPayment) && styles.joinBtnDisabled]} 
          onPress={handleEnroll}
          disabled={enrolling || checkingPayment}
        >
          {(enrolling || checkingPayment) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" />
              {checkingPayment && (
                <Text style={styles.joinText}>Đang kiểm tra thanh toán...</Text>
              )}
            </View>
          ) : (
            <Text style={styles.joinText}>
              {course?.price && course.price > 0 
                ? `Thanh toán ${course.price.toLocaleString('vi-VN')} VND` 
                : 'Tham gia miễn phí'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBar: { position: "absolute", zIndex: 2, top: 40, left: 16, right: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  cover: { width: "100%", height: 220, backgroundColor: "#222" },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#222", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  rowText: { marginLeft: 8, color: "#333" },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#222", marginTop: 8, marginBottom: 6 },
  description: { color: "#444", lineHeight: 20 },
  retry: { backgroundColor: "#20B2AA", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 10 },
  priceText: { fontWeight: '700', color: '#20B2AA', marginLeft: 4, fontSize: 15 },
  scrollContent: { paddingBottom: 100 },
  reviewRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff8e1', 
    padding: 12, 
    borderRadius: 8, 
    marginTop: 12,
    gap: 6,
  },
  ratingText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#333',
  },
  reviewCountText: { 
    fontSize: 14, 
    color: '#666',
    flex: 1,
  },
  footerCta: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e0e0e0", shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  joinBtn: { backgroundColor: '#20B2AA', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  joinBtnDisabled: { opacity: 0.6 },
  joinText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default CourseDetailScreen;


