import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';

import { createUser, getUsers } from '../api/api';

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', username: '', password: '' });

  // ------------------- Đăng ký -------------------
  const handleRegister = async () => {
    if (!registerData.email || !registerData.username || !registerData.password) {
      Alert.alert('Lỗi', 'Điền đầy đủ thông tin đăng ký');
      return;
    }

    try {
      const data = {
        uid: null,
        email: registerData.email,
        username: registerData.username,
        password: registerData.password,
        fullName: null,
        profileImage: null,
        role: 'student',
        preferences: { language: 'vi', darkMode: false, notifications: true },
      };
      await createUser(data);
      Alert.alert('Thành công', 'Đăng ký thành công! Hãy đăng nhập.');
      // Chuyển về tab Đăng nhập và điền sẵn thông tin vừa đăng ký
      setIsLogin(true);
      setLoginData({ username: registerData.username, password: registerData.password });
      setRegisterData({ email: '', username: '', password: '' });
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Đăng ký thất bại');
    }
  };

  // ------------------- Đăng nhập -------------------
  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      setErrorMessage('Vui lòng nhập tên đăng nhập và mật khẩu');
      Alert.alert('Lỗi', 'Điền tên đăng nhập và mật khẩu');
      return;
    }

    try {
      const users = await getUsers();
      const user = users.find(
        (u: any) => u.username === loginData.username && u.password === loginData.password
      );

      if (user) {
        setErrorMessage(null);
        await AsyncStorage.setItem('currentUsername', user.username);
        Alert.alert('Thành công', `Tài khoản tồn tại. Xin chào ${user.username}`);
        navigation.getParent()?.navigate('MainTabs' as never);
      } else {
        setErrorMessage('Tài khoản không tồn tại hoặc mật khẩu sai');
        Alert.alert('Lỗi', 'Tài khoản không tồn tại hoặc mật khẩu sai');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.');
      Alert.alert('Lỗi', 'Đăng nhập thất bại');
    }
  };

  // ------------------- Social Login (Demo) -------------------
  const handleSocialLogin = (provider: 'google' | 'apple') => {
    console.log(`Social login with ${provider}`);
    navigation.getParent()?.navigate('MainTabs' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#20B2AA', '#2E8B57']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainContent}
          >
            {/* Logo */}
            <View style={styles.brandContainer}>
              <View style={styles.logoContainer}>
                <MaterialIcons name="school" size={40} color="#fff" />
              </View>
              <Text style={styles.brandName}>36Learning</Text>
            </View>

            {/* Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Đăng nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Đăng ký</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.motivationalText}>Bắt đầu hành trình học tập của bạn!</Text>

            {/* Form */}
            <View style={styles.formContainer}>
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Địa chỉ email</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập email của bạn"
                    placeholderTextColor="#999"
                    value={registerData.email}
                    onChangeText={(text) => setRegisterData({ ...registerData, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên đăng nhập</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập tên đăng nhập"
                  placeholderTextColor="#999"
                  value={isLogin ? loginData.username : registerData.username}
                  onChangeText={(text) =>
                    isLogin ? setLoginData({ ...loginData, username: text }) : setRegisterData({ ...registerData, username: text })
                  }
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Nhập mật khẩu của bạn"
                    placeholderTextColor="#999"
                    value={isLogin ? loginData.password : registerData.password}
                    onChangeText={(text) =>
                      isLogin ? setLoginData({ ...loginData, password: text }) : setRegisterData({ ...registerData, password: text })
                    }
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>

              {isLogin && !!errorMessage && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}

              {/* Submit */}
              <TouchableOpacity style={styles.submitButton} onPress={isLogin ? handleLogin : handleRegister}>
                <Text style={styles.submitButtonText}>{isLogin ? 'Login' : 'Đăng ký'}</Text>
              </TouchableOpacity>

              {/* Social Login */}
              <View style={styles.socialContainer}>
                <Text style={styles.socialText}>Hoặc tiếp tục với</Text>
                <View style={styles.socialButtons}>
                  <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('google')}>
                    <Image
                      source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                      style={styles.socialIcon}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('apple')}>
                    <MaterialIcons name="apple" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

// ----------------------- Styles -----------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  mainContent: { flex: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 30 },
  brandContainer: { alignItems: 'center', marginBottom: 30 },
  logoContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  brandName: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 25, padding: 4, marginBottom: 20 },
  toggleButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  toggleText: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  toggleTextActive: { color: '#fff' },
  motivationalText: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 30 },
  formContainer: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: '500', color: '#fff', marginBottom: 8 },
  textInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#333' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16 },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#333' },
  eyeButton: { padding: 4 },
  submitButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 25 },
  submitButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  socialContainer: { alignItems: 'center' },
  socialText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 15 },
  socialButtons: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  socialButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  socialIcon: { width: 24, height: 24 },
  errorText: { color: '#ffdddd', backgroundColor: 'rgba(255,0,0,0.15)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 12 },
});
