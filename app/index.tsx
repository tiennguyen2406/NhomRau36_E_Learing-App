// index.tsx
import { Redirect } from "expo-router";

// Điều hướng tự động đến màn hình chính
export default function Index() {
  return <Redirect href="/screens/LoginScreen" />;
}
