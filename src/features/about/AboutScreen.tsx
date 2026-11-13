import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { QuoteCard } from '@/components/ui/QuoteCard';
import { Text } from '@/components/ui/Text';
import { useLayout } from '@/hooks/useLayout';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const SCORE_FACTORS: { icon: IconName; text: string }[] = [
  { icon: 'merge', text: 'Merging onto a highway counts the most. Interchanges and lane changes at speed come next.' },
  {
    icon: 'turn-left',
    text: 'Turns across oncoming traffic and U-turns. Calmway knows which side of the road you drive on.',
  },
  { icon: 'roundabout-right', text: 'Roundabouts, with a little extra for big ones.' },
  { icon: 'bolt', text: 'Decisions that come right after each other, with no time to settle.' },
  { icon: 'speed', text: 'Every kilometer on highways and other fast roads.' },
];

const CREDITS: { name: string; role: string; url: string }[] = [
  { name: 'OpenStreetMap contributors', role: 'Map data', url: 'https://www.openstreetmap.org/copyright' },
  { name: 'OpenFreeMap and OpenMapTiles', role: 'Map tiles and base style', url: 'https://openfreemap.org' },
  { name: 'Valhalla', role: 'Routing engine', url: 'https://github.com/valhalla/valhalla' },
  { name: 'Photon by komoot', role: 'Search', url: 'https://photon.komoot.io' },
  { name: 'MapLibre', role: 'Map rendering', url: 'https://maplibre.org' },
];

const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => undefined);

export function AboutScreen() {
  const { p } = useTheme();
  const { wide } = useLayout();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, wide && styles.narrow]}>
        <IconButton icon="arrow-back" label="Back" tone="subtle" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, wide && styles.narrow]}>
        <View style={styles.hero}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} accessibilityLabel="Calmway logo" />
          <Text variant="display">Calmway</Text>
          <Text tone="muted">Longer route, calmer drive.</Text>
        </View>

        <View style={styles.block}>
          <Text variant="overline" tone="faint">
            Where it started
          </Text>
          <QuoteCard showScreenshot />
          <Text tone="muted">
            That post struck a nerve. Map apps are built to save minutes, not nerves. Calmway is the app that post asked
            for: it still knows the fastest way, but it also knows the gentlest one, and tells you honestly what the
            difference is.
          </Text>
        </View>

        <View style={styles.block}>
          <Text variant="overline" tone="faint">
            How the calm score works
          </Text>
          <Text tone="muted">
            Every route gets a score from 0 to 100. Higher is calmer. It adds up the moments that ask the most of a
            driver:
          </Text>
          {SCORE_FACTORS.map((f) => (
            <View key={f.text} style={styles.factor}>
              <View style={[styles.factorIcon, { backgroundColor: p.primarySoft }]}>
                <Icon name={f.icon} size={18} color={p.primary} />
              </View>
              <Text variant="caption" style={styles.flex}>
                {f.text}
              </Text>
            </View>
          ))}
          <Text tone="muted">
            The things you said stress you count extra, so the score is personal. Calm routes are only suggested when
            they fit in the extra time you said is okay.
          </Text>
        </View>

        <View style={[styles.note, { backgroundColor: p.accentSoft }]}>
          <Icon name="info-outline" size={20} color={p.accentInk} />
          <Text variant="caption" color={p.accentInk} style={styles.flex}>
            Calmway gives suggestions, you are the driver. Always follow road signs, local laws and your own judgement.
          </Text>
        </View>

        <View style={styles.block}>
          <Text variant="overline" tone="faint">
            Privacy
          </Text>
          <Text tone="muted">
            No account, no tracking, no ads. Your location, saved places and settings stay on this device. To plan a
            route, only the start and end points are sent to the routing service.
          </Text>
        </View>

        <View style={styles.block}>
          <Text variant="overline" tone="faint">
            Made possible by
          </Text>
          {CREDITS.map((c) => (
            <Pressable key={c.name} accessibilityRole="link" onPress={() => open(c.url)} style={styles.credit}>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{c.name}</Text>
                <Text variant="caption" tone="muted">
                  {c.role}
                </Text>
              </View>
              <Icon name="open-in-new" size={18} color={p.inkFaint} />
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="link"
            onPress={() => open('https://github.com/Ary-x86/calmway')}
            style={styles.credit}
          >
            <View style={styles.flex}>
              <Text variant="bodyStrong">Source code</Text>
              <Text variant="caption" tone="muted">
                github.com/Ary-x86/calmway
              </Text>
            </View>
            <Icon name="open-in-new" size={18} color={p.inkFaint} />
          </Pressable>
        </View>

        <Text variant="caption" tone="faint" align="center">
          Version {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  narrow: { maxWidth: 640, width: '100%', alignSelf: 'center' },
  content: { padding: space.xl, gap: space.xxl, paddingBottom: space.xxxl },
  hero: { alignItems: 'center', gap: space.sm },
  logo: { width: 88, height: 88, borderRadius: radius.xl },
  block: { gap: space.md },
  factor: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  factorIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  note: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.lg, alignItems: 'center' },
  credit: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
});
