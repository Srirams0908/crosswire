export function playBeep(freq = 440, duration = 0.15, vol = 0.3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), (duration + 0.1) * 1000);
  } catch {}
}

export function playDoubleBeep() {
  playBeep(440, 0.12, 0.25);
  setTimeout(() => playBeep(440, 0.12, 0.25), 200);
}

export function playHandoffBeep() {
  playBeep(440, 0.15, 0.3);
  setTimeout(() => playBeep(660, 0.2, 0.35), 200);
}
