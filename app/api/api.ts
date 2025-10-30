const BASE_URL = 'http://192.168.1.147:4000'; // thay bằng URL backend của bạn

async function requestJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    // Try to extract text for better error message
    const bodyText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${bodyText.slice(0, 200)}`);
  }
  if (!contentType.includes('application/json')) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`Expected JSON but received ${contentType || 'unknown'}: ${bodyText.slice(0, 200)}`);
  }
  return res.json();
}

export const createUser = async (data: any) => {
  return requestJson(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const getUsers = async () => {
  return requestJson(`${BASE_URL}/users`);
};

export const getCategories = async () => {
  return requestJson(`${BASE_URL}/categories`);
};
export const getCourses = async () => {
  return requestJson(`${BASE_URL}/courses`);
};