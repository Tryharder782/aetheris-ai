export interface MoodParams {
  name: string;
  primaryColor: string; // Hex code
  secondaryColor: string; // Hex code
  accentColor: string; // Hex code
  particleCount: number;
  speed: number;
  turbulence: number;
  particleSize: number;
  shapeMode: 'nebula' | 'helix' | 'grid' | 'neural';
  scale: string; // e.g. "C Minor Pentatonic"
  scaleNotes: number[]; // Midi offsets or frequencies
  baseFreq: number; // Hz
  tempo: number; // BPM
  synthType: 'sine' | 'triangle' | 'sawtooth' | 'square';
  delayTime: number; // seconds
  filterCutoff: number; // Hz
  lfoRate: number; // Hz
  logs: string[];
}

// Helper to convert simple string hashing to deterministic parameters
const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Map hash to a color hex string
const hashToColor = (hash: number, offset = 0): string => {
  const h = (hash + offset) % 360;
  const s = 70 + (hash % 20); // 70-90% saturation
  const l = 40 + (hash % 15); // 40-55% lightness
  return `hsl(${h}, ${s}%, ${l}%)`;
};

// Standard scales relative to a root note (e.g. C)
const SCALES = {
  pentatonicMinor: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22], // Mysterious, cyber
  lydian: [0, 2, 4, 6, 7, 9, 11, 12, 14, 16], // Dreamy, cosmic
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12, 13, 15], // Dark, exotic, cyberpunk
  dorian: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15], // Sci-fi, clean
  major: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], // Warm, peaceful
};

export const parsePrompt = (prompt: string): MoodParams => {
  const clean = prompt.toLowerCase().trim();
  const hash = hashCode(clean);

  // Default parameters
  let name = 'Aetheris Flow';
  let primaryColor = '#a855f7'; // Purple
  let secondaryColor = '#06b6d4'; // Cyan
  let accentColor = '#e11d48'; // Rose
  let particleCount = 45000;
  let speed = 1.0;
  let turbulence = 1.2;
  let particleSize = 0.04;
  let shapeMode: 'nebula' | 'helix' | 'grid' | 'neural' = 'nebula';
  let scaleName = 'Dorian';
  let scaleNotes = SCALES.dorian;
  let baseFreq = 110; // Root note A2
  let tempo = 80;
  let synthType: 'sine' | 'triangle' | 'sawtooth' | 'square' = 'triangle';
  let delayTime = 0.4;
  let filterCutoff = 1200;
  let lfoRate = 0.5;

  // Analysis logs for the simulated terminal
  const logs: string[] = [
    `[Semantic Engine] Initializing cognitive parse for query: "${prompt}"`,
    `[NLP Engine] Running lexical keyword extraction...`,
  ];

  // Simple keyword matching for 5 premium categories
  if (clean.includes('cyber') || clean.includes('neon') || clean.includes('rain') || clean.includes('tokyo') || clean.includes('synth') || clean.includes('city') || clean.includes('matrix')) {
    name = 'Cyberpunk Rain';
    primaryColor = '#ff007f'; // Neon Pink
    secondaryColor = '#00f0ff'; // Neon Cyan
    accentColor = '#facc15'; // Yellow
    particleCount = 55000;
    speed = 1.6;
    turbulence = 2.2;
    particleSize = 0.05;
    shapeMode = 'grid';
    scaleName = 'Phrygian (Dark Cyber)';
    scaleNotes = SCALES.phrygian;
    baseFreq = 73.42; // D2 (Deep)
    tempo = 110;
    synthType = 'sawtooth';
    delayTime = 0.35;
    filterCutoff = 1800;
    lfoRate = 2.5;

    logs.push(
      `[Semantic Engine] Match found: [CYBERPUNK / RETRO-FUTURE]`,
      `[Visualizer Map] Initializing Cyber Grid shape (Bending landscape)`,
      `[Visualizer Map] Applied Neon Palette: Cyber Pink (#ff007f) & Cyan (#00f0ff)`,
      `[Synth Engine] Calibrating to D Phrygian Scale at 110 BPM (High energy)`,
      `[Synth Engine] Enabling Low-Frequency Oscillator (LFO) sweep [sawtooth wave, cutoff: 1800Hz]`
    );
  } else if (clean.includes('space') || clean.includes('cosmos') || clean.includes('galaxy') || clean.includes('nebula') || clean.includes('star') || clean.includes('astral') || clean.includes('cluster') || clean.includes('universe')) {
    name = 'Cosmic Nebula';
    primaryColor = '#8b5cf6'; // Violet
    secondaryColor = '#ec4899'; // Pink
    accentColor = '#3b82f6'; // Blue
    particleCount = 65000;
    speed = 0.6;
    turbulence = 1.5;
    particleSize = 0.035;
    shapeMode = 'nebula';
    scaleName = 'Lydian (Ethereal Cosmic)';
    scaleNotes = SCALES.lydian;
    baseFreq = 110.0; // A2
    tempo = 65;
    synthType = 'sine';
    delayTime = 0.6;
    filterCutoff = 800;
    lfoRate = 0.2;

    logs.push(
      `[Semantic Engine] Match found: [COSMIC / NEBULA SPACE]`,
      `[Visualizer Map] Initializing Gas Nebula Cloud (3D Spherical Gravitational Field)`,
      `[Visualizer Map] Applied Cosmic Palette: Deep Violet (#8b5cf6) & Pink Gas (#ec4899)`,
      `[Synth Engine] Calibrating to A Lydian Scale at 65 BPM (Spacious ambient)`,
      `[Synth Engine] Adjusting Space-Delay feedback to 0.6s (Deep cosmic echo), Filter cutoff: 800Hz`
    );
  } else if (clean.includes('ocean') || clean.includes('water') || clean.includes('zen') || clean.includes('calm') || clean.includes('peace') || clean.includes('deep blue') || clean.includes('sea') || clean.includes('river') || clean.includes('abyss') || clean.includes('shanti')) {
    name = 'Zen Oceanic';
    primaryColor = '#0284c7'; // Deep Sky Blue
    secondaryColor = '#0d9488'; // Teal
    accentColor = '#38bdf8'; // Light blue
    particleCount = 40000;
    speed = 0.5;
    turbulence = 0.8;
    particleSize = 0.03;
    shapeMode = 'helix';
    scaleName = 'Major Pentatonic (Harmonic Zen)';
    scaleNotes = SCALES.major;
    baseFreq = 130.81; // C3
    tempo = 55;
    synthType = 'sine';
    delayTime = 0.8;
    filterCutoff = 600;
    lfoRate = 0.1;

    logs.push(
      `[Semantic Engine] Match found: [OCEANIC / ZEN ATMOSPHERE]`,
      `[Visualizer Map] Initializing DNA Helix & Fluid Stream shape`,
      `[Visualizer Map] Applied Aqueous Palette: Deep Blue (#0284c7) & Zen Teal (#0d9488)`,
      `[Synth Engine] Calibrating to C Major Scale at 55 BPM (Ultra relaxation)`,
      `[Synth Engine] Engaging soft-dome sound synthesis (sine wave, filter: 600Hz, slow 0.1Hz LFO)`
    );
  } else if (clean.includes('life') || clean.includes('plant') || clean.includes('forest') || clean.includes('organic') || clean.includes('green') || clean.includes('nature') || clean.includes('dna') || clean.includes('biology')) {
    name = 'Organic Growth';
    primaryColor = '#10b981'; // Emerald Green
    secondaryColor = '#84cc16'; // Lime
    accentColor = '#f59e0b'; // Amber
    particleCount = 42000;
    speed = 0.85;
    turbulence = 1.8;
    particleSize = 0.04;
    shapeMode = 'neural';
    scaleName = 'Dorian (Natural Balance)';
    scaleNotes = SCALES.dorian;
    baseFreq = 98.0; // G2
    tempo = 85;
    synthType = 'triangle';
    delayTime = 0.45;
    filterCutoff = 1000;
    lfoRate = 0.7;

    logs.push(
      `[Semantic Engine] Match found: [ORGANIC / NEURAL NETWORK]`,
      `[Visualizer Map] Initializing Neural Network (Interconnected biological nodes)`,
      `[Visualizer Map] Applied Forest Palette: Emerald (#10b981) & Lime Green (#84cc16)`,
      `[Synth Engine] Calibrating to G Dorian Scale at 85 BPM (Dynamic balance)`,
      `[Synth Engine] Setting filter resonance and moderate delay: 0.45s`
    );
  } else if (clean.includes('fire') || clean.includes('sun') || clean.includes('hot') || clean.includes('solar') || clean.includes('lava') || clean.includes('burn') || clean.includes('magma') || clean.includes('energy') || clean.includes('storm')) {
    name = 'Solar Plasma';
    primaryColor = '#f97316'; // Orange
    secondaryColor = '#ef4444'; // Red
    accentColor = '#eab308'; // Gold
    particleCount = 60000;
    speed = 2.0;
    turbulence = 3.0;
    particleSize = 0.055;
    shapeMode = 'nebula';
    scaleName = 'Phrygian Dominant (Solar Rage)';
    scaleNotes = SCALES.phrygian;
    baseFreq = 82.41; // E2 (Deep drone)
    tempo = 125;
    synthType = 'sawtooth';
    delayTime = 0.25;
    filterCutoff = 2200;
    lfoRate = 4.0;

    logs.push(
      `[Semantic Engine] Match found: [SOLAR PLASMA / THERMODYNAMIC]`,
      `[Visualizer Map] Initializing High-Turbulence Plasma Core`,
      `[Visualizer Map] Applied Plasma Palette: Orange Flare (#f97316) & Solar Red (#ef4444)`,
      `[Synth Engine] Calibrating to E Phrygian Scale at 125 BPM (Aggressive, fiery)`,
      `[Synth Engine] Maximizing cutoff filter to 2200Hz, setting LFO rate to 4.0Hz for pulse effect`
    );
  } else {
    // Generative fallback for any arbitrary prompt (Dynamic Hashing)
    name = `Generative Mood #${(hash % 900) + 100}`;
    primaryColor = hashToColor(hash, 0);
    secondaryColor = hashToColor(hash, 120);
    accentColor = hashToColor(hash, 240);
    
    // Choose shape based on hash modulo
    const shapes: ('nebula' | 'helix' | 'grid' | 'neural')[] = ['nebula', 'helix', 'grid', 'neural'];
    shapeMode = shapes[hash % 4];

    // Determine scale based on hash
    const scaleKeys = Object.keys(SCALES) as Array<keyof typeof SCALES>;
    const chosenKey = scaleKeys[hash % scaleKeys.length];
    scaleNotes = SCALES[chosenKey];
    scaleName = chosenKey.charAt(0).toUpperCase() + chosenKey.slice(1);

    // Audio settings mapped from hash digits
    tempo = 60 + (hash % 80); // 60 - 140 BPM
    baseFreq = [55, 65.4, 73.4, 82.4, 98.0, 110.0][hash % 6]; // Deep base frequencies A1 to A2
    
    const synths: ('sine' | 'triangle' | 'sawtooth' | 'square')[] = ['sine', 'triangle', 'sawtooth', 'square'];
    synthType = synths[hash % 4];
    
    speed = 0.4 + ((hash % 16) / 10); // 0.4 - 2.0
    turbulence = 0.5 + ((hash % 25) / 10); // 0.5 - 3.0
    particleSize = 0.02 + ((hash % 50) / 1000); // 0.02 - 0.07
    particleCount = 30000 + (hash % 40) * 1000; // 30k - 70k

    delayTime = 0.2 + ((hash % 8) / 10); // 0.2s - 1.0s
    filterCutoff = 500 + (hash % 2000); // 500Hz - 2500Hz
    lfoRate = 0.05 + ((hash % 40) / 10); // 0.05Hz - 4Hz

    logs.push(
      `[Semantic Engine] No strict keyword match. Compiling generative semantic model.`,
      `[AI Neural Net] Generating hash vectors... Signature: 0x${hash.toString(16).toUpperCase()}`,
      `[Visualizer Map] Mapping hash to shape: [${shapeMode.toUpperCase()}]`,
      `[Visualizer Map] Compiling custom palette: Color1 = ${primaryColor}, Color2 = ${secondaryColor}`,
      `[Synth Engine] Calibrating custom synthesizer: Scale = ${scaleName}, Root = ${baseFreq}Hz`,
      `[Synth Engine] Auto-configuring parameters: Tempo = ${tempo} BPM, Oscillator = ${synthType}, LFO = ${lfoRate.toFixed(2)}Hz`
    );
  }

  logs.push(`[Cognitive Sync] Synesthetic engine fully calibrated and operational.`);

  return {
    name,
    primaryColor,
    secondaryColor,
    accentColor,
    particleCount,
    speed,
    turbulence,
    particleSize,
    shapeMode,
    scale: scaleName,
    scaleNotes,
    baseFreq,
    tempo,
    synthType,
    delayTime,
    filterCutoff,
    lfoRate,
    logs,
  };
};
