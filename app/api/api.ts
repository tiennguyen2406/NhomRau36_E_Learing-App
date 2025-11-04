// Thay đổi URL này thành địa chỉ server local của bạn
// const BASE_URL = "http://localhost:4000";
const BASE_URL = "https://three6learningbackend.onrender.com";

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
  return res.json();
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

export const getUsers = async () => {
  return requestJson(`${BASE_URL}/users`);
};

export const getUserByUsername = async (username: string) => {
  const users = await requestJson(`${BASE_URL}/users`);
  return users.find((user: any) => user.username === username);
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

export const getCategories = async () => {
  return requestJson(`${BASE_URL}/categories`);
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

export default function API() {
  return null;
}
