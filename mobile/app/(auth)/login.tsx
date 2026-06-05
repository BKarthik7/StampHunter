import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSignIn } from '@clerk/expo';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Colors, Spacing } from '../../constants/theme';

export default function LoginScreen() {
  // @clerk/expo v3 custom flow: useSignIn() returns { signIn, errors, fetchStatus }.
  // signIn.password() takes the identifier + password together and creates the
  // sign-in internally; signIn.finalize() activates the resulting session.
  const { signIn, fetchStatus } = useSignIn();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (fetchStatus === 'fetching') return;
    setError('');
    setLoading(true);

    try {
      // Attempt the password factor — identifier + password in a single call.
      const { error: passErr } = await signIn.password({
        identifier: identifier.trim(),
        password,
      });
      if (passErr) { setError(passErr.message); return; }

      // Activate the session; AuthGuard in _layout.tsx redirects to (tabs).
      if (signIn.status === 'complete') {
        const { error: finalErr } = await signIn.finalize();
        if (finalErr) { setError(finalErr.message); return; }
      } else {
        // e.g. needs_second_factor / needs_client_trust — not handled yet.
        setError('Additional verification is required to sign in.');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>StampHunter</Text>
          <Text style={styles.tagline}>Stamp your memories.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign in</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email or username</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="you@example.com or username"
              placeholderTextColor={Colors.muted}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="••••••••"
              placeholderTextColor={Colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  wordmark: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.muted,
    marginTop: 4,
  },
  form: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
    color: Colors.ink,
    marginBottom: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.ink,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.ink,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  btnPrimary: {
    backgroundColor: Colors.stampRed,
    borderRadius: 6,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.muted,
  },
  link: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.postmarkBlue,
  },
});
