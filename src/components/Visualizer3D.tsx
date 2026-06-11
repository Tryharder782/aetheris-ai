import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { MoodParams } from '../utils/promptParser';
import { synthInstance } from '../audio/SynthEngine';

// Custom Shader Material definition for particle morphing and audio rendering
const SynesthesiaShaderMaterial = {
  uniforms: {
    uTime: { value: 0.0 },
    uVolume: { value: 0.0 },
    uBass: { value: 0.0 },
    uTreble: { value: 0.0 },
    uSpeed: { value: 1.0 },
    uTurbulence: { value: 1.0 },
    uParticleSize: { value: 0.04 },
    uCurrentShape: { value: 0.0 }, // 0: Nebula, 1: Helix, 2: Grid, 3: Neural
    uTargetShape: { value: 0.0 },
    uMorphProgress: { value: 1.0 },
    uPrimaryColor: { value: new THREE.Color('#a855f7') },
    uSecondaryColor: { value: new THREE.Color('#06b6d4') },
    uAccentColor: { value: new THREE.Color('#e11d48') },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uVolume;
    uniform float uBass;
    uniform float uTreble;
    uniform float uSpeed;
    uniform float uTurbulence;
    uniform float uParticleSize;
    uniform float uCurrentShape;
    uniform float uTargetShape;
    uniform float uMorphProgress;
    
    uniform vec3 uPrimaryColor;
    uniform vec3 uSecondaryColor;
    uniform vec3 uAccentColor;

    attribute vec3 aPositionNebula;
    attribute vec3 aPositionHelix;
    attribute vec3 aPositionGrid;
    attribute vec3 aPositionNeural;
    attribute float aRandom;

    varying vec3 vColor;
    varying float vAlpha;

    // Simple pseudo-random generator
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // 3D Sine noise approximation
    float sineNoise(vec3 p) {
      return sin(p.x * 2.0) * sin(p.y * 2.0) * sin(p.z * 2.0);
    }

    vec3 getShapePosition(float mode) {
      if (mode < 0.5) {
        return aPositionNebula;
      } else if (mode < 1.5) {
        return aPositionHelix;
      } else if (mode < 2.5) {
        return aPositionGrid;
      } else {
        return aPositionNeural;
      }
    }

    void main() {
      // Retrieve the two shapes we are morphing between
      vec3 posA = getShapePosition(uCurrentShape);
      vec3 posB = getShapePosition(uTargetShape);
      
      // Interpolate base positions
      vec3 basePos = mix(posA, posB, uMorphProgress);
      
      // Apply noise deformation based on audio and turbulence
      float noiseVal = sineNoise(basePos * uTurbulence * 0.5 + uTime * uSpeed * 0.3);
      
      // Displace particles
      vec3 displacedPos = basePos;
      
      // Dynamic noise displacement depending on shape
      if (uTargetShape < 0.5) { // Nebula
        displacedPos += normalize(basePos) * noiseVal * 0.45 * (1.0 + uBass * 2.0);
      } else if (uTargetShape < 1.5) { // Helix
        displacedPos.x += sin(basePos.y * 4.0 + uTime * 2.0) * 0.15 * (1.0 + uTreble * 1.5);
        displacedPos.z += cos(basePos.y * 4.0 + uTime * 2.0) * 0.15 * (1.0 + uTreble * 1.5);
      } else if (uTargetShape < 2.5) { // Grid
        // Wave ripple effect on Grid
        float dist = length(basePos.xz);
        float ripple = sin(dist * 6.0 - uTime * 5.0 * uSpeed) * 0.25 * (1.0 + uVolume * 2.5);
        displacedPos.y += ripple;
      } else { // Neural
        // Breathing cluster effect
        displacedPos += noiseVal * 0.12 * (1.0 + uVolume * 1.8);
      }
      
      // Calculate particle size based on camera depth and audio treble
      vec4 mvPosition = modelViewMatrix * vec4(displacedPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      float sizeFactor = 1.0 + uTreble * 2.0 + sin(uTime * 3.0 + aRandom * 10.0) * 0.3;
      gl_PointSize = uParticleSize * (150.0 / -mvPosition.z) * sizeFactor;
      
      // Color mixing based on coordinates and random weights
      float mixWeight = clamp((displacedPos.y + 2.0) / 4.0, 0.0, 1.0);
      vec3 baseColor = mix(uPrimaryColor, uSecondaryColor, mixWeight);
      
      // Add accent color based on random factor and audio volume
      if (aRandom > 0.8) {
        baseColor = mix(baseColor, uAccentColor, 0.4 + uVolume * 0.6);
      }
      
      vColor = baseColor;
      
      // Audio-driven alpha breathing
      vAlpha = 0.35 + (0.45 * sin(uTime * 2.0 + aRandom * 6.28)) + (uVolume * 0.4);
      vAlpha = clamp(vAlpha, 0.15, 0.95);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Create a smooth circular particle glow instead of square box
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      // Soft glow falloff
      float glow = smoothstep(0.5, 0.1, dist);
      
      gl_FragColor = vec4(vColor, glow * vAlpha);
    }
  `
};

interface ParticleSystemProps {
  params: MoodParams;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ params }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Track shape morph state
  const shapeState = useRef({
    current: 0,
    target: 0,
    progress: 1.0,
  });

  const particleCount = 50000;

  // Pre-calculate positions for all 4 shape modes once
  const geometries = useMemo(() => {
    const nebula = new Float32Array(particleCount * 3);
    const helix = new Float32Array(particleCount * 3);
    const grid = new Float32Array(particleCount * 3);
    const neural = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount);

    // Neural cluster centers
    const centers = [
      [1.5, 1.5, 0], [-1.5, 1.5, 1.0], [0, -1.2, -1.2], 
      [1.2, -0.8, 1.2], [-1.2, -0.8, -1.2], [0, 1.8, -1.0], 
      [1.8, 0, -1.5], [-1.8, 0, 1.5], [1.0, 0.2, 0.8], [-1.0, -0.2, -0.8]
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      randoms[i] = Math.random();

      // 1. NEBULA (Spherical ball)
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      // Concentrated towards the core but with outward dust
      const r = Math.pow(Math.random(), 1.5) * 2.4 + 0.1; 
      nebula[i3] = r * Math.sin(phi) * Math.cos(theta);
      nebula[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      nebula[i3 + 2] = r * Math.cos(phi);

      // 2. HELIX (Double DNA Helix)
      const t = (i / particleCount) * Math.PI * 18; // Spirals
      const isStrandB = Math.random() > 0.5;
      const angle = t + (isStrandB ? Math.PI : 0);
      const rad = 1.0 + Math.random() * 0.25; // Helix core radius
      const spread = (Math.random() - 0.5) * 0.25; // Spread dust
      
      helix[i3] = (rad + spread) * Math.cos(angle);
      helix[i3 + 1] = (t / (Math.PI * 18)) * 5.0 - 2.5 + (Math.random() - 0.5) * 0.1; // Height
      helix[i3 + 2] = (rad + spread) * Math.sin(angle);

      // 3. CYBER GRID (XZ Flat deformed Grid)
      // Map to concentric rings or standard grid
      const gridAngle = Math.random() * Math.PI * 2;
      const gridRad = Math.pow(Math.random(), 0.8) * 3.5;
      grid[i3] = gridRad * Math.cos(gridAngle) + (Math.random() - 0.5) * 0.05;
      grid[i3 + 1] = -1.2; // Floor level
      grid[i3 + 2] = gridRad * Math.sin(gridAngle) + (Math.random() - 0.5) * 0.05;

      // 4. NEURAL NETWORK (Cluster nodes and fibers)
      if (Math.random() > 0.4) {
        // Grouped tightly around one of the centers
        const center = centers[i % centers.length];
        const clusterSpread = 0.25 + Math.random() * 0.2;
        const thetaN = Math.random() * 2 * Math.PI;
        const phiN = Math.acos(Math.random() * 2 - 1);
        neural[i3] = center[0] + clusterSpread * Math.sin(phiN) * Math.cos(thetaN);
        neural[i3 + 1] = center[1] + clusterSpread * Math.sin(phiN) * Math.sin(thetaN);
        neural[i3 + 2] = center[2] + clusterSpread * Math.cos(phiN);
      } else {
        // Fiber connection between two random centers
        const c1 = centers[Math.floor(Math.random() * centers.length)];
        const c2 = centers[Math.floor(Math.random() * centers.length)];
        const lerpFactor = Math.random();
        const lineOffset = 0.06; // tight lines
        
        neural[i3] = THREE.MathUtils.lerp(c1[0], c2[0], lerpFactor) + (Math.random() - 0.5) * lineOffset;
        neural[i3 + 1] = THREE.MathUtils.lerp(c1[1], c2[1], lerpFactor) + (Math.random() - 0.5) * lineOffset;
        neural[i3 + 2] = THREE.MathUtils.lerp(c1[2], c2[2], lerpFactor) + (Math.random() - 0.5) * lineOffset;
      }
    }

    return { nebula, helix, grid, neural, randoms };
  }, []);

  // Map shape string to float index
  const getShapeIndex = (shape: string): number => {
    switch (shape) {
      case 'nebula': return 0.0;
      case 'helix': return 1.0;
      case 'grid': return 2.0;
      case 'neural': return 3.0;
      default: return 0.0;
    }
  };

  // Trigger shape change transitions
  useEffect(() => {
    const targetIdx = getShapeIndex(params.shapeMode);
    
    if (targetIdx !== shapeState.current.target) {
      // Morph transition start
      shapeState.current.current = shapeState.current.target;
      shapeState.current.target = targetIdx;
      shapeState.current.progress = 0.0;
    }
  }, [params.shapeMode]);

  // Update shader uniforms inside the Three.js loop
  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;

    // 1. Fetch real-time WebAudio metrics
    const freqData = synthInstance.getFrequencyData();
    
    let sum = 0;
    let bass = 0;
    let treble = 0;
    
    const len = freqData.length;
    for (let i = 0; i < len; i++) {
      const val = freqData[i] / 255.0;
      sum += val;
      if (i < len * 0.15) bass += val;      // Bass frequencies
      if (i > len * 0.6) treble += val;     // Treble frequencies
    }
    
    const volume = sum / len;
    const bassAvg = bass / (len * 0.15);
    const trebleAvg = treble / (len * 0.4);

    // 2. Smoothly advance morph transition
    if (shapeState.current.progress < 1.0) {
      shapeState.current.progress += 0.02; // morph over 50 frames (~0.8s)
      if (shapeState.current.progress > 1.0) {
        shapeState.current.progress = 1.0;
      }
    }

    // 3. Inject uniform values
    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uVolume.value = volume;
    material.uniforms.uBass.value = bassAvg;
    material.uniforms.uTreble.value = trebleAvg;
    material.uniforms.uSpeed.value = params.speed;
    material.uniforms.uTurbulence.value = params.turbulence;
    material.uniforms.uParticleSize.value = params.particleSize;
    material.uniforms.uCurrentShape.value = shapeState.current.current;
    material.uniforms.uTargetShape.value = shapeState.current.target;
    material.uniforms.uMorphProgress.value = shapeState.current.progress;

    // Smooth color blending updates
    material.uniforms.uPrimaryColor.value.lerp(new THREE.Color(params.primaryColor), 0.05);
    material.uniforms.uSecondaryColor.value.lerp(new THREE.Color(params.secondaryColor), 0.05);
    material.uniforms.uAccentColor.value.lerp(new THREE.Color(params.accentColor), 0.05);

    // Slowly rotate the entire system for premium cinematography
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.04 * params.speed;
      pointsRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.02) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[geometries.nebula, 3]}
        />
        <bufferAttribute
          attach="attributes-aPositionNebula"
          args={[geometries.nebula, 3]}
        />
        <bufferAttribute
          attach="attributes-aPositionHelix"
          args={[geometries.helix, 3]}
        />
        <bufferAttribute
          attach="attributes-aPositionGrid"
          args={[geometries.grid, 3]}
        />
        <bufferAttribute
          attach="attributes-aPositionNeural"
          args={[geometries.neural, 3]}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          args={[geometries.randoms, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        args={[SynesthesiaShaderMaterial]}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

interface Visualizer3DProps {
  params: MoodParams;
}

export const Visualizer3D: React.FC<Visualizer3DProps> = ({ params }) => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050508']} />
        <ambientLight intensity={1.5} />
        <ParticleSystem params={params} />
        <OrbitControls
          enableZoom={true}
          maxDistance={8}
          minDistance={2}
          enablePan={false}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
};
