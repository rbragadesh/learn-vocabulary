// Text-to-speech through the browser (works offline on iPad with the built-in Siri voices).

let voices: SpeechSynthesisVoice[] = [];
let preferredURI: string | null = null;
let rate = 0.9;
const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function loadVoices() {
  if (!supported) return;
  voices = window.speechSynthesis.getVoices();
}

if (supported) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function configureSpeech(opts: { voiceURI: string | null; rate: number }) {
  preferredURI = opts.voiceURI;
  rate = opts.rate;
}

export function englishVoices(): SpeechSynthesisVoice[] {
  loadVoices();
  return voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
}

const NICE_VOICES = ['Samantha', 'Karen', 'Moira', 'Daniel', 'Google US English', 'Microsoft Aria'];

function chooseVoice(): SpeechSynthesisVoice | undefined {
  const en = englishVoices();
  return (
    en.find((v) => v.voiceURI === preferredURI) ??
    NICE_VOICES.map((n) => en.find((v) => v.name.startsWith(n))).find(Boolean) ??
    en.find((v) => v.lang === 'en-US' && v.localService) ??
    en[0]
  );
}

export function speechSupported(): boolean {
  return supported;
}

export function speak(text: string, opts: { rate?: number } = {}): Promise<void> {
  if (!supported || !text.trim()) return Promise.resolve();
  const synth = window.speechSynthesis;
  synth.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = chooseVoice();
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else {
      u.lang = 'en-US';
    }
    u.rate = opts.rate ?? rate;
    u.pitch = 1.05;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function stopSpeaking() {
  if (supported) window.speechSynthesis.cancel();
}
