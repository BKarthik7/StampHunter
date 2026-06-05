import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSignUp } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function SignupScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.includes('@')) e.email = 'Enter a valid email';
    if (username.length < 3) e.username = 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) e.username = 'Letters, numbers, and underscores only';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!isLoaded || !validate()) return;
    setLoading(true);
    setErrors({});

    try {
      await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string; meta?: { paramName?: string } }[] };
      const firstErr = clerkErr.errors?.[0];
      if (firstErr?.meta?.paramName === 'username') {
        setErrors({ username: firstErr.message });
      } else {
        setErrors({ general: firstErr?.message ?? 'Sign up failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // AuthGuard will redirect to (tabs)
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setErrors({ code: clerkErr.errors?.[0]?.message ?? 'Invalid code' });
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={[styles.container, { justifyContent: 'center', paddingHorizontal: Spacing.xl }]}>
        <Text style={styles.wordmark}>Check your email</Text>
        <Text style={[styles.tagline, { marginBottom: 32 }]}>
          We sent a 6-digit code to {email}
        </Text>

        <Text style={styles.label}>Verification code</Text>
        <TextInput
          style={styles.input}
          placeholder="123456"
          placeholderTextColor={Colors.muted}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        {errors.code ? <Text style={styles.errorText}>{errors.code}</Text> : null}

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Verify email</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.wordmark}>StampHunter</Text>
          <Text style={styles.tagline}>Create your archive.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create account</Text>

          {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="you@example.com"
              placeholderTextColor={Colors.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, errors.username ? styles.inputError : null]}
              placeholder="stamper_jane"
              placeholderTextColor={Colors.muted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="Min. 8 characters"
              placeholderTextColor={Colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Create account</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  inner: { flexGrow: 1, paddingHorizontal: Spacing.xl, justifyContent: 'center', paddingVertical: 48 },
  header: { alignItems: 'center', marginBottom: 40 },
  wordmark: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 36, color: Colors.ink },
  tagline: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.muted, marginTop: 4 },
  form: {
    backgroundColor: Colors.white, borderRadius: 12, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  formTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: Colors.ink, marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.ink, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.white,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.ink,
  },
  inputError: { borderColor: Colors.error },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.error, marginTop: 4 },
  btnPrimary: { backgroundColor: Colors.stampRed, borderRadius: 6, paddingVertical: 13, alignItems: 'center', marginTop: Spacing.sm },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.muted },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.postmarkBlue },
});
