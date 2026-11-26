import { stripFurigana } from './furigana';

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (isTtsSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakJapanese(text: string, onEnd?: () => void): void {
  if (!isTtsSupported()) {
    onEnd?.();
    return;
  }

  const clean = stripFurigana(text).trim();
  if (!clean) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.94; // Slightly clear & natural pace for N3+ learners
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const jaVoice =
    voices.find((v) => v.lang === 'ja-JP' && /Google|Kyoko|O-Ren|Nanami/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith('ja'));
  if (jaVoice) {
    utterance.voice = jaVoice;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}
