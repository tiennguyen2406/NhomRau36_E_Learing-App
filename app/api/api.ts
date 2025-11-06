const BASE_URL = "https://three6learningbackend.onrender.com"; // Local backend server

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
export const createProof = async (userId: string, url: string, type?: string, metadata?: any) => {
  return requestJson(`${BASE_URL}/proofs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, url, type, metadata }),
  });
};

export const uploadProofFile = async (file: { uri: string; name?: string; type?: string }) => {
  const form = new FormData();

  const isWeb = typeof window !== "undefined" && typeof document !== "undefined";
  const uri = file.uri;

  if (isWeb) {
    // Trên web, cần Blob/File thật sự
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const filename = file.name || "proof";
    // @ts-ignore - File tồn tại trên web
    const webFile = new File([blob], filename, { type: file.type || blob.type || "application/octet-stream" });
    // @ts-ignore
    form.append("file", webFile);
  } else {
    // Trên RN native
    // @ts-ignore RN FormData
    form.append("file", { uri, name: file.name || "proof", type: file.type || "application/octet-stream" } as any);
  }

  const res = await fetch(`${BASE_URL}/proofs/upload`, {
    method: "POST",
    // KHÔNG set Content-Type để fetch tự thêm boundary đúng
    body: form as any,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${t.slice(0,200)}`);
  }
  const data = await res.json();
  return data.url as string;
};

export default function API() {
  return null;
}
