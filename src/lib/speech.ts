import * as Speech from 'expo-speech';

/** Speaks a navigation line. Utterances queue so lines never cut each other off. */
export function say(text: string, rate = 0.95) {
  if (!text) return;
  Speech.speak(text, { language: 'en-US', rate, pitch: 1 });
}

export function silence() {
  Speech.stop();
}
