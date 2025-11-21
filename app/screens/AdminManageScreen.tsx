import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
  Modal,
  Image,
  Dimensions,
  ActivityIndicator,
  Switch,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Dropdown } from "react-native-element-dropdown";
import {
  createCategory,
  createCourse,
  createLesson,
  createUser,
  deleteCategory,
  deleteLesson,
  deleteUser,
  getCategories,
  getCourses,
  getProofs,
  getLessons,
  getUsers,
  updateCategory,
  updateCourse,
  updateLesson,
  updateUser,
  updateProofStatus,
  getProofCourses,
  updateProofCourseStatus,
  uploadProofFile,
} from "../api/api";
import { MaterialIcons } from "@expo/vector-icons";

type EntityType = "users" | "categories" | "lessons" | "courses" | "proofs" | "proofCourses";

const defaultCourseForm = {
  title: "",
  description: "",
  categoryId: "",
  price: "0",
  thumbnailUrl: "",
  instructorId: "",
  instructorName: "",
  isPublished: false,
  status: "draft",
};

const AdminManageScreen: React.FC = () => {
  const [entity, setEntity] = useState<EntityType>("users");
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [previewProof, setPreviewProof] = useState<any | null>(null);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [selectedProofCourse, setSelectedProofCourse] = useState<any | null>(null);
  const [processingModalVisible, setProcessingModalVisible] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<"processing" | "success" | "error">("processing");
  const [processingMessage, setProcessingMessage] = useState<string>("");

  // Form states for each entity
  const [userForm, setUserForm] = useState({
    email: "",
    username: "",
    password: "",
    fullName: "",
    role: "student",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    iconUrl: "",
    isActive: true as boolean,
  });
  const [iconLocal, setIconLocal] = useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const [lessonForm, setLessonForm] = useState({
    courseId: "",
    title: "",
    description: "",
    videoUrl: "",
    duration: "0",
    order: "0",
    isPreview: false as boolean,
  });
  const [videoLocal, setVideoLocal] = useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [courseForm, setCourseForm] = useState({ ...defaultCourseForm });
  const [courseThumbnailLocal, setCourseThumbnailLocal] = useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [uploadingCourseThumbnail, setUploadingCourseThumbnail] = useState(false);
  const [courseCategories, setCourseCategories] = useState<{ label: string; value: string }[]>([]);

  const columns = useMemo(() => {
    switch (entity) {
      case "users":
        return ["uid", "username", "email", "fullName", "role"]; 
      case "categories":
        return ["id", "name", "courseCount", "isActive"]; 
      case "lessons":
        return ["id", "courseId", "title", "order", "duration"]; 
      case "courses":
        return ["id", "title", "categoryLabel", "priceLabel", "publishLabel"];
      case "proofs":
        return ["id", "username", "requestedRole", "statusLabel", "createdAtLabel"];
      case "proofCourses":
        return ["id", "username", "courseTitle", "statusLabel", "createdAtLabel"];
      default:
        return [];
    }
  }, [entity]);

  const load = async () => {
    setLoading(true);
    try {
      if (entity === "users") {
        const data = await getUsers();
        setItems(Array.isArray(data) ? data : []);
      } else if (entity === "categories") {
        const data = await getCategories();
        setItems(Array.isArray(data) ? data : []);
      } else if (entity === "lessons") {
        const data = await getLessons();
        setItems(Array.isArray(data) ? data : []);
      } else if (entity === "courses") {
        const data = await getCourses();
        const normalized = Array.isArray(data)
          ? data.map((course: any) => {
              const categoryLabel =
                course.categoryName ||
                course.category?.name ||
                course.category ||
                "—";
              const priceValue =
                typeof course.currentPrice === "number"
                  ? course.currentPrice
                  : typeof course.price === "number"
                  ? course.price
                  : Number(course.price) || 0;
              return {
                ...course,
                categoryLabel,
                priceLabel:
                  typeof priceValue === "number"
                    ? `${priceValue.toLocaleString("vi-VN")} đ`
                    : String(priceValue || ""),
                publishLabel: course.isPublished ? "Published" : "Draft",
              };
            })
          : [];
        setItems(normalized);
      } else if (entity === "proofs") {
        // Chỉ lấy các proof ở trạng thái pending
        const data = await getProofs();
        const normalized = Array.isArray(data)
          ? data
              .filter((p: any) => {
                const statusRaw = (p.status || "pending").toLowerCase();
                return statusRaw === "pending";
              })
              .map((p: any) => {
                const statusRaw = (p.status || "pending").toLowerCase();
                return {
                  ...p,
                  requestedRole: p.requestedRole || "instructor",
                  status: statusRaw,
                  statusLabel: statusRaw.toUpperCase(),
                  createdAtLabel: p.createdAt
                    ? new Date(p.createdAt).toLocaleString()
                    : "",
                };
              })
          : [];
        setItems(normalized);
      } else {
        // proofCourses - chỉ lấy các yêu cầu ở trạng thái pending
        const data = await getProofCourses();
        const normalized = Array.isArray(data)
          ? data
              .filter((p: any) => {
                const statusRaw = (p.status || "pending").toLowerCase();
                return statusRaw === "pending";
              })
              .map((p: any) => {
                const statusRaw = (p.status || "pending").toLowerCase();
                const payload = p.payload || {};
                return {
                  ...p,
                  courseTitle: payload.title || "—",
                  status: statusRaw,
                  statusLabel: statusRaw.toUpperCase(),
                  createdAtLabel: p.createdAt
                    ? new Date(p.createdAt).toLocaleString()
                    : "",
                };
              })
          : [];
        setItems(normalized);
      }
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };
  const filteredItems = useMemo(() => {
    const q = String(searchQuery || "").toLowerCase().trim();
    if (!q) return items;
    return items.filter((row: any) => {
      // Search across shown columns
      return columns.some((c) => String(row[c] ?? "").toLowerCase().includes(q));
    });
  }, [items, searchQuery, columns]);


  useEffect(() => {
    load();
  }, [entity]);

  useEffect(() => {
    // Preload courses for lesson form
    (async () => {
      try {
        const cs = await getCourses();
        setCourses(Array.isArray(cs) ? cs : []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories();
        const options = Array.isArray(cats)
          ? cats
              .map((cat: any) => ({
                label: String(cat.name || "Danh mục"),
                value: String(cat.id || cat._id || cat.categoryId || ""),
              }))
              .filter((opt) => !!opt.value)
          : [];
        setCourseCategories(options);
      } catch (error) {
        console.warn("Không thể tải danh mục cho quản lý khóa học:", error);
        setCourseCategories([]);
      }
    })();
  }, []);

  const resetForms = () => {
    setEditingId(null);
    setSelectedProof(null);
    setSelectedProofCourse(null);
    setPreviewProof(null);
    setPreviewVisible(false);
    setUserForm({ email: "", username: "", password: "", fullName: "", role: "student" });
    setCategoryForm({ name: "", description: "", iconUrl: "", isActive: true });
    setIconLocal(null);
    setLessonForm({ courseId: "", title: "", description: "", videoUrl: "", duration: "0", order: "0", isPreview: false });
    setVideoLocal(null);
    setCourseForm({ ...defaultCourseForm });
    setCourseThumbnailLocal(null);
  };

  const pickIcon = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh để chọn ảnh.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setIconLocal({
          uri: result.assets[0].uri,
          name: `icon_${Date.now()}.jpg`,
          type: "image/jpeg",
        });
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.");
    }
  };

  const pickCourseThumbnail = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh để chọn ảnh bìa.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setCourseThumbnailLocal({
          uri: asset.uri,
          name: asset.fileName || `course_thumb_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
        setCourseForm((prev) => ({ ...prev, thumbnailUrl: asset.uri }));
      }
    } catch (error) {
      console.error("Lỗi khi chọn thumbnail khóa học:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh bìa. Vui lòng thử lại.");
    }
  };

  const pickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Quyền truy cập", "Cần quyền truy cập thư viện để chọn video.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setVideoLocal({
          uri: result.assets[0].uri,
          name: `video_${Date.now()}.mp4`,
          type: result.assets[0].mimeType || "video/mp4",
        });
      }
    } catch (error) {
      console.error("Lỗi khi chọn video:", error);
      Alert.alert("Lỗi", "Không thể chọn video. Vui lòng thử lại.");
    }
  };

  const onSubmit = async () => {
    if (entity === "proofs" || entity === "proofCourses") return;
    try {
      setLoading(true);
      
      if (entity === "users") {
        if (editingId) {
          await updateUser(editingId, { ...userForm });
        } else {
          await createUser({ ...userForm });
        }
      } else if (entity === "categories") {
        let finalIconUrl = categoryForm.iconUrl;
        
        // Upload icon nếu có
        if (iconLocal?.uri) {
          try {
            setUploadingIcon(true);
            finalIconUrl = await uploadProofFile(iconLocal);
          } catch (e) {
            console.error("Upload icon failed:", e);
            Alert.alert("Cảnh báo", "Không thể tải ảnh icon. Thông tin khác vẫn được cập nhật.");
          } finally {
            setUploadingIcon(false);
          }
        }

        const categoryData = { ...categoryForm, iconUrl: finalIconUrl };
        if (editingId) {
          await updateCategory(editingId, categoryData);
        } else {
          await createCategory(categoryData);
        }
      } else if (entity === "lessons") {
        let finalVideoUrl = lessonForm.videoUrl;
        
        // Upload video nếu có
        if (videoLocal?.uri) {
          try {
            setUploadingVideo(true);
            finalVideoUrl = await uploadProofFile(videoLocal);
          } catch (e) {
            console.error("Upload video failed:", e);
            Alert.alert("Cảnh báo", "Không thể tải video. Thông tin khác vẫn được cập nhật.");
          } finally {
            setUploadingVideo(false);
          }
        }

        const payload = {
          ...lessonForm,
          videoUrl: finalVideoUrl,
          duration: Number(lessonForm.duration) || 0,
          order: Number(lessonForm.order) || 0,
        } as any;
        if (editingId) {
          await updateLesson(editingId, payload);
        } else {
          await createLesson(payload);
        }
      } else if (entity === "courses") {
        if (!courseForm.title.trim()) {
          Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề khóa học.");
          return;
        }
        if (!courseForm.categoryId) {
          Alert.alert("Thiếu thông tin", "Vui lòng chọn danh mục.");
          return;
        }

        let finalThumbnail = courseForm.thumbnailUrl;
        if (courseThumbnailLocal?.uri) {
          try {
            setUploadingCourseThumbnail(true);
            finalThumbnail = await uploadProofFile(courseThumbnailLocal);
          } catch (e) {
            console.error("Upload thumbnail failed:", e);
            Alert.alert("Cảnh báo", "Không thể tải ảnh bìa. Sử dụng đường dẫn hiện có.");
          } finally {
            setUploadingCourseThumbnail(false);
          }
        }

        const payload: any = {
          title: courseForm.title.trim(),
          description: courseForm.description.trim(),
          category: courseForm.categoryId,
          price: Number(courseForm.price) || 0,
          thumbnailUrl: finalThumbnail,
          imageUrl: finalThumbnail,
          isPublished: courseForm.isPublished,
          status: courseForm.status || (courseForm.isPublished ? "published" : "draft"),
        };

        if (courseForm.instructorId) {
          payload.instructorId = courseForm.instructorId;
        }
        if (courseForm.instructorName) {
          payload.instructor = courseForm.instructorName;
        }

        if (editingId) {
          await updateCourse(editingId, payload);
        } else {
          await createCourse(payload);
        }
      }
      resetForms();
      await load();
      Alert.alert("Thành công", editingId ? "Đã cập nhật" : "Đã tạo mới");
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Thao tác thất bại (có thể backend chưa hỗ trợ)");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      setLoading(true);
      if (entity === "users") await deleteUser(id);
      if (entity === "categories") await deleteCategory(id);
      if (entity === "lessons") await deleteLesson(id);
      await load();
      Alert.alert("Thành công", "Đã xóa");
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Xóa thất bại (có thể backend chưa hỗ trợ)");
    } finally {
      setLoading(false);
    }
  };

  const onSelectRow = (row: any) => {
    setEditingId(row.uid || row.id || null);
    if (entity === "proofs") {
      setSelectedProof(row);
      return;
    }
    if (entity === "proofCourses") {
      setSelectedProofCourse(row);
      return;
    }
    if (entity === "users") {
      setUserForm({
        email: row.email || "",
        username: row.username || "",
        password: "",
        fullName: row.fullName || "",
        role: row.role || "student",
      });
    } else if (entity === "categories") {
      setCategoryForm({
        name: row.name || "",
        description: row.description || "",
        iconUrl: row.iconUrl || "",
        isActive: !!row.isActive,
      });
      setIconLocal(null);
    } else if (entity === "lessons") {
      setLessonForm({
        courseId: row.courseId || "",
        title: row.title || "",
        description: row.description || "",
        videoUrl: row.videoUrl || "",
        duration: String(row.duration || 0),
        order: String(row.order || 0),
        isPreview: !!row.isPreview,
      });
      setVideoLocal(null);
    } else if (entity === "courses") {
      const categoryValue =
        row.categoryId ||
        row.category?._id ||
        row.category?.id ||
        row.category ||
        "";
      setCourseForm({
        title: row.title || "",
        description: row.description || "",
        categoryId: String(categoryValue || ""),
        price: String(
          row.price ??
            row.currentPrice ??
            row.originalPrice ??
            0
        ),
        thumbnailUrl: row.thumbnailUrl || row.imageUrl || "",
        instructorId: row.instructorId || "",
        instructorName: row.instructor || row.instructorName || "",
        isPublished: !!row.isPublished,
        status: row.status || (row.isPublished ? "published" : "draft"),
      });
      setCourseThumbnailLocal(null);
    }
  };

  const isImageProof = (proof: any) => {
    if (!proof) return false;
    const mime = String(proof.type || proof.metadata?.mimeType || "").toLowerCase();
    if (mime.startsWith("image/")) return true;
    const url = String(proof.url || "");
    return /\.(png|jpe?g|gif|bmp|webp|heic)$/i.test(url);
  };

  const openPreview = (proof: any) => {
    if (!proof?.url) return;
    if (!isImageProof(proof)) {
      Linking.openURL(proof.url).catch(() =>
        Alert.alert("Lỗi", "Không thể mở đường dẫn minh chứng.")
      );
      return;
    }
    setPreviewProof(proof);
    setPreviewVisible(true);
  };

  const closePreview = () => {
    setPreviewVisible(false);
    setPreviewProof(null);
  };

  const handleProofDecision = (proof: any, status: "approved" | "rejected") => {
    if (!proof?.id) return;
    const actionText = status === "approved" ? "Duyệt" : "Từ chối";
    Alert.alert(
      `${actionText} minh chứng`,
      `Bạn có chắc muốn ${status === "approved" ? "duyệt" : "từ chối"} yêu cầu này?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: actionText,
          style: status === "approved" ? "default" : "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await updateProofStatus(proof.id, status);
              await load();
              if (status === "approved") {
                Alert.alert("Đã duyệt", "Vai trò người dùng đã được cập nhật.");
              } else {
                Alert.alert("Đã từ chối", "Yêu cầu đã được từ chối.");
              }
              setSelectedProof(null);
              setEditingId(null);
            } catch (err: any) {
              Alert.alert("Lỗi", err?.message || "Không thể cập nhật minh chứng");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleProofCourseDecision = (proofCourse: any, status: "approved" | "rejected") => {
    if (!proofCourse?.id) return;
    const actionText = status === "approved" ? "Duyệt" : "Từ chối";
    Alert.alert(
      `${actionText} khóa học`,
      `Bạn có chắc muốn ${status === "approved" ? "duyệt" : "từ chối"} khóa học này?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: actionText,
          style: status === "approved" ? "default" : "destructive",
          onPress: async () => {
            try {
              // Hiển thị modal xử lý
              setProcessingModalVisible(true);
              setProcessingStatus("processing");
              setProcessingMessage(status === "approved" ? "Đang tạo khóa học và bài học..." : "Đang từ chối yêu cầu...");
              setLoading(true);
              
              await updateProofCourseStatus(proofCourse.id, status);
              await load();
              
              // Hiển thị thông báo thành công
              setProcessingStatus("success");
              setProcessingMessage(
                status === "approved" 
                  ? "Khóa học đã được tạo thành công!" 
                  : "Yêu cầu tạo khóa học đã được từ chối."
              );
              
              setSelectedProofCourse(null);
              setEditingId(null);
            } catch (err: any) {
              // Hiển thị thông báo lỗi
              setProcessingStatus("error");
              setProcessingMessage(err?.message || "Không thể cập nhật trạng thái khóa học");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleCoursePublish = async (course: any) => {
    if (!course?.id) return;
    const nextState = !course.isPublished;
    try {
      setLoading(true);
      await updateCourse(course.id, {
        isPublished: nextState,
        status: nextState ? "published" : "draft",
      });
      await load();
      Alert.alert(
        "Thành công",
        nextState ? "Khóa học đã được xuất bản." : "Khóa học đã được ẩn."
      );
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể cập nhật khóa học");
    } finally {
      setLoading(false);
    }
  };

  const SectionSelector = () => {
    const opts: { key: EntityType; label: string }[] = [
      { key: "users", label: "Users" },
      { key: "categories", label: "Categories" },
      { key: "lessons", label: "Lessons" },
      { key: "courses", label: "Courses" },
      { key: "proofs", label: "Proofs" },
      { key: "proofCourses", label: "Proof Courses" },
    ];
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorRow}
        style={styles.selectorRowContainer}
      >
        {opts.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => { setEntity(o.key); resetForms(); }}
            style={[styles.selectorBtn, entity === o.key && styles.selectorBtnActive]}
          >
            <Text style={[styles.selectorText, entity === o.key && styles.selectorTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderForm = () => {
    if (entity === "proofs") {
      const proof = selectedProof;
      return (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Chi tiết minh chứng</Text>
          {proof ? (
            <>
              <Text style={styles.proofLabel}>Người dùng: <Text style={styles.proofValue}>{proof.fullName || proof.username || proof.userId}</Text></Text>
              <Text style={styles.proofLabel}>Email: <Text style={styles.proofValue}>{proof.email || "—"}</Text></Text>
              <Text style={styles.proofLabel}>Vai trò hiện tại: <Text style={styles.proofValue}>{proof.currentRole || "—"}</Text></Text>
              <Text style={styles.proofLabel}>Đề nghị vai trò: <Text style={styles.proofValue}>{proof.requestedRole || "instructor"}</Text></Text>
              <Text style={styles.proofLabel}>
                Trạng thái:{" "}
                <Text style={styles.proofStatus}>
                  {(proof.status || "pending").toUpperCase()}
                </Text>
              </Text>
              <TouchableOpacity
                style={styles.proofLinkBtn}
                onPress={() => openPreview(proof)}
              >
                <Text style={styles.proofLinkText}>Xem minh chứng</Text>
              </TouchableOpacity>
              <View style={styles.proofActionRow}>
                <TouchableOpacity
                  style={[styles.proofActionBtn, styles.approveBtn]}
                  onPress={() => handleProofDecision(proof, "approved")}
                  disabled={proof.status !== "pending" || loading}
                >
                  <Text style={styles.proofActionText}>Duyệt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.proofActionBtn, styles.rejectBtn]}
                  onPress={() => handleProofDecision(proof, "rejected")}
                  disabled={proof.status !== "pending" || loading}
                >
                  <Text style={styles.proofActionText}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.proofPlaceholder}>Chọn một minh chứng trong danh sách để xem chi tiết.</Text>
          )}
        </View>
      );
    }

    if (entity === "proofCourses") {
      const proofCourse = selectedProofCourse;
      const payload = proofCourse?.payload || {};
      return (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Chi tiết yêu cầu khóa học</Text>
          {proofCourse ? (
            <>
              <Text style={styles.proofLabel}>Người dùng: <Text style={styles.proofValue}>{proofCourse.username || proofCourse.userId || "—"}</Text></Text>
              <Text style={styles.proofLabel}>Tiêu đề khóa học: <Text style={styles.proofValue}>{payload.title || "—"}</Text></Text>
              <Text style={styles.proofLabel}>Mô tả: <Text style={styles.proofValue}>{payload.description || "—"}</Text></Text>
              <Text style={styles.proofLabel}>Giá: <Text style={styles.proofValue}>{payload.price || 0} VNĐ</Text></Text>
              <Text style={styles.proofLabel}>Số bài học: <Text style={styles.proofValue}>{Array.isArray(payload.lessons) ? payload.lessons.length : 0}</Text></Text>
              <Text style={styles.proofLabel}>
                Trạng thái:{" "}
                <Text style={styles.proofStatus}>
                  {(proofCourse.status || "pending").toUpperCase()}
                </Text>
              </Text>
              {proofCourse.adminComment ? (
                <Text style={styles.proofLabel}>Ghi chú admin: <Text style={styles.proofValue}>{proofCourse.adminComment}</Text></Text>
              ) : null}
              <View style={styles.proofActionRow}>
                <TouchableOpacity
                  style={[styles.proofActionBtn, styles.approveBtn]}
                  onPress={() => handleProofCourseDecision(proofCourse, "approved")}
                  disabled={proofCourse.status !== "pending" || loading}
                >
                  <Text style={styles.proofActionText}>Duyệt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.proofActionBtn, styles.rejectBtn]}
                  onPress={() => handleProofCourseDecision(proofCourse, "rejected")}
                  disabled={proofCourse.status !== "pending" || loading}
                >
                  <Text style={styles.proofActionText}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.proofPlaceholder}>Chọn một yêu cầu khóa học trong danh sách để xem chi tiết.</Text>
          )}
        </View>
      );
    }

    if (entity === "users") return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? "Sửa User" : "Thêm User"}</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Email"
              autoCorrect={false}
              autoCapitalize="none"
              value={userForm.email}
              onChangeText={(t) => setUserForm((s) => ({ ...s, email: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              placeholder="Username"
              autoCorrect={false}
              autoCapitalize="none"
              value={userForm.username}
              onChangeText={(t) => setUserForm((s) => ({ ...s, username: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              placeholder="Mật khẩu"
              secureTextEntry
              autoCorrect={false}
              autoCapitalize="none"
              value={userForm.password}
              onChangeText={(t) => setUserForm((s) => ({ ...s, password: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ tên</Text>
            <TextInput
              placeholder="Họ tên"
              autoCorrect={false}
              value={userForm.fullName}
              onChangeText={(t) => setUserForm((s) => ({ ...s, fullName: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }] }>
            <Text style={styles.label}>Vai trò</Text>
            <TextInput
              placeholder="student / instructor / admin"
              autoCorrect={false}
              autoCapitalize="none"
              value={userForm.role}
              onChangeText={(t) => setUserForm((s) => ({ ...s, role: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.actions}>
          {editingId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={loading}>
            <Text style={styles.saveText}>{editingId ? "Cập nhật" : "Thêm mới"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (entity === "categories") return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? "Sửa Danh mục" : "Thêm Danh mục"}</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên danh mục</Text>
            <TextInput
              placeholder="Tên danh mục"
              autoCorrect={false}
              value={categoryForm.name}
              onChangeText={(t) => setCategoryForm((s) => ({ ...s, name: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Icon</Text>
            <TouchableOpacity
              style={styles.fileButton}
              onPress={pickIcon}
              disabled={uploadingIcon}
            >
              {uploadingIcon ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="image" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.fileButtonText}>
                    {iconLocal ? "Đã chọn ảnh" : categoryForm.iconUrl ? "Thay đổi ảnh" : "Chọn ảnh"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {iconLocal && (
              <Image source={{ uri: iconLocal.uri }} style={styles.previewImage} />
            )}
            {categoryForm.iconUrl && !iconLocal && (
              <Image source={{ uri: categoryForm.iconUrl }} style={styles.previewImage} />
            )}
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }] }>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              placeholder="Mô tả"
              value={categoryForm.description}
              onChangeText={(t) => setCategoryForm((s) => ({ ...s, description: t }))}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>
        <View style={styles.actions}>
          {editingId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={loading}>
            <Text style={styles.saveText}>{editingId ? "Cập nhật" : "Thêm mới"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (entity === "courses") {
      return (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? "Sửa Khóa học" : "Thêm Khóa học"}</Text>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tiêu đề</Text>
              <TextInput
                placeholder="Tiêu đề khóa học"
                value={courseForm.title}
                onChangeText={(t) => setCourseForm((s) => ({ ...s, title: t }))}
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Danh mục</Text>
              <Dropdown
                data={courseCategories}
                labelField="label"
                valueField="value"
                value={courseForm.categoryId || null}
                placeholder="Chọn danh mục"
                style={styles.dropdownInput}
                placeholderStyle={styles.dropdownPlaceholder}
                selectedTextStyle={styles.dropdownSelected}
                onChange={(item) =>
                  setCourseForm((s) => ({ ...s, categoryId: item.value }))
                }
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giá (VND)</Text>
              <TextInput
                placeholder="Giá khóa học"
                value={courseForm.price}
                keyboardType="numeric"
                onChangeText={(t) => setCourseForm((s) => ({ ...s, price: t }))}
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Trạng thái</Text>
              <TextInput
                placeholder="draft / published / archived"
                value={courseForm.status}
                autoCapitalize="none"
                onChangeText={(t) => setCourseForm((s) => ({ ...s, status: t }))}
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giảng viên (username)</Text>
              <TextInput
                placeholder="Tên hiển thị hoặc username"
                value={courseForm.instructorName}
                onChangeText={(t) => setCourseForm((s) => ({ ...s, instructorName: t }))}
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Giảng viên ID</Text>
              <TextInput
                placeholder="ID người tạo"
                value={courseForm.instructorId}
                onChangeText={(t) => setCourseForm((s) => ({ ...s, instructorId: t }))}
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                placeholder="Mô tả khóa học"
                value={courseForm.description}
                onChangeText={(t) => setCourseForm((s) => ({ ...s, description: t }))}
                style={[styles.input, styles.textArea]}
                multiline
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ảnh bìa</Text>
            <TouchableOpacity
              style={styles.fileButton}
              onPress={pickCourseThumbnail}
              disabled={uploadingCourseThumbnail}
            >
              {uploadingCourseThumbnail ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="image" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.fileButtonText}>
                    {courseThumbnailLocal
                      ? "Đã chọn ảnh"
                      : courseForm.thumbnailUrl
                      ? "Thay đổi ảnh"
                      : "Chọn ảnh"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {courseThumbnailLocal ? (
              <Image source={{ uri: courseThumbnailLocal.uri }} style={styles.previewImage} />
            ) : courseForm.thumbnailUrl ? (
              <Image source={{ uri: courseForm.thumbnailUrl }} style={styles.previewImage} />
            ) : null}
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Xuất bản ngay</Text>
            <Switch
              value={courseForm.isPublished}
              onValueChange={(val) =>
                setCourseForm((s) => ({
                  ...s,
                  isPublished: val,
                  status: val ? "published" : s.status === "archived" ? "archived" : "draft",
                }))
              }
              trackColor={{ false: "#d1d1d1", true: "#20B2AA" }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.actions}>
            {editingId && (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={loading || uploadingCourseThumbnail}>
              <Text style={styles.saveText}>{editingId ? "Cập nhật" : "Thêm mới"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? "Sửa Bài học" : "Thêm Bài học"}</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Course ID</Text>
            <TextInput
              placeholder="Course ID"
              autoCorrect={false}
              autoCapitalize="none"
              value={lessonForm.courseId}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, courseId: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tiêu đề</Text>
            <TextInput
              placeholder="Tiêu đề"
              autoCorrect={false}
              value={lessonForm.title}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, title: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              placeholder="Mô tả"
              value={lessonForm.description}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, description: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Video</Text>
            <TouchableOpacity
              style={styles.fileButton}
              onPress={pickVideo}
              disabled={uploadingVideo}
            >
              {uploadingVideo ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="video-library" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.fileButtonText}>
                    {videoLocal ? "Đã chọn video" : lessonForm.videoUrl ? "Thay đổi video" : "Chọn video"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {videoLocal && (
              <Text style={styles.fileInfoText}>Video đã chọn: {videoLocal.name}</Text>
            )}
            {lessonForm.videoUrl && !videoLocal && (
              <Text style={styles.fileInfoText} numberOfLines={1}>URL hiện tại: {lessonForm.videoUrl}</Text>
            )}
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thứ tự</Text>
            <TextInput
              placeholder="Thứ tự"
              keyboardType="numeric"
              value={lessonForm.order}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, order: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thời lượng (phút)</Text>
            <TextInput
              placeholder="Thời lượng (phút)"
              keyboardType="numeric"
              value={lessonForm.duration}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, duration: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.actions}>
          {editingId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={loading}>
            <Text style={styles.saveText}>{editingId ? "Cập nhật" : "Thêm mới"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRow = ({ item, index }: { item: any; index: number }) => {
    const isProof = entity === "proofs";
    const isProofCourse = entity === "proofCourses";
    const isPendingProof = isProof && item.status === "pending";
    const isPendingProofCourse = isProofCourse && item.status === "pending";
    const canDelete =
      entity === "users" || entity === "categories" || entity === "lessons";

    return (
      <TouchableOpacity
        style={[styles.rowItem, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}
        onPress={() => onSelectRow(item)}
      >
        {columns.map((c, idx) => (
          <Text
            key={`${item.id || item.uid}-${c}`}
            style={[
              styles.cell,
              idx === columns.length - 1 ? styles.cellLast : styles.cellWithBorder,
              styles.cellText,
            ]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {String(item[c] ?? "")}
          </Text>
        ))}
        <View style={[styles.cell, styles.cellLast]}>
          {isProof ? (
            <View style={styles.proofRowActions}>
              <TouchableOpacity
                style={[styles.proofRowBtn, styles.approveBtn]}
                onPress={() => handleProofDecision(item, "approved")}
                disabled={!isPendingProof || loading}
              >
                <Text style={styles.proofRowText}>Duyệt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proofRowBtn, styles.rejectBtn]}
                onPress={() => handleProofDecision(item, "rejected")}
                disabled={!isPendingProof || loading}
              >
                <Text style={styles.proofRowText}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          ) : isProofCourse ? (
            <View style={styles.proofRowActions}>
              <TouchableOpacity
                style={[styles.proofRowBtn, styles.approveBtn]}
                onPress={() => handleProofCourseDecision(item, "approved")}
                disabled={!isPendingProofCourse || loading}
              >
                <Text style={styles.proofRowText}>Duyệt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proofRowBtn, styles.rejectBtn]}
                onPress={() => handleProofCourseDecision(item, "rejected")}
                disabled={!isPendingProofCourse || loading}
              >
                <Text style={styles.proofRowText}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          ) : entity === "courses" ? (
            <View style={styles.courseRowActions}>
              <TouchableOpacity
                style={[
                  styles.publishToggleBtn,
                  item.isPublished ? styles.unpublishBtn : styles.publishBtn,
                ]}
                onPress={() => toggleCoursePublish(item)}
                disabled={loading}
              >
                <Text style={styles.publishToggleText}>
                  {item.isPublished ? "Ẩn" : "Xuất bản"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : canDelete ? (
            <TouchableOpacity
              onPress={() => onDelete(item.uid || item.id)}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteText}>Xóa</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Quản lý</Text>

        <SectionSelector />

        {renderForm()}

        <Modal
          visible={previewVisible}
          transparent
          animationType="fade"
          onRequestClose={closePreview}
        >
          <View style={styles.previewOverlay}>
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Minh chứng</Text>
              {previewProof && isImageProof(previewProof) ? (
                <Image
                  source={{ uri: previewProof.url }}
                  resizeMode="contain"
                  style={styles.previewImageModal}
                />
              ) : (
                <View style={styles.previewFallback}>
                  <Text style={styles.previewFallbackText}>
                    Không thể xem minh chứng trực tiếp. Vui lòng mở bên ngoài.
                  </Text>
                  {previewProof?.url ? (
                    <TouchableOpacity
                      style={styles.previewExternalBtn}
                      onPress={() => Linking.openURL(previewProof.url)}
                    >
                      <Text style={styles.previewExternalText}>Mở bên ngoài</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
              <TouchableOpacity style={styles.previewCloseBtn} onPress={closePreview}>
                <Text style={styles.previewCloseText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={processingModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (processingStatus !== "processing") {
              setProcessingModalVisible(false);
            }
          }}
        >
          <View style={styles.processingOverlay}>
            <View style={styles.processingContainer}>
              {processingStatus === "processing" ? (
                <>
                  <ActivityIndicator size="large" color="#20B2AA" />
                  <Text style={styles.processingTitle}>Đang xử lý...</Text>
                  <Text style={styles.processingMessage}>{processingMessage}</Text>
                </>
              ) : processingStatus === "success" ? (
                <>
                  <View style={styles.successIcon}>
                    <Text style={styles.successIconText}>✓</Text>
                  </View>
                  <Text style={styles.processingTitle}>Thành công!</Text>
                  <Text style={styles.processingMessage}>{processingMessage}</Text>
                  <TouchableOpacity
                    style={styles.processingButton}
                    onPress={() => {
                      setProcessingModalVisible(false);
                      setProcessingStatus("processing");
                      setProcessingMessage("");
                    }}
                  >
                    <Text style={styles.processingButtonText}>Đóng</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.errorIcon}>
                    <Text style={styles.errorIconText}>✕</Text>
                  </View>
                  <Text style={styles.processingTitle}>Lỗi</Text>
                  <Text style={styles.processingMessage}>{processingMessage}</Text>
                  <TouchableOpacity
                    style={[styles.processingButton, styles.errorButton]}
                    onPress={() => {
                      setProcessingModalVisible(false);
                      setProcessingStatus("processing");
                      setProcessingMessage("");
                    }}
                  >
                    <Text style={styles.processingButtonText}>Đóng</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Danh sách {entity}</Text>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.tableInner}>
              <View style={styles.headerRow}>
                {columns.map((c, idx) => (
                  <Text
                    key={c}
                    style={[styles.cell, idx === columns.length - 1 ? styles.cellLast : styles.cellWithBorder, styles.headerText]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    {c}
                  </Text>
                ))}
                <Text
                  style={[styles.cell, styles.cellLast, styles.headerText]}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  Actions
                </Text>
              </View>
              <FlatList
                data={filteredItems}
                keyExtractor={(it) => String(it.uid || it.id)}
                renderItem={renderRow}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                refreshing={loading}
                onRefresh={load}
              />
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    paddingLeft: 30,
    paddingTop: 30,
    marginBottom: 12,
  },
  selectorRowContainer: {
    marginBottom: 12,
  },
  selectorRow: {
    flexDirection: "row",
    paddingLeft: 30,
    paddingRight: 30,
  },
  selectorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#eaeaea",
    borderRadius: 8,
    marginRight: 8,
  },
  selectorBtnActive: {
    backgroundColor: "#20B2AA",
  },
  selectorText: {
    color: "#333",
    fontWeight: "600",
  },
  selectorTextActive: {
    color: "#fff",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputGroup: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    paddingLeft: 2,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ddd",
    borderRadius: 8,
  },
  cancelText: { color: "#222", fontWeight: "700" },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#20B2AA",
    borderRadius: 8,
  },
  saveText: { color: "#fff", fontWeight: "700" },
  tableCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tableInner: {
    minWidth: 800,
    flex: 1,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dropdownInput: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  dropdownPlaceholder: {
    color: "#999",
    fontSize: 14,
  },
  dropdownSelected: {
    color: "#333",
    fontSize: 14,
  },
  headerRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical: 6,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e6e6e6",
  },
  rowItem: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical: 10,
    alignItems: "center",
  },
  cell: {
    flex: 1,
    paddingRight: 6,
    paddingVertical: 6,
    minWidth: 140,
  },
  cellWithBorder: {
    borderRightWidth: 1,
    borderRightColor: "#e6e6e6",
  },
  cellLast: {
    borderRightWidth: 0,
  },
  rowEven: {
    backgroundColor: "#ffffff",
  },
  rowOdd: {
    backgroundColor: "#fafafa",
  },
  headerText: { fontWeight: "700", color: "#333" },
  cellText: { color: "#333" },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ff4d4f",
    borderRadius: 6,
  },
  deleteText: { color: "#fff", fontWeight: "700" },
  separator: {
    height: 1,
    backgroundColor: "#eee",
  },
  proofLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  proofValue: {
    fontWeight: "600",
    color: "#222",
  },
  proofStatus: {
    fontWeight: "700",
    color: "#F39C12",
    textTransform: "uppercase",
  },
  proofLinkBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#20B2AA",
    alignItems: "center",
  },
  proofLinkText: {
    color: "#fff",
    fontWeight: "700",
  },
  proofActionRow: {
    flexDirection: "row",
    marginTop: 16,
    justifyContent: "flex-end",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 12,
  },
  proofActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  proofActionText: {
    color: "#fff",
    fontWeight: "700",
  },
  approveBtn: {
    backgroundColor: "#2ECC71",
  },
  rejectBtn: {
    backgroundColor: "#E74C3C",
  },
  proofPlaceholder: {
    color: "#666",
    fontStyle: "italic",
  },
  reviewNote: {
    marginTop: 12,
    color: "#F39C12",
    fontSize: 14,
    fontWeight: "600",
  },
  proofRowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  courseRowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  proofRowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  proofRowText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  publishToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  publishToggleText: {
    color: "#fff",
    fontWeight: "700",
  },
  publishBtn: {
    backgroundColor: "#2ECC71",
  },
  unpublishBtn: {
    backgroundColor: "#F39C12",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  previewContainer: {
    width: Math.min(windowWidth * 0.9, 420),
    maxHeight: windowHeight * 0.85,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  previewImageModal: {
    width: "100%",
    height: Math.min(windowHeight * 0.6, 460),
    borderRadius: 8,
    backgroundColor: "#000",
    marginBottom: 16,
  },
  previewFallback: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  previewFallbackText: {
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  previewExternalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#20B2AA",
  },
  previewExternalText: {
    color: "#fff",
    fontWeight: "700",
  },
  previewCloseBtn: {
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  previewCloseText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    width: "80%",
    maxWidth: 400,
    alignItems: "center",
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  processingMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  processingButton: {
    backgroundColor: "#20B2AA",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: "center",
    marginTop: 8,
  },
  processingButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2ECC71",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successIconText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E74C3C",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorIconText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
  },
  errorButton: {
    backgroundColor: "#E74C3C",
  },
  fileButton: {
    backgroundColor: "#20B2AA",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  fileButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  previewImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#f0f0f0",
    resizeMode: "cover",
  },
  fileInfoText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
});

export default AdminManageScreen;


