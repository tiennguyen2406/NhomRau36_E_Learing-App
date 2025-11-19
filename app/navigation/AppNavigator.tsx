import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserByUsername } from "../api/api";

// Màn hình
import CategoryScreen from "../screens/CategoryScreen";
import MyCoursesScreen from "../screens/MyCoursesScreen";
import CourseListScreen from "../screens/CourseListScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SearchScreen from "../screens/SearchScreen";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import CourseLessonsScreen from "../screens/CourseLessonsScreen";
import VideoPlayerScreen from "../screens/VideoPlayerScreen";
import InstructorDetailScreen from "../screens/InstructorDetailScreen";
import MentorListScreen from "../screens/MentorListScreen";
import AdminManageScreen from "../screens/AdminManageScreen";
import AdminStatsScreen from "../screens/AdminStatsScreen";
import CreateCourseScreen from "../screens/CreateCourseScreen";
import CreateQuizLessonScreen from "../screens/CreateQuizLessonScreen";
import CreateVideoLessonScreen from "../screens/CreateVideoLessonScreen";
import InboxScreen from "../screens/InboxScreen";
import ChatScreen from "../screens/ChatScreen";
import QuizLessonScreen from "../screens/QuizLessonScreen";
import AIChatScreen from "../screens/AIChatScreen";

// Định nghĩa kiểu cho routes trong ứng dụng
export type RootStackParamList = {
  Auth: undefined;
  Home: undefined; // fallback so navigate('Home') is valid
  MainTabs: undefined;
  Search: undefined;
  CreateQuizLesson:
    | {
        courseId?: string;
        title?: string;
      }
    | undefined;
  CreateVideoLesson: {
    courseId: string;
    title?: string;
  };
  Category: undefined;
  MentorList: undefined;
  InstructorDetail: { instructorId: string };
  CourseList: {
    categoryName: string;
    categoryId: string;
  };
  CourseDetail: { courseId: string };
  CourseLessons: { courseId: string; title?: string };
  VideoPlayer: { videoUrl: string; title?: string };
  QuizLesson: {
    courseId: string;
    lessonId: string;
    title: string;
    description?: string;
    questions: {
      text: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
    }[];
    currentUserId?: string | null;
  };
  AIChat: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  // Tabs for normal user
  HomeStack: undefined;
  Courses: undefined;
  Inbox: undefined;
  AIChat: undefined;
  CreateCourseTab: undefined;
  ProfileStack: undefined;
  // Tabs for admin
  AdminManage: undefined;
  AdminStats: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
};

export type InboxStackParamList = {
  Inbox: undefined;
  Chat: { chatId: string; name?: string };
};

// Navigation Props
export type RootStackNavProps = NativeStackNavigationProp<RootStackParamList>;
export type HomeStackNavProps = NativeStackNavigationProp<HomeStackParamList>;
export type ProfileStackNavProps =
  NativeStackNavigationProp<ProfileStackParamList>;

// Stacks
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const InboxStack = createNativeStackNavigator<InboxStackParamList>();

// Auth Navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
};

// Home Stack
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
};

// Profile Stack
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    </ProfileStack.Navigator>
  );
};

// Inbox Stack
const InboxStackNavigator = () => {
  return (
    <InboxStack.Navigator screenOptions={{ headerShown: false }}>
      <InboxStack.Screen name="Inbox" component={InboxScreen} />
      <InboxStack.Screen name="Chat" component={ChatScreen} />
    </InboxStack.Navigator>
  );
};

// Tab Navigator
const TabNavigator = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isInstructor, setIsInstructor] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const username = await AsyncStorage.getItem("currentUsername");
        if (mounted) setIsAdmin(username === "admin");
        if (username) {
          try {
            const user = await getUserByUsername(username);
            if (mounted) setIsInstructor((user?.role || "").toLowerCase() === "instructor");
          } catch {}
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case "HomeStack":
              iconName = "home";
              break;
            case "AdminManage":
              iconName = "admin-panel-settings";
              break;
            case "AdminStats":
              iconName = "assessment";
              break;
            case "Courses":
              iconName = "book";
              break;
            case "Inbox":
              iconName = "chat";
              break;
            case "AIChat":
              iconName = "psychology";
              break;
            case "CreateCourseTab":
              iconName = "add-circle-outline";
              break;
            case "ProfileStack":
              iconName = "person";
              break;
            default:
              iconName = "circle";
          }

          return (
            <MaterialIcons name={iconName as any} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: "#20B2AA",
        tabBarInactiveTintColor: "#666",
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      {/* Common: HOME */}
      <Tab.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{ tabBarLabel: "HOME" }}
      />

      {isAdmin ? (
        <>
          <Tab.Screen
            name="AdminManage"
            component={AdminManageScreen}
            options={{ tabBarLabel: "QUẢN LÝ" }}
          />
          {/* <Tab.Screen
            name="AdminStats"
            component={AdminStatsScreen}
            options={{ tabBarLabel: "TÌM KIẾM" }}
          /> */}
          <Tab.Screen
            name="AdminStats"
            component={AdminStatsScreen}
            options={{ tabBarLabel: "THỐNG KÊ" }}
          />
          <Tab.Screen
            name="ProfileStack"
            component={ProfileStackNavigator}
            options={{ tabBarLabel: "PROFILE" }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="Courses"
            component={MyCoursesScreen}
            options={{ tabBarLabel: "MY COURSES" }}
          />
          <Tab.Screen
            name="Inbox"
            component={InboxStackNavigator}
            options={{ tabBarLabel: "INBOX" }}
          />
          {isInstructor ? (
            <>
              <Tab.Screen
                name="CreateCourseTab"
                component={CreateCourseScreen}
                options={{ tabBarLabel: "TẠO KHÓA HỌC" }}
              />
              <Tab.Screen
                name="AIChat"
                component={AIChatScreen}
                options={{ tabBarLabel: "AI BOT" }}
              />
            </>
          ) : (
            <Tab.Screen
              name="AIChat"
              component={AIChatScreen}
              options={{ tabBarLabel: "AI BOT" }}
            />
          )}
          <Tab.Screen
            name="ProfileStack"
            component={ProfileStackNavigator}
            options={{ tabBarLabel: "PROFILE" }}
          />
        </>
      )}
    </Tab.Navigator>
  );
};

// Placeholder cho các tab chưa có nội dung
const EmptyPlaceholder = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>Đang phát triển...</Text>
  </View>
);

// Root Navigator
const AppNavigator = () => {
  const isAuthenticated = false; // Thay đổi logic xác thực thực tế ở đây

  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={isAuthenticated ? "MainTabs" : "Auth"}
    >
      {/* Always register all routes so navigation is possible from nested stacks */}
      <RootStack.Screen name="Auth" component={AuthNavigator} />
      {/* Fallback alias so any navigate('Home') still works */}
      <RootStack.Screen name="Home" component={HomeScreen} />
      <RootStack.Screen name="MainTabs" component={TabNavigator} />
      <RootStack.Screen name="Search" component={SearchScreen} />
      <RootStack.Screen name="Category" component={CategoryScreen} />
      <RootStack.Screen name="MentorList" component={MentorListScreen} />
      <RootStack.Screen name="InstructorDetail" component={InstructorDetailScreen} />
      <RootStack.Screen name="CourseList" component={CourseListScreen} />
      <RootStack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <RootStack.Screen name="CourseLessons" component={CourseLessonsScreen} />
      <RootStack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
      <RootStack.Screen name="QuizLesson" component={QuizLessonScreen} />
      <RootStack.Screen name="CreateQuizLesson" component={CreateQuizLessonScreen} />
      <RootStack.Screen name="CreateVideoLesson" component={CreateVideoLessonScreen} />
      <RootStack.Screen name="AIChat" component={AIChatScreen} />
    </RootStack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
});

export default AppNavigator;
