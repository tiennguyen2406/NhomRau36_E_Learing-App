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
    // Nếu có _id nhưng không có id, copy _id thành id
    if (normalized._id && !normalized.id) {
      normalized.id = normalized._id.toString();
    }
    // Nếu có _id nhưng không có uid (cho user), copy _id thành uid
    if (
      normalized._id &&
      !normalized.uid &&
      (normalized.username || normalized.email)
    ) {
      normalized.uid = normalized._id.toString();
    }
    // Xóa _id để tránh confusion
    if (normalized._id) {
      delete normalized._id;
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

export const updateUser = async (uid: string, data: any) => {
  return requestJson(`${BASE_URL}/users/${uid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
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
  return requestJson(`${BASE_URL}/categories/${id}`, { method: "DELETE" as any });
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
  return requestJson(`${BASE_URL}/courses/${courseId}`);
};

export const getLessonCountByCourse = async (courseId: string) => {
  return requestJson(`${BASE_URL}/lessons/count/${courseId}`);
};

export const enrollCourse = async (uid: string, courseId: string) => {
  return requestJson(`${BASE_URL}/users/${uid}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
};

export const unenrollCourse = async (uid: string, courseId: string) => {
  return requestJson(`${BASE_URL}/users/${uid}/unenroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
};

export const getLessonsByCourse = async (courseId: string) => {
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

export default function API() {
  return null;
}
