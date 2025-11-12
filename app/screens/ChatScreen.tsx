import React, { useMemo, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

type Msg = { id: string; fromMe?: boolean; text: string; time: string };

const MOCK_MSGS: Msg[] = [
  { id: "m1", text: "Hi, Nicholas Good Evening 😊", time: "10:45", fromMe: true },
  { id: "m2", text: "How was your UI/UX Design Course Like? 🤔", time: "12:45", fromMe: true },
  { id: "m3", text: "Hi, Morning too Ronald", time: "15:29" },
  { id: "m5", text: "Hello, i also just finished the Sketch Basic ⭐⭐⭐⭐", time: "15:29" },
  { id: "m6", text: "OMG, This is Amazing..", time: "15:59", fromMe: true },
];

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>(MOCK_MSGS);
  const listRef = useRef<FlatList>(null);

  const name = route?.params?.name || "Inbox";

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    setMessages((m) => [...m, { id: String(Math.random()), text, time: now.toTimeString().slice(0, 5), fromMe: true }]);
    setInput("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const renderItem = ({ item }: { item: Msg }) => (
    <View style={[styles.bubbleRow, item.fromMe ? styles.right : styles.left]}>
      <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={styles.bubbleText}>{item.text}</Text>
        <Text style={styles.bubbleTime}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name}</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message"
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity style={styles.micBtn} onPress={send}>
            <MaterialIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  listContent: { padding: 12, paddingBottom: 10 },
  bubbleRow: { flexDirection: "row", marginVertical: 6 },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { backgroundColor: "#20B2AA" },
  bubbleOther: { backgroundColor: "#e9eef3" },
  bubbleText: { color: "#fff" },
  bubbleTime: { color: "#f0f0f0", fontSize: 10, alignSelf: "flex-end", marginTop: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eee" },
  input: { flex: 1, backgroundColor: "#f2f2f2", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#20B2AA", alignItems: "center", justifyContent: "center" },
});

export default ChatScreen;


