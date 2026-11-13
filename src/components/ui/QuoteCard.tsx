import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { config } from '@/services/config';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export const ORIGINAL_QUOTE =
  'I wish there was a navigation app with an option like “longer route, but less brutal on the nervous system of an anxious driver.”';

/** The post that started Calmway. */
export function QuoteCard({ showScreenshot = false }: { showScreenshot?: boolean }) {
  const { p } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.card, { backgroundColor: p.surfaceRaised, borderColor: p.border }]}>
      <Icon name="format-quote" size={32} color={p.accent} />
      <Text variant="title" style={styles.quote}>
        {ORIGINAL_QUOTE}
      </Text>
      <Text variant="caption" tone="muted">
        Amelia, in a post that went viral
      </Text>
      <View style={styles.links}>
        {config.originalPostUrl ? (
          <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(config.originalPostUrl)}>
            <Text variant="label" tone="primary">
              View the original post
            </Text>
          </Pressable>
        ) : null}
        {showScreenshot && (
          <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)}>
            <Text variant="label" tone="primary">
              {open ? 'Hide the screenshot' : 'See the screenshot'}
            </Text>
          </Pressable>
        )}
      </View>
      {open && (
        <Image
          source={require('@/assets/images/original-post.jpeg')}
          style={styles.shot}
          contentFit="contain"
          accessibilityLabel="Screenshot of the original post"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.xl, gap: space.md },
  quote: { fontFamily: 'Fraunces_500Medium_Italic', fontSize: 22, lineHeight: 30 },
  links: { flexDirection: 'row', gap: space.xl, flexWrap: 'wrap' },
  shot: { width: '100%', aspectRatio: 1176 / 640, borderRadius: radius.md },
});
