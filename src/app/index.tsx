import { Redirect } from 'expo-router';
import { HomeScreen } from '@/features/home/HomeScreen';
import { usePrefs } from '@/store/prefs';

export default function Index() {
  const onboarded = usePrefs((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <HomeScreen />;
}
