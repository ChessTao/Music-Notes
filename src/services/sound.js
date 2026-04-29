let soundEnabled = true;
let audioContext = null;

function getAudioContext() {
  if (!soundEnabled) return null;
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

export function setSoundEnabled(value) {
  soundEnabled = Boolean(value);
}

export function midiToFrequency(midi) {
  return 440 * (2 ** ((midi - 69) / 12));
}

export function playNote(midi) {
  try {
    const context = getAudioContext();
    if (!context) return false;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.value = midiToFrequency(midi);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.5);
    return true;
  } catch {
    return false;
  }
}
