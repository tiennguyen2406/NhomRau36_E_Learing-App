import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  iconType: "MaterialIcons" | "Ionicons";
  value?: string;
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const menuItems: MenuItem[] = [
    {
      id: "edit_profile",
      label: "Edit Profile",
      icon: "edit",
      iconType: "MaterialIcons",
    },
    {
      id: "payment",
      label: "Payment Option",
      icon: "payment",
      iconType: "MaterialIcons",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "notifications-none",
      iconType: "MaterialIcons",
    },
    {
      id: "security",
      label: "Security",
      icon: "security",
      iconType: "MaterialIcons",
    },
    {
      id: "language",
      label: "Language",
      icon: "language",
      iconType: "MaterialIcons",
      value: "English (US)",
    },
    {
      id: "dark_mode",
      label: "Dark Mode",
      icon: "dark-mode",
      iconType: "MaterialIcons",
    },
    {
      id: "terms",
      label: "Terms & Conditions",
      icon: "description",
      iconType: "MaterialIcons",
    },
    {
      id: "help",
      label: "Help Center",
      icon: "help-outline",
      iconType: "MaterialIcons",
    },
    {
      id: "invite",
      label: "Invite Friends",
      icon: "people-outline",
      iconType: "MaterialIcons",
    },
  ];

  const renderIcon = (item: MenuItem) => {
    if (item.iconType === "MaterialIcons") {
      return <MaterialIcons name={item.icon as any} size={22} color="#666" />;
    }
    return <Ionicons name={item.icon as any} size={22} color="#666" />;
  };

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity key={item.id} style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>{renderIcon(item)}</View>
        <ThemedText style={styles.menuItemText}>{item.label}</ThemedText>
      </View>
      <View style={styles.menuItemRight}>
        {item.value && (
          <ThemedText style={styles.valueText}>{item.value}</ThemedText>
        )}
        <MaterialIcons name="chevron-right" size={24} color="#999" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar} />
            <View style={styles.editAvatarButton}>
              <MaterialIcons name="photo-camera" size={18} color="#fff" />
            </View>
          </View>
          <ThemedText style={styles.profileName}>James S. Hernandez</ThemedText>
          <ThemedText style={styles.profileEmail}>
            hernandez.redfal@gmail.ac.in
          </ThemedText>
        </View>

        <View style={styles.menuSection}>{menuItems.map(renderMenuItem)}</View>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#fff",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    borderWidth: 3,
    borderColor: "#20B2AA",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#20B2AA",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  profileEmail: {
    fontSize: 14,
    color: "#777",
  },
  menuSection: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  valueText: {
    fontSize: 14,
    color: "#20B2AA",
    marginRight: 8,
  },
});

export default ProfileScreen;
