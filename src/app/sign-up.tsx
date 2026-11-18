import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthLayout } from '@/components/auth/auth-layout';
import { TextLink } from '@/components/auth/text-link';
import { Banner } from '@/components/feedback/banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/context/auth-context';
import { toAuthErrorMessage, validateEmail, validateNewPassword } from '@/services/auth-errors';

interface FieldErrors {
  name?: string | null;
  email?: string | null;
  password?: string | null;
  confirm?: string | null;
}

export default function SignUpScreen() {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const next: FieldErrors = {
      name: name.trim() ? null : 'Escribe tu nombre.',
      email: validateEmail(email),
      password: validateNewPassword(password),
      confirm: confirm === password ? null : 'Las contraseñas no coinciden.',
    };
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;
    setPending(true);
    try {
      await signUpWithEmail(name, email, password);
    } catch (e) {
      setFormError(toAuthErrorMessage(e));
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Regístrate con tu correo. Te enviaremos un enlace para verificarlo."
      testID="sign-up-screen">
      {formError ? <Banner tone="error" message={formError} onDismiss={() => setFormError(null)} /> : null}

      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
        textContentType="name"
        testID="input-name"
      />
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
        testID="input-email"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Mínimo 6 caracteres"
        testID="input-password"
      />
      <TextField
        label="Repetir contraseña"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={() => void submit()}
        testID="input-confirm"
      />

      <Button
        label="Crear cuenta"
        icon="person_add"
        onPress={() => void submit()}
        loading={pending}
        disabled={pending}
        testID="button-sign-up"
      />
      <TextLink label="¿Ya tienes cuenta? Iniciar sesión" onPress={() => router.back()} testID="link-sign-in" />
    </AuthLayout>
  );
}
