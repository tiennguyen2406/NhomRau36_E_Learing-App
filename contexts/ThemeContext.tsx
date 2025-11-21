import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useRNColorScheme } from "react-native";
import { getUserByUsername, updateUserPreferences } from "../app/api/api";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const systemTheme = useRNColorScheme();
  const [theme, setThemeState] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);

  useEffect(() => {
    loadTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTheme = async () => {
    try {
      // Lấy username từ AsyncStorage
      const username = await AsyncStorage.getItem("currentUsername");

      if (username) {
        try {
          // Lấy user preference từ database
          const userData = await getUserByUsername(username);
          if (userData?.uid) {
            setUserUid(userData.uid);
            setUserPreferences(userData.preferences || {});

            if (userData?.preferences?.darkMode !== undefined) {
              const themeFromDB = userData.preferences.darkMode
                ? "dark"
                : "light";
              setThemeState(themeFromDB);
              // Đồng bộ với AsyncStorage
              await AsyncStorage.setItem("theme", themeFromDB);
              setIsInitialized(true);
              return;
            }
          }
        } catch (dbError) {
          console.error("Error loading theme from database:", dbError);
          // Fallback to local storage if DB fails
        }
      }

      // Nếu không có user hoặc chưa set preference, dùng local storage hoặc system theme
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
      } else {
        setThemeState(systemTheme === "dark" ? "dark" : "light");
      }
    } catch (error) {
      console.error("Error loading theme:", error);
      setThemeState(systemTheme === "dark" ? "dark" : "light");
    } finally {
      setIsInitialized(true);
    }
  };

  const saveThemeToDatabase = async (newTheme: Theme, retryCount = 0) => {
    const MAX_RETRIES = 2;

    try {
      let uidToUse = userUid;
      let prefsToUse = userPreferences;

      // Nếu chưa có uid cached, lấy từ username
      if (!uidToUse) {
        const username = await AsyncStorage.getItem("currentUsername");
        if (!username) {
          console.log("No username found, skipping database save");
          return;
        }

        try {
          const userData = await getUserByUsername(username);
          if (userData?.uid) {
            uidToUse = userData.uid;
            prefsToUse = userData.preferences || {};
            setUserUid(uidToUse);
            setUserPreferences(prefsToUse);
          } else {
            console.log("No uid found in user data, skipping database save");
            return;
          }
        } catch (fetchError) {
          console.error("Error fetching user data:", fetchError);
          if (retryCount < MAX_RETRIES) {
            setTimeout(() => {
              saveThemeToDatabase(newTheme, retryCount + 1).catch(() => {});
            }, 2000);
          }
          return;
        }
      }

      // Tạo updated preferences
      const updatedPreferences = {
        ...(prefsToUse || {}),
        darkMode: newTheme === "dark",
      };

      // Dùng endpoint tối ưu cho preferences
      if (uidToUse) {
        await updateUserPreferences(uidToUse, updatedPreferences);

        // Cập nhật cache sau khi lưu thành công
        setUserPreferences(updatedPreferences);
        console.log("✅ Theme saved to database successfully");
      }
    } catch (error: any) {
      console.error(
        "❌ Error saving theme to database:",
        error?.message || error
      );

      // Chỉ retry nếu chưa vượt quá số lần retry và không phải lỗi 404 (endpoint không tồn tại)
      if (retryCount < MAX_RETRIES && !error?.message?.includes("404")) {
        console.log(
          `🔄 Retrying to save theme (attempt ${
            retryCount + 1
          }/${MAX_RETRIES})...`
        );
        setTimeout(() => {
          saveThemeToDatabase(newTheme, retryCount + 1).catch(() => {
            console.error("Retry failed to save theme to database");
          });
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else if (error?.message?.includes("404")) {
        console.warn(
          "⚠️ Preferences endpoint not found, falling back to updateUser"
        );
        // Fallback: dùng updateUser nếu endpoint preferences không tồn tại
        try {
          const { updateUser } = await import("../app/api/api");
          if (userUid) {
            await updateUser(userUid, {
              preferences: {
                ...(userPreferences || {}),
                darkMode: newTheme === "dark",
              },
            });
            console.log("✅ Theme saved using fallback method");
          }
        } catch (fallbackError) {
          console.error("❌ Fallback save also failed:", fallbackError);
        }
      }
    }
  };

  const setTheme = async (newTheme: Theme) => {
    // Cập nhật state ngay lập tức để UI thay đổi ngay
    setThemeState(newTheme);

    // Lưu vào AsyncStorage ngay (không block)
    AsyncStorage.setItem("theme", newTheme).catch((err) =>
      console.error("Error saving theme to storage:", err)
    );

    // Lưu vào database ở background (không block UI)
    saveThemeToDatabase(newTheme);
  };

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    await setTheme(newTheme);
  };

  if (!isInitialized) {
    return null; // Hoặc return loading indicator
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
