import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "../../theme/colors";
import { useAuth } from "../../auth/auth-context";

export function LoginScreen() {
  const { login, completeTwoFactorLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);

    try {
      const result = requiresTwoFactor
        ? await completeTwoFactorLogin({
            email: email.trim(),
            password,
            twoFactorCode: twoFactorCode.trim(),
          })
        : await login({
            email: email.trim(),
            password,
          });

      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
      }
    } catch (value) {
      const message =
        value &&
        typeof value === "object" &&
        "message" in value &&
        typeof value.message === "string"
          ? value.message
          : value instanceof Error
            ? value.message
            : "Unable to sign in. Please check your credentials.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>R</Text>
            </View>

            <Text style={styles.title}>RMSM</Text>
            <Text style={styles.subtitle}>
              Professional trading terminal
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>
              {requiresTwoFactor ? "Verify your identity" : "Welcome back"}
            </Text>

            <Text style={styles.description}>
              {requiresTwoFactor
                ? "Enter the verification code from your authenticator."
                : "Sign in to access your trading account."}
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading && !requiresTwoFactor}
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              style={styles.input}
            />

            {requiresTwoFactor && (
              <>
                <Text style={styles.label}>Authentication code</Text>
                <TextInput
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                  placeholder="000000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={8}
                  editable={!loading}
                  style={styles.input}
                />
              </>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={
                loading ||
                !email.trim() ||
                !password ||
                (requiresTwoFactor && !twoFactorCode.trim())
              }
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                (loading ||
                  !email.trim() ||
                  !password ||
                  (requiresTwoFactor && !twoFactorCode.trim())) &&
                  styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.black} />
              ) : (
                <Text style={styles.buttonText}>
                  {requiresTwoFactor ? "Verify & Sign In" : "Sign In"}
                </Text>
              )}
            </Pressable>

            {requiresTwoFactor && (
              <Pressable
                disabled={loading}
                onPress={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorCode("");
                  setError("");
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  Back to sign in
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.footer}>RMSM · Secure trading platform</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  keyboard: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  brand: {
    alignItems: "center",
    marginBottom: 28,
  },

  logo: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    marginBottom: 14,
  },

  logoText: {
    color: colors.black,
    fontSize: 30,
    fontWeight: "900",
  },

  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
  },

  heading: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
  },

  description: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 22,
  },

  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
  },

  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    padding: 11,
    marginBottom: 16,
  },

  errorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },

  button: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  buttonText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    alignItems: "center",
    paddingTop: 17,
  },

  secondaryButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },

  footer: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 22,
  },
});
