import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { AuthLayout } from '@/components/auth/auth-layout';
import { Divider } from '@/components/auth/divider';
import { TextLink } from '@/components/auth/text-link';
import { Banner } from '@/components/feedback/banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { isFirebaseConfigured, isGoogleSignInConfigured } from '@/config/firebase-config';
import { useAuth } from '@/context/auth-context';
import { toAuthErrorMessage, validateEmail } from '@/services/auth-errors';

const showGoogle = Platform.OS === 'android' && isGoogleSignInConfigured;

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<'email' | 'google' | null>(null);

  const submit = async () => {
    const next = { email: validateEmail(email), password: password ? null : 'Escribe tu contraseña.' };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;
    setPending('email');
    try {
      await signInWithEmail(email, password);
    } catch (e) {
      setFormError(toAuthErrorMessage(e));
      setPending(null);
    }
  };

  const google = async () => {
    setFormError(null);
    setPending('google');
    try {
      await signInWithGoogle();
    } catch (e) {
      setFormError(toAuthErrorMessage(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Entra con tu cuenta para usar MiApp." testID="sign-in-screen">
      {!isFirebaseConfigured ? (
        <Banner tone="info" message="Firebase aún no está configurado: completa «extra.firebase» en app.json." />
      ) : null}
      {formError ? <Banner tone="error" message={formError} onDismiss={() => setFormError(null)} /> : null}

      <TextField
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="tucorreo@ejemplo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        testID="input-email"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        testID="input-password"
      />
      <TextLink label="¿Olvidaste tu contraseña?" onPress={() => router.push('/forgot-password')} />

      <Button
        label="Iniciar sesión"
        icon="login"
        onPress={() => void submit()}
        loading={pending === 'email'}
        disabled={pending !== null}
        testID="button-sign-in"
      />

      {showGoogle ? (
        <>
          <Divider label="o" />
          <Button
            label="Continuar con Google"
            icon="account_circle"
            variant="secondary"
            onPress={() => void google()}
            loading={pending === 'google'}
            disabled={pending !== null}
            testID="button-google"
          />
        </>
      ) : null}

      <TextLink label="¿No tienes cuenta? Crear cuenta" onPress={() => router.push('/sign-up')} testID="link-sign-up" />
    </AuthLayout>
  );
}
