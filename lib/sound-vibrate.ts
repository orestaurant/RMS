/**
 * Device Vibration & Audio Notification Helper
 * Provides haptic feedback (navigator.vibrate) and browser Web Audio API chimes
 */

export function triggerNotificationFeedback(type: 'order' | 'payment' | 'alert' = 'order') {
  // 1. Device Vibration
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      if (type === 'order') {
        // Double pulse for new order
        navigator.vibrate([200, 100, 200])
      } else if (type === 'payment') {
        // Triple celebratory pulse for payment
        navigator.vibrate([150, 75, 150, 75, 300])
      } else {
        navigator.vibrate([250])
      }
    } catch {
      // Ignore vibration errors if not supported or blocked by policy
    }
  }

  // 2. Web Audio API chime (synthesizer tone, doesn't require external audio files)
  if (typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      const now = ctx.currentTime

      if (type === 'order') {
        // Bell chime: 587.33 Hz (D5) -> 880 Hz (A5)
        osc.frequency.setValueAtTime(587.33, now)
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15)
        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
        osc.start(now)
        osc.stop(now + 0.4)
      } else if (type === 'payment') {
        // Cash register chime: 523.25 Hz (C5) -> 659.25 Hz (E5) -> 783.99 Hz (G5)
        osc.frequency.setValueAtTime(523.25, now)
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25)
        gain.gain.setValueAtTime(0.35, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
        osc.start(now)
        osc.stop(now + 0.5)
      } else {
        osc.frequency.setValueAtTime(440, now)
        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        osc.start(now)
        osc.stop(now + 0.3)
      }
    } catch {
      // Audio playback might be restricted until user interaction
    }
  }
}
