import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  createCategory,
  createLesson,
  createUser,
  deleteCategory,
  deleteLesson,
  deleteUser,
  getCategories,
  getCourses,
  getLessons,
  getUsers,
  updateCategory,
  updateLesson,
  updateUser,
} from "../api/api";

type EntityType = "users" | "categories" | "lessons";

const AdminManageScreen: React.FC = () => {
  const [entity, setEntity] = useState<EntityType>("users");
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for each entity
  const [userForm, setUserForm] = useState({
    email: "",
    username: "",
    password: "",
    fullName: "",
    role: "student",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    iconUrl: "",
    isActive: true as boolean,
  });

  const [lessonForm, setLessonForm] = useState({
    courseId: "",
    title: "",
    description: "",
    videoUrl: "",
    duration: "0",
    order: "0",
    isPreview: false as boolean,
  });

  const columns = useMemo(() => {
    switch (entity) {
      case "users":
        return ["uid", "username", "email", "fullName", "role"]; 
      case "categories":
        return ["id", "name", "courseCount", "isActive"]; 
      case "lessons":
        return ["id", "courseId", "title", "order", "duration"]; 
      default:
        return [];
    }
  }, [entity]);

  const load = async () => {
    setLoading(true);
    try {
      if (entity === "users") {
        const data = await getUsers();
        setItems(Array.isArray(data) ? data : []);
      } else if (entity === "categories") {
        const data = await getCategories();
        setItems(Array.isArray(data) ? data : []);
      } else {
        const data = await getLessons();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };
  const filteredItems = useMemo(() => {
    const q = String(searchQuery || "").toLowerCase().trim();
    if (!q) return items;
    return items.filter((row: any) => {
      // Search across shown columns
      return columns.some((c) => String(row[c] ?? "").toLowerCase().includes(q));
    });
  }, [items, searchQuery, columns]);


  useEffect(() => {
    load();
  }, [entity]);

  useEffect(() => {
    // Preload courses for lesson form
    (async () => {
      try {
        const cs = await getCourses();
        setCourses(Array.isArray(cs) ? cs : []);
      } catch {}
    })();
  }, []);

  const resetForms = () => {
    setEditingId(null);
    setUserForm({ email: "", username: "", password: "", fullName: "", role: "student" });
    setCategoryForm({ name: "", description: "", iconUrl: "", isActive: true });
    setLessonForm({ courseId: "", title: "", description: "", videoUrl: "", duration: "0", order: "0", isPreview: false });
  };

  const onSubmit = async () => {
    try {
      setLoading(true);
      if (entity === "users") {
        if (editingId) {
          await updateUser(editingId, { ...userForm });
        } else {
          await createUser({ ...userForm });
        }
      } else if (entity === "categories") {
        if (editingId) {
          await updateCategory(editingId, { ...categoryForm });
        } else {
          await createCategory({ ...categoryForm });
        }
      } else if (entity === "lessons") {
        const payload = {
          ...lessonForm,
          duration: Number(lessonForm.duration) || 0,
          order: Number(lessonForm.order) || 0,
        } as any;
        if (editingId) {
          await updateLesson(editingId, payload);
        } else {
          await createLesson(payload);
        }
      }
      resetForms();
      await load();
      Alert.alert("Thành công", editingId ? "Đã cập nhật" : "Đã tạo mới");
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Thao tác thất bại (có thể backend chưa hỗ trợ)");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      setLoading(true);
      if (entity === "users") await deleteUser(id);
      if (entity === "categories") await deleteCategory(id);
      if (entity === "lessons") await deleteLesson(id);
      await load();
      Alert.alert("Thành công", "Đã xóa");
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Xóa thất bại (có thể backend chưa hỗ trợ)");
    } finally {
      setLoading(false);
    }
  };

  const onSelectRow = (row: any) => {
    setEditingId(row.uid || row.id || null);
    if (entity === "users") {
      setUserForm({
        email: row.email || "",
        username: row.username || "",
        password: "",
        fullName: row.fullName || "",
        role: row.role || "student",
      });
    } else if (entity === "categories") {
      setCategoryForm({
        name: row.name || "",
        description: row.description || "",
        iconUrl: row.iconUrl || "",
        isActive: !!row.isActive,
      });
    } else if (entity === "lessons") {
      setLessonForm({
        courseId: row.courseId || "",
        title: row.title || "",
        description: row.description || "",
        videoUrl: row.videoUrl || "",
        duration: String(row.duration || 0),
        order: String(row.order || 0),
        isPreview: !!row.isPreview,
      });
    }
  };

  const SectionSelector = () => {
    const opts: { key: EntityType; label: string }[] = [
      { key: "users", label: "Users" },
      { key: "categories", label: "Categories" },
      { key: "lessons", label: "Lessons" },
    ];
    return (
      <View style={styles.selectorRow}>
        {opts.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => { setEntity(o.key); resetForms(); }}
            style={[styles.selectorBtn, entity === o.key && styles.selectorBtnActive]}
          >
            <Text style={[styles.selectorText, entity === o.key && styles.selectorTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderForm = () => {
    if (entity === "users") return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? "Sửa User" : "Thêm User"}</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Email"
              autoCorrect={false}
              autoCapitalize="none"
              value={userForm.email}
              onChangeText={(t) => setUserForm((s) => ({ ...s, email: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              placeholder="Username"
              autoCorrect={false}
              autoCapitalize="none"
              value={userForm.username}
              onChangeText={(t) => setUserForm((s) => ({ ...s, username: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              placeholder="Mật khẩu"
              secureTextEntry
              autoCorrect={false}
              autoCapitalize="none"
              value={userForm.password}
              onChangeText={(t) => setUserForm((s) => ({ ...s, password: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ tên</Text>
            <TextInput
              placeholder="Họ tên"
              autoCorrect={false}
              value={userForm.fullName}
              onChangeText={(t) => setUserForm((s) => ({ ...s, fullName: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }] }>
            <Text style={styles.label}>Vai trò</Text>
            <TextInput
              placeholder="student / instructor / admin"
              autoCorrect={false}
              autoCapitalize="none"
              value={userForm.role}
              onChangeText={(t) => setUserForm((s) => ({ ...s, role: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.actions}>
          {editingId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={loading}>
            <Text style={styles.saveText}>{editingId ? "Cập nhật" : "Thêm mới"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (entity === "categories") return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? "Sửa Danh mục" : "Thêm Danh mục"}</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên danh mục</Text>
            <TextInput
              placeholder="Tên danh mục"
              autoCorrect={false}
              value={categoryForm.name}
              onChangeText={(t) => setCategoryForm((s) => ({ ...s, name: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Icon URL</Text>
            <TextInput
              placeholder="Icon URL"
              autoCorrect={false}
              autoCapitalize="none"
              value={categoryForm.iconUrl}
              onChangeText={(t) => setCategoryForm((s) => ({ ...s, iconUrl: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }] }>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              placeholder="Mô tả"
              value={categoryForm.description}
              onChangeText={(t) => setCategoryForm((s) => ({ ...s, description: t }))}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>
        <View style={styles.actions}>
          {editingId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={loading}>
            <Text style={styles.saveText}>{editingId ? "Cập nhật" : "Thêm mới"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? "Sửa Bài học" : "Thêm Bài học"}</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Course ID</Text>
            <TextInput
              placeholder="Course ID"
              autoCorrect={false}
              autoCapitalize="none"
              value={lessonForm.courseId}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, courseId: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tiêu đề</Text>
            <TextInput
              placeholder="Tiêu đề"
              autoCorrect={false}
              value={lessonForm.title}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, title: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              placeholder="Mô tả"
              value={lessonForm.description}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, description: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Video URL</Text>
            <TextInput
              placeholder="Video URL"
              autoCorrect={false}
              autoCapitalize="none"
              value={lessonForm.videoUrl}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, videoUrl: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thứ tự</Text>
            <TextInput
              placeholder="Thứ tự"
              keyboardType="numeric"
              value={lessonForm.order}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, order: t }))}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Thời lượng (phút)</Text>
            <TextInput
              placeholder="Thời lượng (phút)"
              keyboardType="numeric"
              value={lessonForm.duration}
              onChangeText={(t) => setLessonForm((s) => ({ ...s, duration: t }))}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.actions}>
          {editingId && (
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={onSubmit} disabled={loading}>
            <Text style={styles.saveText}>{editingId ? "Cập nhật" : "Thêm mới"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[styles.rowItem, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}
      onPress={() => onSelectRow(item)}
    >
      {columns.map((c, idx) => (
        <Text key={c} style={[styles.cell, idx === columns.length - 1 ? styles.cellLast : styles.cellWithBorder, styles.cellText]} numberOfLines={1} allowFontScaling={false}>
          {String(item[c] ?? "")}
        </Text>
      ))}
      <View style={[styles.cell, styles.cellLast]}>
        <TouchableOpacity onPress={() => onDelete(item.uid || item.id)} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Quản lý</Text>

        <SectionSelector />

        {renderForm()}

        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Danh sách {entity}</Text>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.tableInner}>
              <View style={styles.headerRow}>
                {columns.map((c, idx) => (
                  <Text
                    key={c}
                    style={[styles.cell, idx === columns.length - 1 ? styles.cellLast : styles.cellWithBorder, styles.headerText]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    {c}
                  </Text>
                ))}
                <Text
                  style={[styles.cell, styles.cellLast, styles.headerText]}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  Actions
                </Text>
              </View>
              <FlatList
                data={filteredItems}
                keyExtractor={(it) => String(it.uid || it.id)}
                renderItem={renderRow}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                refreshing={loading}
                onRefresh={load}
              />
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    paddingLeft: 30,
    paddingTop: 30,
    marginBottom: 12,
  },
  selectorRow: {
    flexDirection: "row",
    marginBottom: 12,
    paddingLeft: 30,
  },
  selectorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#eaeaea",
    borderRadius: 8,
    marginRight: 8,
  },
  selectorBtnActive: {
    backgroundColor: "#20B2AA",
  },
  selectorText: {
    color: "#333",
    fontWeight: "600",
  },
  selectorTextActive: {
    color: "#fff",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  inputGroup: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    paddingLeft: 2,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ddd",
    borderRadius: 8,
  },
  cancelText: { color: "#222", fontWeight: "700" },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#20B2AA",
    borderRadius: 8,
  },
  saveText: { color: "#fff", fontWeight: "700" },
  tableCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tableInner: {
    minWidth: 800,
    flex: 1,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical: 6,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e6e6e6",
  },
  rowItem: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical: 10,
    alignItems: "center",
  },
  cell: {
    flex: 1,
    paddingRight: 6,
    paddingVertical: 6,
    minWidth: 140,
  },
  cellWithBorder: {
    borderRightWidth: 1,
    borderRightColor: "#e6e6e6",
  },
  cellLast: {
    borderRightWidth: 0,
  },
  rowEven: {
    backgroundColor: "#ffffff",
  },
  rowOdd: {
    backgroundColor: "#fafafa",
  },
  headerText: { fontWeight: "700", color: "#333" },
  cellText: { color: "#333" },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ff4d4f",
    borderRadius: 6,
  },
  deleteText: { color: "#fff", fontWeight: "700" },
  separator: {
    height: 1,
    backgroundColor: "#eee",
  },
});

export default AdminManageScreen;


