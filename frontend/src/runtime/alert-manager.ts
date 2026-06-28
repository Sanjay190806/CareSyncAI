/** Global singleton — CODE RED alarm with escalating Web Audio tones */

export type AlarmLevel = 1 | 2 | 3;

export interface ActiveCodeRedAlert {
  alertId: string;
  patientId: string;
  patientName: string;
  tier: 5;
  triggeredAt: number;
}

type Listener = (alert: ActiveCodeRedAlert | null) => void;

class CriticalAlertManager {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private pulseInterval: number | null = null;
  private escalationTimer: number | null = null;
  private active: ActiveCodeRedAlert | null = null;
  private level: AlarmLevel = 1;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.active);
    return () => this.listeners.delete(listener);
  }

  getActive(): ActiveCodeRedAlert | null {
    return this.active;
  }

  getLevel(): AlarmLevel {
    return this.level;
  }

  trigger(alert: Omit<ActiveCodeRedAlert, 'triggeredAt'>): void {
    if (this.active?.alertId === alert.alertId) return;
    this.stopAudio();
    this.active = { ...alert, triggeredAt: Date.now() };
    this.level = 1;
    this.notify();
    this.startAudio(1);
    this.scheduleEscalation();
  }

  acknowledge(): ActiveCodeRedAlert | null {
    const prev = this.active;
    this.stopAudio();
    this.active = null;
    this.level = 1;
    this.notify();
    return prev;
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.active);
  }

  private scheduleEscalation(): void {
    if (this.escalationTimer) window.clearTimeout(this.escalationTimer);
    this.escalationTimer = window.setTimeout(() => {
      if (!this.active) return;
      this.level = 2;
      this.startAudio(2);
      this.escalationTimer = window.setTimeout(() => {
        if (!this.active) return;
        this.level = 3;
        this.startAudio(3);
      }, 10000);
    }, 10000);
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
    return this.audioContext;
  }

  private startAudio(level: AlarmLevel): void {
    this.stopOscillator();
    const ctx = this.ensureContext();
    this.gainNode = ctx.createGain();
    this.oscillator = ctx.createOscillator();
    this.oscillator.type = level === 3 ? 'square' : 'sine';
    this.oscillator.frequency.value = level === 1 ? 440 : level === 2 ? 660 : 880;
    this.gainNode.gain.value = level === 1 ? 0.08 : level === 2 ? 0.18 : 0.35;
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);
    this.oscillator.start();

    const interval = level === 1 ? 900 : level === 2 ? 600 : 400;
    this.pulseInterval = window.setInterval(() => {
      if (!this.gainNode || !this.oscillator) return;
      const base = level === 1 ? 0.08 : level === 2 ? 0.18 : 0.35;
      this.gainNode.gain.setValueAtTime(base, ctx.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(base * 0.01, ctx.currentTime + 0.08);
      this.gainNode.gain.exponentialRampToValueAtTime(base, ctx.currentTime + 0.16);
    }, interval);
  }

  private stopOscillator(): void {
    if (this.pulseInterval) {
      window.clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }
    try {
      this.oscillator?.stop();
    } catch {
      /* already stopped */
    }
    this.oscillator?.disconnect();
    this.gainNode?.disconnect();
    this.oscillator = null;
    this.gainNode = null;
  }

  private stopAudio(): void {
    if (this.escalationTimer) {
      window.clearTimeout(this.escalationTimer);
      this.escalationTimer = null;
    }
    this.stopOscillator();
  }
}

export const criticalAlertManager = new CriticalAlertManager();
