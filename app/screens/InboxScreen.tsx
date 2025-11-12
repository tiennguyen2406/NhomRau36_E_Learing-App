import React, { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { InboxStackParamList, RootStackNavProps } from "../navigation/AppNavigator";

type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
};

const MOCK_CHATS: ChatItem[] = [
  { id: "1", name: "Virginia M. Patterson", lastMessage: "Hi, Good Evening Bro!", time: "14:59", unread: 3 },
  { id: "2", name: "Dominick S. Jenkins", lastMessage: "I just Finished it!", time: "06:15", unread: 2 },
  { id: "3", name: "Duncan E. Hoffman", lastMessage: "How are you?", time: "08:20" },
  { id: "4", name: "Roy R. McCray", lastMessage: "OMG, This is Amazing..", time: "21:07", unread: 7 },
];

const InboxScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavProps>();
  const [tab, setTab] = useState<"chat" | "calls">("chat");
  const [search, setSearch] = useState("");

  const data = useMemo(() => {
    const list = MOCK_CHATS;
    const q = search.trim().toLowerCase();
    return q ? list.filter((c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)) : list;
  }, [search]);

  const openChat = (item: ChatItem) => {
    // Navigate to Chat within Inbox stack
    // @ts-ignore route typing simplify
    navigation.navigate("Chat" as any, { chatId: item.id, name: item.name });
  };

  const renderItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity style={styles.row} onPress={() => openChat(item)}>
      <View style={styles.avatar} />
      <View style={styles.rowCenter}>
        <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
        <Text numberOfLines={1} style={styles.preview}>{item.lastMessage}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.time}>{item.time}</Text>
        {item.unread ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === "chat" && styles.tabActive]} onPress={() => setTab("chat")}>
          <Text style={[styles.tabText, tab === "chat" && styles.tabTextActive]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === "calls" && styles.tabActive]} onPress={() => setTab("calls")}>
          <Text style={[styles.tabText, tab === "calls" && styles.tabTextActive]}>Calls</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchBox}>
        <TextInput
          placeholder="Tìm kiếm..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>
      <FlatList data={data} renderItem={renderItem} keyExtractor={(it) => it.id} ItemSeparatorComponent={() => <View style={styles.sep} />} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  tabs: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 8 },
  tabBtn: { flex: 1, backgroundColor: "#e9eef3", borderRadius: 16, paddingVertical: 10, alignItems: "center", marginRight: 8 },
  tabActive: { backgroundColor: "#20B2AA" },
  tabText: { fontWeight: "700", color: "#333" },
  tabTextActive: { color: "#fff" },
  searchBox: { paddingHorizontal: 20, marginBottom: 8 },
  searchInput: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#e6e6e6" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ccc", marginRight: 12 },
  rowCenter: { flex: 1 },
  name: { fontWeight: "700", color: "#222" },
  preview: { color: "#666", marginTop: 2 },
  rowRight: { alignItems: "flex-end" },
  time: { color: "#999", fontSize: 12 },
  unreadBadge: { marginTop: 6, backgroundColor: "#20B2AA", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  unreadText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  sep: { height: 1, backgroundColor: "#f0f0f0" },
});

export default InboxScreen;


