import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Section, Segmented, ToggleRow } from '@/components/ui/Controls';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { TRIGGERS } from '@/core/calm-score';
import { useLayout } from '@/hooks/useLayout';
import type { CalmStrength } from '@/services/routing/profiles';
import { usePlaces } from '@/store/places';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { TRIGGER_ICON } from './triggerIcons';

const STRENGTH_DETAIL: Record<CalmStrength, string> = {
  gentle: 'Avoids the worst bits, stays close to the fastest time.',
  calm: 'A good balance. Skips most highway merges and tricky turns.',
  calmest: 'Quiet roads wherever possible, even if it takes longer.',
};

function LinkRow({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  onPress: () => void;
}) {
  const { p } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
    >
      <Icon name={icon} size={22} color={p.inkMuted} />
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {detail && (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
      <Icon name="chevron-right" size={20} color={p.inkFaint} />
    </Pressable>
  );
}

export function SettingsScreen() {
  const { p } = useTheme();
  const { wide } = useLayout();
  const prefs = usePrefs();
  const places = usePlaces();

  const toggleTrigger = (id: (typeof TRIGGERS)[number]['id'], on: boolean) =>
    prefs.setTriggers(on ? [...prefs.triggers, id] : prefs.triggers.filter((t) => t !== id));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, wide && styles.narrow]}>
        <IconButton icon="arrow-back" label="Back" tone="subtle" onPress={() => router.back()} />
        <Text variant="title">Settings</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, wide && styles.narrow]} showsVerticalScrollIndicator={false}>
        <Section title="What stresses you">
          {TRIGGERS.map((t) => (
            <ToggleRow
              key={t.id}
              icon={TRIGGER_ICON[t.id]}
              title={t.title}
              detail={t.detail}
              value={prefs.triggers.includes(t.id)}
              onChange={(v) => toggleTrigger(t.id, v)}
            />
          ))}
        </Section>

        <Section title="Calm route">
          <View style={styles.block}>
            <Segmented<CalmStrength>
              value={prefs.strength}
              onChange={(v) => prefs.set('strength', v)}
              options={[
                { value: 'gentle', label: 'Gentle' },
                { value: 'calm', label: 'Calm' },
                { value: 'calmest', label: 'Calmest' },
              ]}
            />
            <Text variant="caption" tone="muted">
              {STRENGTH_DETAIL[prefs.strength]}
            </Text>
          </View>
          <View style={styles.block}>
            <Text variant="bodyStrong">Extra time you accept</Text>
            <Segmented
              value={prefs.maxExtraMinutes}
              onChange={(v) => prefs.set('maxExtraMinutes', v)}
              options={[
                { value: 10, label: '10 min' },
                { value: 20, label: '20 min' },
                { value: 30, label: '30 min' },
                { value: 45, label: '45 min' },
              ]}
            />
          </View>
        </Section>

        <Section title="Always avoid">
          <ToggleRow
            icon="speed"
            title="Highways"
            value={prefs.avoid.highways}
            onChange={(v) => prefs.setAvoid('highways', v)}
          />
          <ToggleRow
            icon="money-off"
            title="Toll roads"
            value={prefs.avoid.tolls}
            onChange={(v) => prefs.setAvoid('tolls', v)}
          />
          <ToggleRow
            icon="directions-boat"
            title="Ferries"
            value={prefs.avoid.ferries}
            onChange={(v) => prefs.setAvoid('ferries', v)}
          />
        </Section>

        <Section title="Voice guidance">
          <ToggleRow
            icon="record-voice-over"
            title="Spoken directions"
            value={prefs.voice}
            onChange={(v) => prefs.set('voice', v)}
          />
          <ToggleRow
            icon="favorite-border"
            title="Reassurance"
            detail="A calm check-in on long quiet stretches"
            value={prefs.reassurance}
            onChange={(v) => prefs.set('reassurance', v)}
          />
          <View style={styles.block}>
            <Text variant="bodyStrong">Speaking pace</Text>
            <Segmented
              value={prefs.voiceRate}
              onChange={(v) => prefs.set('voiceRate', v)}
              options={[
                { value: 0.8, label: 'Slower' },
                { value: 0.95, label: 'Relaxed' },
                { value: 1.1, label: 'Brisk' },
              ]}
            />
          </View>
        </Section>

        <Section title="Display">
          <View style={styles.block}>
            <Text variant="bodyStrong">Units</Text>
            <Segmented
              value={prefs.units}
              onChange={(v) => prefs.set('units', v)}
              options={[
                { value: 'auto', label: 'Automatic' },
                { value: 'metric', label: 'Kilometers' },
                { value: 'imperial', label: 'Miles' },
              ]}
            />
          </View>
          <View style={styles.block}>
            <Text variant="bodyStrong">Appearance</Text>
            <Segmented
              value={prefs.appearance}
              onChange={(v) => prefs.set('appearance', v)}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </View>
        </Section>

        <Section title="Places">
          <LinkRow
            icon="home"
            title="Home"
            detail={places.home?.name ?? 'Not set'}
            onPress={() => router.push({ pathname: '/search', params: { purpose: 'home' } })}
          />
          <LinkRow
            icon="work"
            title="Work"
            detail={places.work?.name ?? 'Not set'}
            onPress={() => router.push({ pathname: '/search', params: { purpose: 'work' } })}
          />
          <LinkRow
            icon="history"
            title="Clear recent searches"
            detail={`${places.recents.length} saved`}
            onPress={places.clearRecents}
          />
        </Section>

        <Section title="Calmway">
          <LinkRow
            icon="spa"
            title="About Calmway"
            detail="The idea, the calm score, credits"
            onPress={() => router.push('/about')}
          />
          <LinkRow
            icon="replay"
            title="Replay the intro"
            onPress={() => {
              prefs.set('onboarded', false);
              router.replace('/onboarding');
            }}
          />
        </Section>

        <Text variant="caption" tone="faint" align="center">
          Calmway {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  narrow: { maxWidth: 640, width: '100%', alignSelf: 'center' },
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxxl },
  block: { gap: space.sm, paddingVertical: space.md },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  flex: { flex: 1, gap: 2 },
});
