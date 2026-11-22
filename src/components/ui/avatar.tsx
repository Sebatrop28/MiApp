import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-theme';
import { getAvatar } from '@/services/profiles';

import { ThemedText } from './themed-text';

export interface AvatarProps {
  uid: string;
  name: string;
  size?: number;
  /** `avatarUpdatedAt` del perfil si se conoce (`null`: sin foto). */
  version?: number | null;
}

/** Foto de perfil (guardada en caché en el teléfono) o la inicial del nombre. */
export function Avatar({ uid, name, size = 40, version }: AvatarProps) {
  const { colors } = useAppTheme();
  const [loaded, setLoaded] = useState<{ key: string; data: string | null } | null>(null);
  const key = `${uid}:${version}`;

  useEffect(() => {
    let active = true;
    getAvatar(uid, version)
      .then((data) => {
        if (active) setLoaded({ key, data });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [uid, version, key]);

  const data = loaded?.key === key ? loaded.data : null;
  const style = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.base, style, { backgroundColor: colors.primaryMuted }]} testID={`avatar-${uid}`}>
      {data ? (
        <Image source={{ uri: `data:image/jpeg;base64,${data}` }} style={style} accessibilityLabel={`Foto de ${name}`} />
      ) : (
        <ThemedText variant={size >= 64 ? 'title' : 'bodyStrong'} color="primary">
          {(name || '?').charAt(0).toUpperCase()}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
