import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

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

// Định nghĩa kiểu cho routes trong ứng dụng
export type RootStackParamList = {
  Auth: undefined;
  Home: undefined; // fallback so navigate('Home') is valid
  MainTabs: undefined;
  Search: undefined;
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
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  HomeStack: undefined;
  Courses: undefined;
  Inbox: undefined;
  Games: undefined;
  ProfileStack: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
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

// Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case "HomeStack":
              iconName = "home";
              break;
            case "Courses":
              iconName = "book";
              break;
            case "Inbox":
              iconName = "chat";
              break;
            case "Games":
              iconName = "games";
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
      <Tab.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{ tabBarLabel: "HOME" }}
      />
      <Tab.Screen
        name="Courses"
        component={MyCoursesScreen}
        options={{ tabBarLabel: "MY COURSES" }}
      />
      <Tab.Screen
        name="Inbox"
        component={EmptyPlaceholder}
        options={{ tabBarLabel: "INBOX" }}
      />
      <Tab.Screen
        name="Games"
        component={EmptyPlaceholder}
        options={{ tabBarLabel: "GAMES" }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: "PROFILE" }}
      />
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
