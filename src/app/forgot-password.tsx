import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthLayout } from '@/components/auth/auth-layout';
import { TextLink } from '@/components/auth/text-link';
import { Banner } from '@/components/feedback/banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/context/auth-context';
import { toAuthErrorMessage, validateEmail } from '@/services/auth-errors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const error = validateEmail(email);
    setEmailError(error);
    setFormError(null);
    if (error) return;
    setPending(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setFormError(toAuthErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviaremos un correo con un enlace para crear una contraseña nueva."
      testID="forgot-password-screen">
      {sent ? (
        <Banner tone="info" message={`Si existe una cuenta con ${email.trim()}, recibirás el correo en unos minutos.`} />
      ) : null}
      {formError ? <Banner tone="error" message={formError} onDismiss={() => setFormError(null)} /> : null}

      <TextField
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        placeholder="tucorreo@ejemplo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        onSubmitEditing={() => void submit()}
        testID="input-email"
      />
      <Button
        label="Enviar enlace"
        icon="mail"
        onPress={() => void submit()}
        loading={pending}
        disabled={pending}
        testID="button-reset"
      />
      <TextLink label="Volver a iniciar sesión" onPress={() => router.back()} />
    </AuthLayout>
  );
}
