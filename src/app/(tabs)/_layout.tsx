import { NativeTabs } from 'expo-router/native-tabs';

import { useAutoUpdate } from '@/hooks/use-auto-update';
import { useAppTheme } from '@/hooks/use-theme';

/** Barra de pestañas nativa (Material 3 en Android). */
export default function TabsLayout() {
  const { colors } = useAppTheme();
  useAutoUpdate();

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.primaryMuted}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      labelStyle={{ default: { color: colors.textSecondary }, selected: { color: colors.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notes">
        <NativeTabs.Trigger.Label>Notas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'note.text', selected: 'note.text' }} md="sticky_note_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="friends">
        <NativeTabs.Trigger.Label>Amigos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="communities">
        <NativeTabs.Trigger.Label>Comunidades</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} md="groups" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
