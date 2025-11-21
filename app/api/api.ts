import { Platform } from "react-native";

// Đổi sang localhost để test local, hoặc dùng Render.com cho production
// const BASE_URL = "http://localhost:4000"; // Local backend server
const BASE_URL = "https://three6learningbackend.onrender.com"; // Production server

function normalizeMongoData(data: any): any {
  if (Array.isArray(data)) {
    return data.map(normalizeMongoData);
  }
  if (data && typeof data === "object") {
    const normalized: any = { ...data };

    // Luôn ưu tiên _id nếu nó tồn tại và hợp lệ
    if (normalized._id) {
      const _idString = normalized._id.toString();
      // Chỉ copy khi _id không phải là "undefined" hoặc "null"
      if (_idString && _idString !== "undefined" && _idString !== "null") {
        normalized.id = _idString;

        // Nếu có _id nhưng không có uid (cho user), copy _id thành uid
        if (!normalized.uid && (normalized.username || normalized.email)) {
          normalized.uid = _idString;
        }
      }
      // Xóa _id để tránh confusion
      delete normalized._id;
    }

    // Nếu id là "undefined" hoặc "null" string, xóa nó
    if (
      normalized.id === "undefined" ||
      normalized.id === "null" ||
      normalized.id === undefined ||
      normalized.id === null
    ) {
      console.warn(
        "normalizeMongoData: Invalid id detected:",
        normalized.id,
        "for object:",
        normalized.title || normalized.name || "unknown"
      );
      delete normalized.id;
    }

    // Recursively normalize nested objects
    Object.keys(normalized).forEach((key) => {
      if (normalized[key] && typeof normalized[key] === "object") {
        normalized[key] = normalizeMongoData(normalized[key]);
      }
    });
    return normalized;
  }
  return data;
}

async function requestJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}: ${bodyText.slice(0, 200)}`
    );
  }
  if (!contentType.includes("application/json")) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `Expected JSON but received ${contentType || "unknown"}: ${bodyText.slice(
        0,
        200
      )}`
    );
  }
  const data = await res.json();
  // Normalize MongoDB data để đảm bảo format nhất quán
  return normalizeMongoData(data);
}

// Hàm đăng nhập - gọi đến endpoint /users/login
export const loginUser = async (username: string, password: string) => {
  return requestJson(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
};

export const createUser = async (data: any) => {
  return requestJson(`${BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const login = async (username: string, password: string) => {
  return requestJson(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
};

export const getUsers = async () => {
  return requestJson(`${BASE_URL}/users`);
};

export const getUserByUsername = async (username: string) => {
  try {
    const users = await requestJson(`${BASE_URL}/users`);
    const user = users.find((user: any) => user.username === username);
    return user || null;
  } catch (error) {
    console.error("Error fetching user by username:", error);
    throw error;
  }
};

// Thêm function để lấy user theo ID (MongoDB _id hoặc uid)
export const getUserById = async (uid: string) => {
  return requestJson(`${BASE_URL}/users/${uid}`);
};

export const getUserCourses = async (uid: string) => {
  return requestJson(`${BASE_URL}/users/${uid}/courses`);
};

export const saveCourse = async (uid: string, courseId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/users/${uid}/save-course`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Không thể lưu khóa học");
    }
    return data;
  } catch (error: any) {
    throw new Error(error?.message || "Không thể lưu khóa học");
  }
};

export const unsaveCourse = async (uid: string, courseId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/users/${uid}/unsave-course`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Không thể bỏ lưu khóa học");
    }
    return data;
  } catch (error: any) {
    throw new Error(error?.message || "Không thể bỏ lưu khóa học");
  }
};

export const getSavedCourses = async (uid: string) => {
  try {
    const response = await fetch(`${BASE_URL}/users/${uid}/saved-courses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Không thể lấy danh sách khóa học đã lưu");
    }

    const courses = await response.json();
    const normalizedCourses = normalizeMongoData(courses || []);
    
    // Map để trả về format tương thích với code hiện tại
    return normalizedCourses.map((course: any) => ({
      course,
      courseId: course.id || course._id,
    }));
  } catch (error: any) {
    console.error("Error getting saved courses:", error);
    return [];
  }
};

export const updateUser = async (uid: string, data: any) => {
  return requestJson(`${BASE_URL}/users/${uid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

// Follow/Unfollow instructor
export const followInstructor = async (
  userId: string,
  instructorId: string
) => {
  return requestJson(`${BASE_URL}/users/follow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, instructorId }),
  });
};

export const unfollowInstructor = async (
  userId: string,
  instructorId: string
) => {
  return requestJson(`${BASE_URL}/users/unfollow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, instructorId }),
  });
};

export const checkFollowStatus = async (
  userId: string,
  instructorId: string
) => {
  return requestJson(
    `${BASE_URL}/users/check-follow?userId=${encodeURIComponent(
      userId
    )}&instructorId=${encodeURIComponent(instructorId)}`
  );
};

// May not be supported on backend yet
export const deleteUser = async (uid: string) => {
  return requestJson(`${BASE_URL}/users/${uid}`, { method: "DELETE" as any });
};

export const getCategories = async () => {
  return requestJson(`${BASE_URL}/categories`);
};

export const createCategory = async (data: any) => {
  return requestJson(`${BASE_URL}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

// May not be supported on backend yet
export const updateCategory = async (id: string, data: any) => {
  return requestJson(`${BASE_URL}/categories/${id}`, {
    method: "PUT" as any,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

// May not be supported on backend yet
export const deleteCategory = async (id: string) => {
  return requestJson(`${BASE_URL}/categories/${id}`, {
    method: "DELETE" as any,
  });
};

export const getCategoryById = async (categoryId: string) => {
  return requestJson(`${BASE_URL}/categories/${categoryId}`);
};

export const getCourses = async () => {
  return requestJson(`${BASE_URL}/courses`);
};

export const createCourse = async (data: any) => {
  return requestJson(`${BASE_URL}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const getCourseById = async (courseId: string) => {
  if (!courseId || courseId === "undefined" || courseId === "null") {
    throw new Error(`Invalid courseId: ${courseId}`);
  }
  return requestJson(`${BASE_URL}/courses/${courseId}`);
};

export const getLessonCountByCourse = async (courseId: string) => {
  if (!courseId || courseId === "undefined" || courseId === "null") {
    throw new Error(`Invalid courseId: ${courseId}`);
  }
  return requestJson(`${BASE_URL}/lessons/count/${courseId}`);
};

export const enrollCourse = async (uid: string, courseId: string) => {
  if (!courseId || courseId === "undefined" || courseId === "null") {
    throw new Error(`Invalid courseId: ${courseId}`);
  }
  if (!uid || uid === "undefined" || uid === "null") {
    throw new Error(`Invalid uid: ${uid}`);
  }
  return requestJson(`${BASE_URL}/users/${uid}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
};

export const unenrollCourse = async (uid: string, courseId: string) => {
  if (!courseId || courseId === "undefined" || courseId === "null") {
    throw new Error(`Invalid courseId: ${courseId}`);
  }
  if (!uid || uid === "undefined" || uid === "null") {
    throw new Error(`Invalid uid: ${uid}`);
  }
  return requestJson(`${BASE_URL}/users/${uid}/unenroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
};

export const getLessonsByCourse = async (courseId: string) => {
  if (!courseId || courseId === "undefined" || courseId === "null") {
    throw new Error(`Invalid courseId: ${courseId}`);
  }
  return requestJson(`${BASE_URL}/lessons/by-course/${courseId}`);
};

export const getLessons = async () => {
  return requestJson(`${BASE_URL}/lessons`);
};

export const createLesson = async (data: any) => {
  return requestJson(`${BASE_URL}/lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

// May not be supported on backend yet
export const updateLesson = async (id: string, data: any) => {
  return requestJson(`${BASE_URL}/lessons/${id}`, {
    method: "PUT" as any,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

// May not be supported on backend yet
export const deleteLesson = async (id: string) => {
  return requestJson(`${BASE_URL}/lessons/${id}`, { method: "DELETE" as any });
};

export const getCoursesByCategory = async (
  categoryId: string,
  onlyPublished: boolean = true
) => {
  const queryParams = onlyPublished ? "?published=true" : "";
  return requestJson(
    `${BASE_URL}/courses/category/${categoryId}${queryParams}`
  );
};

// API để cập nhật số lượng khóa học cho tất cả danh mục
export const updateAllCategoryCounts = async () => {
  return requestJson(`${BASE_URL}/categories/update-counts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
};

// Proofs (MinhChung)
export const createProof = async (
  userId: string,
  url: string,
  type?: string,
  metadata?: any,
  requestedRole?: string
) => {
  return requestJson(`${BASE_URL}/proofs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, url, type, metadata, requestedRole }),
  });
};

export const uploadProofFile = async (
  file: { uri: string; name?: string; type?: string },
  onProgress?: (progress: number) => void
) => {
  const form = new FormData();

  if (Platform.OS === "web") {
    const resp = await fetch(file.uri);
    const blob = await resp.blob();
    const filename = file.name || "proof";
    // @ts-ignore
    const webFile = new File([blob], filename, {
      type: file.type || blob.type || "application/octet-stream",
    });
    // @ts-ignore
    form.append("file", webFile);
  } else {
    // @ts-ignore React Native FormData
    form.append("file", {
      uri: file.uri,
      name: file.name || "proof",
      type: file.type || "application/octet-stream",
    } as any);
  }

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/proofs/upload`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          onProgress?.(1);
          resolve(data.url as string);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(xhr.responseText || "Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded / event.total);
        }
      };
    }

    xhr.send(form as any);
  });
};

export const getProofs = async () => {
  return requestJson(`${BASE_URL}/proofs`);
};

export const updateProofStatus = async (
  proofId: string,
  status: "approved" | "rejected",
  adminComment?: string
) => {
  return requestJson(`${BASE_URL}/proofs/${proofId}`, {
    method: "PATCH" as any,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, adminComment }),
  });
};

// ProofCourse - duyệt tạo khoá học
export const createProofCourse = async (userId: string, payload: any) => {
  return requestJson(`${BASE_URL}/proof-courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, payload }),
  });
};

export const updateProofCourseStatus = async (
  proofCourseId: string,
  status: "approved" | "rejected",
  adminComment?: string
) => {
  return requestJson(`${BASE_URL}/proof-courses/${proofCourseId}`, {
    method: "PATCH" as any,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, adminComment }),
  });
};

export const getProofCourses = async () => {
  return requestJson(`${BASE_URL}/proof-courses`);
};

export const getInstructorReviews = async (instructorId: string) => {
  return requestJson(`${BASE_URL}/instructor-reviews/${instructorId}`);
};

export const submitInstructorReview = async (payload: {
  instructorId: string;
  rating: number;
  comment?: string;
  userId: string;
  username: string;
}) => {
  return requestJson(`${BASE_URL}/instructor-reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

export const deleteInstructorReview = async (
  reviewId: string,
  userId: string
) => {
  const url = `${BASE_URL}/instructor-reviews/${reviewId}?userId=${encodeURIComponent(
    userId
  )}`;
  return requestJson(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ userId }),
  });
};

// ===== COURSE REVIEW APIs =====

// Lấy danh sách đánh giá của một khóa học
export const getCourseReviews = async (courseId: string) => {
  if (!courseId || courseId === "undefined" || courseId === "null") {
    throw new Error(`Invalid courseId: ${courseId}`);
  }
  return requestJson(`${BASE_URL}/course-reviews/${courseId}`);
};

// Submit đánh giá khóa học
export const submitCourseReview = async (payload: {
  courseId: string;
  rating: number;
  comment?: string;
  userId: string;
  username: string;
}) => {
  if (
    !payload.courseId ||
    payload.courseId === "undefined" ||
    payload.courseId === "null"
  ) {
    throw new Error(`Invalid courseId: ${payload.courseId}`);
  }
  if (
    !payload.userId ||
    payload.userId === "undefined" ||
    payload.userId === "null"
  ) {
    throw new Error(`Invalid userId: ${payload.userId}`);
  }
  return requestJson(`${BASE_URL}/course-reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

// Cập nhật đánh giá khóa học
export const updateCourseReview = async (
  reviewId: string,
  payload: {
    rating: number;
    comment?: string;
    userId: string;
  }
) => {
  return requestJson(`${BASE_URL}/course-reviews/${reviewId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

// Xóa đánh giá khóa học
export const deleteCourseReview = async (reviewId: string, userId: string) => {
  const url = `${BASE_URL}/course-reviews/${reviewId}?userId=${encodeURIComponent(
    userId
  )}`;
  return requestJson(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ userId }),
  });
};

export const saveQuizResult = async (
  lessonId: string,
  data: {
    userId: string;
    courseId: string;
    totalQuestions: number;
    correctCount: number;
    percentage?: number;
    answers: any[];
  }
) => {
  return requestJson(`${BASE_URL}/quiz-results/${lessonId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const getQuizResultsByCourse = async (
  courseId: string,
  userId: string
) => {
  return requestJson(
    `${BASE_URL}/quiz-results/course/${courseId}/user/${userId}`
  );
};

// ===== PAYMENT APIs =====

// Tạo link thanh toán cho khóa học
export const createPaymentLink = async (userId: string, courseId: string) => {
  if (!courseId || courseId === "undefined" || courseId === "null") {
    throw new Error(`Invalid courseId: ${courseId}`);
  }
  if (!userId || userId === "undefined" || userId === "null") {
    throw new Error(`Invalid userId: ${userId}`);
  }
  return requestJson(`${BASE_URL}/payments/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, courseId }),
  });
};

// Kiểm tra trạng thái thanh toán
export const checkPaymentStatus = async (orderCode: string) => {
  return requestJson(`${BASE_URL}/payments/status/${orderCode}`);
};

// Lấy lịch sử thanh toán của user
export const getUserPayments = async (userId: string) => {
  return requestJson(`${BASE_URL}/payments/user/${userId}`);
};

// Hủy thanh toán
export const cancelPayment = async (orderCode: string) => {
  return requestJson(`${BASE_URL}/payments/cancel/${orderCode}`, {
    method: "POST",
  });
};

// Verify và enroll sau khi thanh toán
export const verifyAndEnrollPayment = async (orderCode: string) => {
  return requestJson(`${BASE_URL}/payments/verify/${orderCode}`, {
    method: "POST",
  });
};

type ChatAIOptions = {
  selectedCourseId?: string | null;
  currentUserId?: string | null;
  requestSimilarQuestions?: boolean;
  numSimilarQuestions?: number;
};

// AI Chat API
export const chatWithAI = async (
  message: string,
  conversationHistory: any[] = [],
  options: ChatAIOptions = {}
) => {
  return requestJson(`${BASE_URL}/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversationHistory,
      selectedCourseId: options.selectedCourseId,
      currentUserId: options.currentUserId,
      requestSimilarQuestions: options.requestSimilarQuestions,
      numSimilarQuestions: options.numSimilarQuestions,
    }),
  });
};

// Lấy danh sách khóa học do instructor tạo
export const getCoursesByInstructor = async (instructorId: string) => {
  return requestJson(`${BASE_URL}/courses/instructor/${instructorId}`);
};

// Cập nhật khóa học
export const updateCourse = async (courseId: string, data: any) => {
  return requestJson(`${BASE_URL}/courses/${courseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

// Tóm tắt video sử dụng AI
export const summarizeVideo = async (
  file: { uri: string; name?: string; type?: string; size?: number },
  onProgress?: (progress: number) => void
) => {
  const form = new FormData();

  if (Platform.OS === "web") {
    const resp = await fetch(file.uri);
    const blob = await resp.blob();
    const filename = file.name || "video.mp4";
    // @ts-ignore
    const webFile = new File([blob], filename, {
      type: file.type || blob.type || "video/mp4",
    });
    // @ts-ignore
    form.append("video", webFile);
  } else {
    // @ts-ignore React Native FormData
    form.append("video", {
      uri: file.uri,
      name: file.name || "video.mp4",
      type: file.type || "video/mp4",
    } as any);
  }

  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/video-summary`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          onProgress?.(1);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          const errorMsg =
            errorData.error || errorData.details || "Upload failed";
          const error = new Error(errorMsg);
          // @ts-ignore
          error.error = errorData.error;
          // @ts-ignore
          error.details = errorData.details;
          reject(error);
        } catch {
          const error = new Error(xhr.responseText || "Upload failed");
          // @ts-ignore
          error.rawResponse = xhr.responseText;
          reject(error);
        }
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded / event.total);
        }
      };
    }

    xhr.send(form as any);
  });
};

export default function API() {
  return null;
}
