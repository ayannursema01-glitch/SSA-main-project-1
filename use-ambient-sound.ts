'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AmbientEnvironment =
  | 'rain'
  | 'forest'
  | 'cafe'
  | 'fireplace'
  | 'night'
  | 'lofi'
  | 'silent'
  | 'none'

export interface UseAmbientSoundReturn {
  isPlaying: boolean
  volume: number
  setVolume: (v: number) => void
  play: (environment: string) => void
  stop: () => void
  switchEnvironment: (environment: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SILENT_ENVS: Set<string> = new Set(['silent', 'none'])

/** Create a white-noise AudioBuffer (single channel, `duration` seconds). */
function createNoiseBuffer(ctx: AudioContext, duration = 2): AudioBuffer {
  const size = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < size; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

/** Create a brown-noise AudioBuffer using the running-sum algorithm. */
function createBrownNoiseBuffer(ctx: AudioContext, duration = 2): AudioBuffer {
  const size = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0
  for (let i = 0; i < size; i++) {
    const white = Math.random() * 2 - 1
    data[i] = (lastOut + 0.02 * white) / 1.02
    lastOut = data[i]
    data[i] *= 3.5 // compensate for energy loss
  }
  return buffer
}

/** Safe wrapper that returns `null` when AudioContext is unavailable. */
function createAudioContext(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    return new AC()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Environment builders
// Each returns a cleanup function that disconnects / stops all created nodes.
// ---------------------------------------------------------------------------

interface BuiltEnvironment {
  /** Master gain for this environment (so we can fade it). */
  envGain: GainNode
  /** Call to tear down all scheduled intervals / oscillators / sources. */
  destroy: () => void
}

/**
 * Rain: white noise → bandpass (≈1000 Hz, Q≈0.5) + periodic drip pings.
 */
function buildRain(ctx: AudioContext, destination: AudioNode): BuiltEnvironment {
  const envGain = ctx.createGain()
  envGain.gain.value = 1
  envGain.connect(destination)

  // --- continuous rain noise ---
  const noiseBuffer = createNoiseBuffer(ctx, 4)
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  noiseSource.loop = true

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 1000
  bandpass.Q.value = 0.5

  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.35

  noiseSource.connect(bandpass)
  bandpass.connect(noiseGain)
  noiseGain.connect(envGain)
  noiseSource.start()

  // --- drip pings ---
  const drips: OscillatorNode[] = []
  const dripGains: GainNode[] = []
  const dripInterval = setInterval(() => {
    if (ctx.state !== 'running') return
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 2200 + Math.random() * 1800

    const g = ctx.createGain()
    const now = ctx.currentTime
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

    osc.connect(g)
    g.connect(envGain)
    osc.start(now)
    osc.stop(now + 0.15)

    drips.push(osc)
    dripGains.push(g)
  }, 150 + Math.random() * 250)

  return {
    envGain,
    destroy() {
      clearInterval(dripInterval)
      noiseSource.stop()
      noiseSource.disconnect()
      bandpass.disconnect()
      noiseGain.disconnect()
      drips.forEach((d) => { try { d.disconnect() } catch { /* already stopped */ } })
      dripGains.forEach((g) => { try { g.disconnect() } catch { /* nop */ } })
      envGain.disconnect()
    },
  }
}

/**
 * Forest: filtered noise (wind rustling, bandpass ≈400 Hz) + periodic bird chirps.
 */
function buildForest(ctx: AudioContext, destination: AudioNode): BuiltEnvironment {
  const envGain = ctx.createGain()
  envGain.gain.value = 1
  envGain.connect(destination)

  // --- wind rustling ---
  const noiseBuffer = createNoiseBuffer(ctx, 4)
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  noiseSource.loop = true

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 400
  bandpass.Q.value = 0.3

  const windGain = ctx.createGain()
  windGain.gain.value = 0.18

  // subtle LFO on wind volume
  const windLfo = ctx.createOscillator()
  windLfo.type = 'sine'
  windLfo.frequency.value = 0.15
  const windLfoGain = ctx.createGain()
  windLfoGain.gain.value = 0.06
  windLfo.connect(windLfoGain)
  windLfoGain.connect(windGain.gain)
  windLfo.start()

  noiseSource.connect(bandpass)
  bandpass.connect(windGain)
  windGain.connect(envGain)
  noiseSource.start()

  // --- bird chirps ---
  const chirpInterval = setInterval(() => {
    if (ctx.state !== 'running') return

    const numNotes = 2 + Math.floor(Math.random() * 3)
    for (let n = 0; n < numNotes; n++) {
      const delay = n * (0.06 + Math.random() * 0.06)
      const baseFreq = 2000 + Math.random() * 2000

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      const g = ctx.createGain()
      const start = ctx.currentTime + delay

      osc.frequency.setValueAtTime(baseFreq, start)
      osc.frequency.exponentialRampToValueAtTime(baseFreq * (0.85 + Math.random() * 0.3), start + 0.08)

      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.08, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.1)

      osc.connect(g)
      g.connect(envGain)
      osc.start(start)
      osc.stop(start + 0.12)
    }
  }, 2000 + Math.random() * 3000)

  return {
    envGain,
    destroy() {
      clearInterval(chirpInterval)
      noiseSource.stop()
      noiseSource.disconnect()
      bandpass.disconnect()
      windGain.disconnect()
      windLfo.stop()
      windLfo.disconnect()
      windLfoGain.disconnect()
      envGain.disconnect()
    },
  }
}

/**
 * Café: brown noise → low-pass (≈200 Hz) + mid-range murmur oscillations.
 */
function buildCafe(ctx: AudioContext, destination: AudioNode): BuiltEnvironment {
  const envGain = ctx.createGain()
  envGain.gain.value = 1
  envGain.connect(destination)

  // --- brown noise hubbub ---
  const brownBuffer = createBrownNoiseBuffer(ctx, 4)
  const brownSource = ctx.createBufferSource()
  brownSource.buffer = brownBuffer
  brownSource.loop = true

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 200
  lowpass.Q.value = 0.7

  const brownGain = ctx.createGain()
  brownGain.gain.value = 0.4

  brownSource.connect(lowpass)
  lowpass.connect(brownGain)
  brownGain.connect(envGain)
  brownSource.start()

  // --- murmur oscillations (multiple soft tones with slow FM) ---
  const murmurs: OscillatorNode[] = []
  const murmurGains: GainNode[] = []
  const murmurLfos: OscillatorNode[] = []

  const murmurFreqs = [180, 260, 340, 220]
  murmurFreqs.forEach((freq) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const g = ctx.createGain()
    g.gain.value = 0.02

    // slow LFO modulates gain for a babble effect
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.3 + Math.random() * 0.5
    const lfoG = ctx.createGain()
    lfoG.gain.value = 0.015
    lfo.connect(lfoG)
    lfoG.connect(g.gain)
    lfo.start()

    osc.connect(g)
    g.connect(envGain)
    osc.start()

    murmurs.push(osc)
    murmurGains.push(g)
    murmurLfos.push(lfo)
  })

  return {
    envGain,
    destroy() {
      brownSource.stop()
      brownSource.disconnect()
      lowpass.disconnect()
      brownGain.disconnect()
      murmurs.forEach((o) => { try { o.stop(); o.disconnect() } catch { /* */ } })
      murmurGains.forEach((g) => { try { g.disconnect() } catch { /* */ } })
      murmurLfos.forEach((l) => { try { l.stop(); l.disconnect() } catch { /* */ } })
      envGain.disconnect()
    },
  }
}

/**
 * Fireplace: low rumble + random crackle bursts.
 */
function buildFireplace(ctx: AudioContext, destination: AudioNode): BuiltEnvironment {
  const envGain = ctx.createGain()
  envGain.gain.value = 1
  envGain.connect(destination)

  // --- low rumble ---
  const noiseBuffer = createNoiseBuffer(ctx, 4)
  const rumbleSource = ctx.createBufferSource()
  rumbleSource.buffer = noiseBuffer
  rumbleSource.loop = true

  const rumbleLowpass = ctx.createBiquadFilter()
  rumbleLowpass.type = 'lowpass'
  rumbleLowpass.frequency.value = 150
  rumbleLowpass.Q.value = 0.5

  const rumbleGain = ctx.createGain()
  rumbleGain.gain.value = 0.35

  rumbleSource.connect(rumbleLowpass)
  rumbleLowpass.connect(rumbleGain)
  rumbleGain.connect(envGain)
  rumbleSource.start()

  // --- crackle bursts ---
  const crackleInterval = setInterval(() => {
    if (ctx.state !== 'running') return
    // short noise burst
    const burstBuffer = createNoiseBuffer(ctx, 0.08)
    const burstSource = ctx.createBufferSource()
    burstSource.buffer = burstBuffer

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 800 + Math.random() * 1200

    const burstGain = ctx.createGain()
    const now = ctx.currentTime
    burstGain.gain.setValueAtTime(0.0001, now)
    burstGain.gain.exponentialRampToValueAtTime(0.12 + Math.random() * 0.08, now + 0.005)
    burstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06 + Math.random() * 0.04)

    burstSource.connect(hp)
    hp.connect(burstGain)
    burstGain.connect(envGain)
    burstSource.start(now)
    burstSource.stop(now + 0.12)
  }, 100 + Math.random() * 200)

  return {
    envGain,
    destroy() {
      clearInterval(crackleInterval)
      rumbleSource.stop()
      rumbleSource.disconnect()
      rumbleLowpass.disconnect()
      rumbleGain.disconnect()
      envGain.disconnect()
    },
  }
}

/**
 * Night: very quiet filtered noise + cricket oscillators with AM at 5-8 Hz.
 */
function buildNight(ctx: AudioContext, destination: AudioNode): BuiltEnvironment {
  const envGain = ctx.createGain()
  envGain.gain.value = 1
  envGain.connect(destination)

  // --- quiet ambient ---
  const noiseBuffer = createNoiseBuffer(ctx, 4)
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  noiseSource.loop = true

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 600
  bandpass.Q.value = 0.3

  const ambGain = ctx.createGain()
  ambGain.gain.value = 0.04

  noiseSource.connect(bandpass)
  bandpass.connect(ambGain)
  ambGain.connect(envGain)
  noiseSource.start()

  // --- crickets ---
  const cricketOscs: OscillatorNode[] = []
  const cricketGains: GainNode[] = []
  const cricketLfos: OscillatorNode[] = []

  const cricketFreqs = [4000, 4300, 4800, 5100]
  cricketFreqs.forEach((freq) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const g = ctx.createGain()
    g.gain.value = 0.03

    // amplitude modulation → chirp effect
    const lfo = ctx.createOscillator()
    lfo.type = 'square'
    lfo.frequency.value = 5 + Math.random() * 3 // 5-8 Hz
    const lfoG = ctx.createGain()
    lfoG.gain.value = 0.025
    lfo.connect(lfoG)
    lfoG.connect(g.gain)
    lfo.start()

    osc.connect(g)
    g.connect(envGain)
    osc.start()

    cricketOscs.push(osc)
    cricketGains.push(g)
    cricketLfos.push(lfo)
  })

  return {
    envGain,
    destroy() {
      noiseSource.stop()
      noiseSource.disconnect()
      bandpass.disconnect()
      ambGain.disconnect()
      cricketOscs.forEach((o) => { try { o.stop(); o.disconnect() } catch { /* */ } })
      cricketGains.forEach((g) => { try { g.disconnect() } catch { /* */ } })
      cricketLfos.forEach((l) => { try { l.stop(); l.disconnect() } catch { /* */ } })
      envGain.disconnect()
    },
  }
}

/**
 * Lo-Fi: warm pad (detuned sine/triangle oscillators at C3-E3-G3) + gentle kick pulse.
 */
function buildLofi(ctx: AudioContext, destination: AudioNode): BuiltEnvironment {
  const envGain = ctx.createGain()
  envGain.gain.value = 1
  envGain.connect(destination)

  // --- warm pad ---
  const padOscs: OscillatorNode[] = []
  const padGains: GainNode[] = []
  const padLfos: OscillatorNode[] = []

  // C3, E3, G3 chord
  const chordFreqs = [130.81, 164.81, 196.0]
  chordFreqs.forEach((freq) => {
    // two oscillators per note, slightly detuned for warmth
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      osc.detune.value = detune

      const g = ctx.createGain()
      g.gain.value = 0.06

      // slow LFO on volume
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.08 + Math.random() * 0.07
      const lfoG = ctx.createGain()
      lfoG.gain.value = 0.025
      lfo.connect(lfoG)
      lfoG.connect(g.gain)
      lfo.start()

      osc.connect(g)
      g.connect(envGain)
      osc.start()

      padOscs.push(osc)
      padGains.push(g)
      padLfos.push(lfo)
    }
  })

  // --- subtle kick rhythm (BPM ≈ 75) ---
  const kickInterval = setInterval(() => {
    if (ctx.state !== 'running') return
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1)

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.18, now)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)

    osc.connect(g)
    g.connect(envGain)
    osc.start(now)
    osc.stop(now + 0.3)
  }, 800) // ~75 BPM

  return {
    envGain,
    destroy() {
      clearInterval(kickInterval)
      padOscs.forEach((o) => { try { o.stop(); o.disconnect() } catch { /* */ } })
      padGains.forEach((g) => { try { g.disconnect() } catch { /* */ } })
      padLfos.forEach((l) => { try { l.stop(); l.disconnect() } catch { /* */ } })
      envGain.disconnect()
    },
  }
}

// ---------------------------------------------------------------------------
// Builder registry
// ---------------------------------------------------------------------------

const BUILDERS: Record<string, (ctx: AudioContext, dest: AudioNode) => BuiltEnvironment> = {
  rain: buildRain,
  forest: buildForest,
  cafe: buildCafe,
  fireplace: buildFireplace,
  night: buildNight,
  lofi: buildLofi,
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAmbientSound(): UseAmbientSoundReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.5)

  // Persistent refs
  const ctxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const currentEnvRef = useRef<BuiltEnvironment | null>(null)
  const currentEnvNameRef = useRef<string>('')
  const isSwitchingRef = useRef(false)

  // ----- helpers -----

  /** Lazily create and return the shared AudioContext + master GainNode. */
  const ensureContext = useCallback((): { ctx: AudioContext; master: GainNode } | null => {
    if (ctxRef.current && masterGainRef.current) {
      return { ctx: ctxRef.current, master: masterGainRef.current }
    }

    const ctx = createAudioContext()
    if (!ctx) return null

    const master = ctx.createGain()
    master.gain.value = volume
    master.connect(ctx.destination)

    ctxRef.current = ctx
    masterGainRef.current = master
    return { ctx, master }
  }, [volume]) // volume captured for initial gain; updates happen via setVolume

  /** Resume a suspended AudioContext (required by browser autoplay policy). */
  const ensureResumed = useCallback(async (ctx: AudioContext) => {
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
  }, [])

  /** Tear down the current environment (stop sources, disconnect nodes). */
  const destroyCurrentEnv = useCallback(() => {
    if (currentEnvRef.current) {
      try {
        currentEnvRef.current.destroy()
      } catch {
        /* best-effort */
      }
      currentEnvRef.current = null
      currentEnvNameRef.current = ''
    }
  }, [])

  // ----- public API -----

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolumeState(clamped)
    if (masterGainRef.current) {
      masterGainRef.current.gain.setValueAtTime(clamped, masterGainRef.current.context.currentTime)
    }
  }, [])

  const play = useCallback(
    async (environment: string) => {
      // Silent / none → just stop
      if (SILENT_ENVS.has(environment)) {
        destroyCurrentEnv()
        setIsPlaying(false)
        currentEnvNameRef.current = environment
        return
      }

      // Same environment already playing → no-op
      if (currentEnvNameRef.current === environment && currentEnvRef.current) {
        return
      }

      const result = ensureContext()
      if (!result) return
      const { ctx, master } = result

      await ensureResumed(ctx)

      // If something is already playing, tear it down first
      destroyCurrentEnv()

      const builder = BUILDERS[environment]
      if (!builder) return

      const built = builder(ctx, master)
      currentEnvRef.current = built
      currentEnvNameRef.current = environment
      setIsPlaying(true)
    },
    [ensureContext, ensureResumed, destroyCurrentEnv],
  )

  const stop = useCallback(() => {
    destroyCurrentEnv()
    setIsPlaying(false)
  }, [destroyCurrentEnv])

  const switchEnvironment = useCallback(
    async (environment: string) => {
      // Prevent rapid double-switching
      if (isSwitchingRef.current) return
      isSwitchingRef.current = true

      try {
        // Silent / none → fade out and stop
        if (SILENT_ENVS.has(environment)) {
          if (currentEnvRef.current && ctxRef.current) {
            const now = ctxRef.current.currentTime
            currentEnvRef.current.envGain.gain.setValueAtTime(
              currentEnvRef.current.envGain.gain.value,
              now,
            )
            currentEnvRef.current.envGain.gain.linearRampToValueAtTime(0, now + 1)
            // Wait for fade, then destroy
            setTimeout(() => {
              destroyCurrentEnv()
              setIsPlaying(false)
              isSwitchingRef.current = false
            }, 1050)
          } else {
            destroyCurrentEnv()
            setIsPlaying(false)
            isSwitchingRef.current = false
          }
          currentEnvNameRef.current = environment
          return
        }

        // Same environment → no-op
        if (currentEnvNameRef.current === environment && currentEnvRef.current) {
          isSwitchingRef.current = false
          return
        }

        const result = ensureContext()
        if (!result) {
          isSwitchingRef.current = false
          return
        }
        const { ctx, master } = result

        await ensureResumed(ctx)

        const builder = BUILDERS[environment]
        if (!builder) {
          isSwitchingRef.current = false
          return
        }

        // Build new environment (starts silent)
        const newEnv = builder(ctx, master)
        newEnv.envGain.gain.setValueAtTime(0.0001, ctx.currentTime)

        // Fade out old
        if (currentEnvRef.current) {
          const now = ctx.currentTime
          currentEnvRef.current.envGain.gain.setValueAtTime(
            currentEnvRef.current.envGain.gain.value,
            now,
          )
          currentEnvRef.current.envGain.gain.linearRampToValueAtTime(0.0001, now + 1)
        }

        // Fade in new
        newEnv.envGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1)

        // After fade completes, destroy the old environment
        const oldEnv = currentEnvRef.current
        setTimeout(() => {
          if (oldEnv) {
            try {
              oldEnv.destroy()
            } catch {
              /* best-effort */
            }
          }
          isSwitchingRef.current = false
        }, 1050)

        currentEnvRef.current = newEnv
        currentEnvNameRef.current = environment
        setIsPlaying(true)
      } catch {
        isSwitchingRef.current = false
      }
    },
    [ensureContext, ensureResumed, destroyCurrentEnv],
  )

  // ----- cleanup on unmount -----
  useEffect(() => {
    return () => {
      destroyCurrentEnv()
      if (masterGainRef.current) {
        try { masterGainRef.current.disconnect() } catch { /* */ }
        masterGainRef.current = null
      }
      if (ctxRef.current) {
        try { ctxRef.current.close() } catch { /* */ }
        ctxRef.current = null
      }
    }
  }, [destroyCurrentEnv])

  return { isPlaying, volume, setVolume, play, stop, switchEnvironment }
}

export default useAmbientSound
