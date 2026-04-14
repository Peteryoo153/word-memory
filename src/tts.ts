import * as Speech from 'expo-speech';

const EN_OPTIONS: Speech.SpeechOptions = {
  language: 'en-US',
  pitch: 1.0,
  rate: 0.85, // 조금 천천히 — 학습용
};

// 단어 발음
export function speakWord(word: string) {
  Speech.stop();
  Speech.speak(word, EN_OPTIONS);
}

// 예문 발음
export function speakSentence(sentence: string) {
  Speech.stop();
  Speech.speak(sentence, { ...EN_OPTIONS, rate: 0.8 });
}

// 멈추기
export function stopSpeech() {
  Speech.stop();
}
