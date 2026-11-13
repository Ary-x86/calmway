import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Controls';
import { Icon } from '@/components/ui/Icon';
import { QuoteCard } from '@/components/ui/QuoteCard';
import { Text } from '@/components/ui/Text';
import { TRIGGERS, type Trigger } from '@/core/calm-score';
import { TRIGGER_ICON } from '@/features/settings/triggerIcons';
import { useLayout } from '@/hooks/useLayout';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const STEPS = 4;

export function OnboardingScreen() {
  const { p } = useTheme();
  const { wide } = useLayout();
  const [step, setStep] = useState(0);
  const prefs = usePrefs();
  const [selected, setSelected] = useState<Trigger[]>(prefs.triggers);

  const finish = () => {
    prefs.completeOnboarding();
    router.replace('/');
  };

  const next = async () => {
    if (step === 1) prefs.setTriggers(selected);
    if (step === STEPS - 1) {
      await Location.requestForegroundPermissionsAsync().catch(() => undefined);
      finish();
      return;
    }
    setStep((s) => s + 1);
  };

  const toggle = (t: Trigger) => setSelected((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.background }]}>
      <View style={[styles.inner, wide && styles.innerWide]}>
        <View style={styles.progress}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.bar, { backgroundColor: i <= step ? p.primary : p.border }]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                accessibilityLabel="Calmway logo"
              />
              <QuoteCard />
              <Text variant="display">Now there is.</Text>
              <Text tone="muted">
                Calmway finds routes that are easier on your nerves: fewer highway merges, fewer turns across traffic,
                fewer surprises. It tells you exactly what it costs in minutes, so the choice is always yours.
              </Text>
            </>
          )}

          {step === 1 && (
            <>
              <Text variant="display">What makes driving stressful for you?</Text>
              <Text tone="muted">Pick as many as you like. Calm routes will steer around these first.</Text>
              <View style={styles.options}>
                {TRIGGERS.map((t) => {
                  const on = selected.includes(t.id);
                  return (
                    <Pressable
                      key={t.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() => toggle(t.id)}
                      style={[
                        styles.option,
                        { backgroundColor: on ? p.primarySoft : p.surface, borderColor: on ? p.primary : p.border },
                      ]}
                    >
                      <Icon name={TRIGGER_ICON[t.id]} size={24} color={on ? p.primary : p.inkMuted} />
                      <View style={styles.flex}>
                        <Text variant="bodyStrong">{t.title}</Text>
                        <Text variant="caption" tone="muted">
                          {t.detail}
                        </Text>
                      </View>
                      <Icon
                        name={on ? 'check-circle' : 'radio-button-unchecked'}
                        size={22}
                        color={on ? p.primary : p.inkFaint}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text variant="display">How much extra time is okay?</Text>
              <Text tone="muted">
                For a calmer drive, Calmway may suggest a route that takes a little longer. It will never go over this
                without asking.
              </Text>
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
              <View style={[styles.note, { backgroundColor: p.primarySoft }]}>
                <Icon name="spa" size={20} color={p.primary} />
                <Text variant="caption" tone="muted" style={styles.flex}>
                  Every route shows the trade-off, for example {'"'}+6 min, 45% calmer{'"'}, and the fastest option is
                  always one tap away.
                </Text>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text variant="display">One last thing</Text>
              <Text tone="muted">
                To guide you turn by turn, Calmway needs your location while you use it. It stays on your device and is
                only used to show where you are and to plan your route.
              </Text>
              <View style={[styles.note, { backgroundColor: p.accentSoft }]}>
                <Icon name="info-outline" size={20} color={p.accentInk} />
                <Text variant="caption" color={p.accentInk} style={styles.flex}>
                  Calmway gives suggestions, you are the driver. Always follow road signs and traffic laws.
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 ? (
            <Button label="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} />
          ) : (
            <Button label="Skip" variant="ghost" onPress={finish} />
          )}
          <View style={styles.flex} />
          <Button
            label={
              step === STEPS - 1 ? 'Allow location' : step === 1 && selected.length === 0 ? 'None of these' : 'Continue'
            }
            icon={step === STEPS - 1 ? 'my-location' : 'arrow-forward'}
            iconRight={step !== STEPS - 1}
            size="lg"
            onPress={next}
          />
        </View>
        {step === STEPS - 1 && (
          <Button label="Not now" variant="ghost" size="sm" onPress={finish} style={styles.notNow} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: space.xl },
  innerWide: { maxWidth: 560, width: '100%', alignSelf: 'center' },
  progress: { flexDirection: 'row', gap: space.xs, paddingTop: space.md },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  content: { gap: space.lg, paddingVertical: space.xxl },
  logo: { width: 64, height: 64, borderRadius: radius.lg },
  options: { gap: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  flex: { flex: 1 },
  note: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.lg, alignItems: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.lg },
  notNow: { alignSelf: 'flex-end', marginTop: -space.md, marginBottom: space.md },
});
