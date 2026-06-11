import type { MoodParams } from '../utils/promptParser';

export class SynthEngine {
  private ctx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  
  // Audio Nodes
  private masterVolume: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  
  // Synthesis state
  private playing = false;
  private currentParams: MoodParams | null = null;
  private schedulerTimer: number | null = null;
  private nextNoteTime = 0.0;
  private currentStep = 0;
  
  // Microphone nodes
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private isMicActive = false;
  private audioRouteGain: GainNode | null = null;
  private micRouteGain: GainNode | null = null;

  constructor() {}

  // Initialize the AudioContext (must be user-gesture triggered)
  public async init() {
    if (this.ctx) return;
    
    // Create audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Setup Analyser
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 512; // 256 frequency bins
    
    // Create master nodes
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.setValueAtTime(0.15, this.ctx.currentTime); // keep volume elegant and comfortable

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(1000, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime);

    // Setup Stereo Delay Node for deep space effect
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayFeedback = this.ctx.createGain();
    this.delayNode.delayTime.setValueAtTime(0.4, this.ctx.currentTime);
    this.delayFeedback.gain.setValueAtTime(0.45, this.ctx.currentTime);

    // Dynamic Routing nodes to transition between Synth and Mic Input
    this.audioRouteGain = this.ctx.createGain();
    this.audioRouteGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.micRouteGain = this.ctx.createGain();
    this.micRouteGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Connections:
    // Synthesizer nodes -> audioRouteGain -> filterNode -> masterVolume
    //                                     -> delayNode -> delayFeedback -> delayNode (feedback loop)
    //                                     -> delayNode -> masterVolume
    // masterVolume -> analyserNode -> destination
    
    // Delay loop connections
    this.audioRouteGain.connect(this.filterNode);
    this.audioRouteGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    
    // Filter & delay to master
    this.filterNode.connect(this.masterVolume);
    this.delayNode.connect(this.masterVolume);

    // Mic routing
    this.micRouteGain.connect(this.analyserNode); // Mic bypasses filter/delay directly to visualizer to prevent feedback, but goes to masterVolume at 0 gain or low gain for monitoring
    this.micRouteGain.connect(this.masterVolume);

    // Master output
    this.masterVolume.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
  }

  // Update soundscape parameters dynamically from parsed prompt
  public updateParams(params: MoodParams) {
    this.currentParams = params;
    
    if (!this.ctx || !this.filterNode || !this.delayNode || !this.delayFeedback) return;
    
    const now = this.ctx.currentTime;
    
    // Smooth filter transition
    this.filterNode.frequency.exponentialRampToValueAtTime(Math.max(100, params.filterCutoff), now + 1.0);
    
    // Adjust delay settings
    this.delayNode.delayTime.linearRampToValueAtTime(params.delayTime, now + 1.5);
    
    // Adjust volume matching mood dynamics
    if (this.masterVolume) {
      const vol = params.synthType === 'square' || params.synthType === 'sawtooth' ? 0.08 : 0.16;
      this.masterVolume.gain.linearRampToValueAtTime(vol, now + 0.5);
    }
  }

  // Toggle Synthesizer playing
  public start() {
    if (this.playing || !this.ctx) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.playing = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
    this.playDrone();
  }

  public stop() {
    this.playing = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  // Set master volume level (0.0 to 1.0)
  public setVolume(vol: number) {
    if (this.ctx && this.masterVolume) {
      this.masterVolume.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.1);
    }
  }

  // Procedural scheduler: schedules note events into the audio timeline
  private scheduler = () => {
    if (!this.playing || !this.ctx || !this.currentParams) return;
    
    const scheduleAheadTime = 0.1; // 100ms lookahead
    
    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceNote();
    }
    
    // Run scheduler loop every 25ms
    this.schedulerTimer = window.setTimeout(this.scheduler, 25);
  };

  // Move scheduler step forward based on tempo
  private advanceNote() {
    if (!this.currentParams) return;
    
    const secondsPerBeat = 60.0 / this.currentParams.tempo;
    // Advance by a sixteenth note (0.25 beat)
    const stepDuration = 0.25 * secondsPerBeat;
    
    this.nextNoteTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  // Convert MIDI note number to frequency
  private midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // Trigger a single pluck/arp note in the context schedule
  private scheduleNote(step: number, time: number) {
    if (!this.ctx || !this.currentParams || !this.audioRouteGain) return;
    
    // Inactive synth if mic is soloed or if step isn't triggered
    if (this.isMicActive) return;
    
    // Play notes on certain beats (arpeggiator pattern based on step)
    // Dynamic patterns based on step index and prompt settings
    const speedFactor = this.currentParams.speed;
    const isStepTriggered = 
      step % 4 === 0 || 
      (speedFactor > 1.2 && step % 3 === 0) || 
      (speedFactor > 0.8 && step % 6 === 2) ||
      (speedFactor < 0.6 && step % 8 === 0);
      
    if (!isStepTriggered) return;

    // Pick note from scale deterministically based on step
    const notes = this.currentParams.scaleNotes;
    const scaleLength = notes.length;
    // Map base MIDI key (e.g. from base frequency A2 = 45, C3 = 48)
    const rootMidi = Math.round(12 * Math.log2(this.currentParams.baseFreq / 440) + 69);
    
    // Select note index using some pattern math
    let noteIndex = 0;
    if (step % 4 === 0) noteIndex = 0;
    else if (step % 3 === 0) noteIndex = 2;
    else if (step % 5 === 0) noteIndex = 4;
    else noteIndex = (step * 3) % scaleLength;
    
    // Octave shifting for rhythmic feel
    let octaveShift = 0;
    if (step % 8 === 0) octaveShift = 1;
    if (step % 12 === 0) octaveShift = 2;
    
    const midiNote = rootMidi + notes[noteIndex % scaleLength] + octaveShift * 12;
    const freq = this.midiToFreq(midiNote);

    // Create pluck oscillator
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = this.currentParams.synthType;
    osc.frequency.setValueAtTime(freq, time);

    // Pitch sweep/glide for modern synth texture
    if (this.currentParams.speed > 1.2 && step % 8 === 0) {
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.15);
    }

    // Envelope for plucky/bell shape
    const duration = 0.4 + (this.currentParams.delayTime * 0.5);
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.08, time + 0.01); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration); // Long decay

    // Connect to final mix
    osc.connect(gainNode);
    gainNode.connect(this.audioRouteGain);
    
    osc.start(time);
    osc.stop(time + duration);
  }

  // Play deep background drone pad
  private playDrone() {
    const triggerDrone = () => {
      if (!this.playing || !this.ctx || !this.currentParams || !this.audioRouteGain || this.isMicActive) {
        if (this.playing) setTimeout(triggerDrone, 2000);
        return;
      }

      const now = this.ctx.currentTime;
      const rootMidi = Math.round(12 * Math.log2(this.currentParams.baseFreq / 440) + 69);
      
      // Play root note and a fifth (+7 midi steps) for full harmony
      const notes = [rootMidi - 12, rootMidi - 5, rootMidi]; // deep bass octaves
      const droneOscs: OscillatorNode[] = [];
      const droneGains: GainNode[] = [];

      notes.forEach((midi, idx) => {
        if (!this.ctx || !this.audioRouteGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Smooth wave shapes for drone pads
        osc.type = 'sine';
        
        // Detune oscillators slightly for thick lush chorus effect
        const detuneValue = (idx - 1) * 8; 
        osc.frequency.setValueAtTime(this.midiToFreq(midi), now);
        osc.detune.setValueAtTime(detuneValue, now);

        // Slow breathing gain envelope (pad swells)
        const attack = 2.0;
        const sustain = 3.0;
        const release = 2.0;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + attack);
        gain.gain.setValueAtTime(0.04, now + attack + sustain);
        gain.gain.linearRampToValueAtTime(0.0001, now + attack + sustain + release);

        osc.connect(gain);
        gain.connect(this.audioRouteGain);

        osc.start(now);
        osc.stop(now + attack + sustain + release);
        
        droneOscs.push(osc);
        droneGains.push(gain);
      });

      // Schedule next drone cycle in 6 seconds (slightly overlapping)
      setTimeout(triggerDrone, 5500);
    };

    triggerDrone();
  }

  // Microphone capture and analyzer setup
  public async toggleMicrophone(active: boolean): Promise<boolean> {
    if (!this.ctx) return false;
    
    this.isMicActive = active;
    const now = this.ctx.currentTime;

    if (active) {
      try {
        // Request microphone permission
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        if (this.ctx && this.micStream) {
          this.micSource = this.ctx.createMediaStreamSource(this.micStream);
          
          if (this.micRouteGain && this.audioRouteGain) {
            // Smooth routing transition: fade synth down, mic up
            this.audioRouteGain.gain.linearRampToValueAtTime(0.0, now + 0.3);
            this.micRouteGain.gain.linearRampToValueAtTime(1.0, now + 0.3);
            
            this.micSource.connect(this.micRouteGain);
          }
        }
        return true;
      } catch (err) {
        console.error('Microphone access denied:', err);
        this.isMicActive = false;
        return false;
      }
    } else {
      // Deactivate mic, resume synth
      if (this.micRouteGain && this.audioRouteGain) {
        this.audioRouteGain.gain.linearRampToValueAtTime(1.0, now + 0.3);
        this.micRouteGain.gain.linearRampToValueAtTime(0.0, now + 0.3);
      }

      // Cleanup stream
      if (this.micStream) {
        this.micStream.getTracks().forEach(track => track.stop());
        this.micStream = null;
      }
      if (this.micSource) {
        this.micSource.disconnect();
        this.micSource = null;
      }
      return false;
    }
  }

  // Get real-time audio visualization arrays
  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(256);
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public getTimeDomainData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(256);
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public isMicEnabled(): boolean {
    return this.isMicActive;
  }
}

// Export a single instance to share across visualizer and panels
export const synthInstance = new SynthEngine();
