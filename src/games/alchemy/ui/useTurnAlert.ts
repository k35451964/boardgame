import { useEffect, useRef } from 'react';

let audio: AudioContext | null = null;

function chime() {
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.35);
      osc.connect(gain).connect(audio!.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.4);
    });
  } catch {
    /* 소리를 못 내도 괜찮다 */
  }
}

/** 내 차례가 되면 짧은 소리를 내고, 다른 탭을 보고 있으면 탭 제목을 깜빡인다. */
export function useTurnAlert(myTurn: boolean) {
  const prev = useRef(myTurn);
  useEffect(() => {
    const became = myTurn && !prev.current;
    prev.current = myTurn;
    if (!became) return;
    chime();
    if (navigator.vibrate) navigator.vibrate(120);
    if (!document.hidden) return;
    const original = document.title;
    let on = false;
    const timer = setInterval(() => {
      on = !on;
      document.title = on ? '🔔 내 차례예요!' : original;
    }, 900);
    const stop = () => {
      if (document.hidden) return;
      clearInterval(timer);
      document.title = original;
      document.removeEventListener('visibilitychange', stop);
    };
    document.addEventListener('visibilitychange', stop);
    return () => {
      clearInterval(timer);
      document.title = original;
      document.removeEventListener('visibilitychange', stop);
    };
  }, [myTurn]);
}
