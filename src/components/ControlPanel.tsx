import React, { useState, useEffect } from 'react';
import { Play, Square, Mic, MicOff, Send, Cpu } from 'lucide-react';
import type { MoodParams } from '../utils/promptParser';
import { synthInstance } from '../audio/SynthEngine';
import { SpectrumVisualizer } from './SpectrumVisualizer';
import { ConsoleTerminal } from './ConsoleTerminal';
import './ControlPanel.css';

interface ControlPanelProps {
  params: MoodParams;
  onUpdateParams: (newParams: MoodParams) => void;
  onPromptSubmit: (prompt: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onUpdateParams,
  onPromptSubmit,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [volume, setVolume] = useState(0.15);
  
  // Custom states for manual overrides
  const [localSpeed, setLocalSpeed] = useState(params.speed);
  const [localTurbulence, setLocalTurbulence] = useState(params.turbulence);

  // Sync state if parameters change from outside (presets)
  useEffect(() => {
    setLocalSpeed(params.speed);
    setLocalTurbulence(params.turbulence);
  }, [params]);

  // Handle Play/Stop Synthesizer
  const handleTogglePlay = async () => {
    await synthInstance.init();
    synthInstance.updateParams(params);
    
    if (isPlaying) {
      synthInstance.stop();
      setIsPlaying(false);
    } else {
      synthInstance.start();
      setIsPlaying(true);
      // Ensure mic is disabled if synth is started
      if (isMicEnabled) {
        await synthInstance.toggleMicrophone(false);
        setIsMicEnabled(false);
      }
    }
  };

  // Handle Microphone Input Toggle
  const handleToggleMic = async () => {
    await synthInstance.init();
    
    const active = !isMicEnabled;
    const success = await synthInstance.toggleMicrophone(active);
    
    if (success) {
      setIsMicEnabled(true);
      setIsPlaying(true); // Treat mic activity as "active play state" for visualizer
    } else {
      setIsMicEnabled(false);
      if (!synthInstance.isPlaying()) {
        setIsPlaying(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptInput.trim()) {
      onPromptSubmit(promptInput);
      setPromptInput('');
    }
  };

  const handlePresetClick = (preset: string) => {
    onPromptSubmit(preset);
  };

  // Handle Slider Changes
  const handleSpeedChange = (val: number) => {
    setLocalSpeed(val);
    onUpdateParams({ ...params, speed: val });
  };

  const handleTurbulenceChange = (val: number) => {
    setLocalTurbulence(val);
    onUpdateParams({ ...params, turbulence: val });
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    synthInstance.setVolume(val);
  };

  const handleShapeSelect = (shape: 'nebula' | 'helix' | 'grid' | 'neural') => {
    onUpdateParams({ ...params, shapeMode: shape });
  };

  return (
    <div className="dashboard-overlay">
      {/* 1. Brand Header */}
      <header className="brand-header">
        <div className="logo-container">
          <Cpu className="cpu-icon animate-pulse" size={20} />
          <h1>AETHERIS AI</h1>
        </div>
        <div className="status-badge">
          <span className={`status-dot ${isPlaying ? 'active' : ''}`}></span>
          <span className="status-text">{isPlaying ? 'SYSTEM RUNNING' : 'STANDBY'}</span>
        </div>
      </header>

      {/* 2. Main Dashboard Panel */}
      <main className="dashboard-content">
        
        {/* Left Control Column */}
        <section className="glass-panel control-col">
          <h2 className="panel-title">Semantic Synesthesia Engine</h2>
          <p className="panel-subtitle">Translate text or audio into 3D WebGL vectors & procedural frequencies.</p>

          {/* AI Prompt Input */}
          <form onSubmit={handleSubmit} className="prompt-form">
            <div className="input-glow-wrapper">
              <input
                type="text"
                placeholder="Type an aesthetic (e.g. Neon Tokyo Rain, Ocean Zen, Solar Winds)..."
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="prompt-input"
              />
              <button type="submit" className="submit-btn" aria-label="Synthesize">
                <Send size={15} />
              </button>
            </div>
          </form>

          {/* Quick presets */}
          <div className="presets-container">
            <span className="presets-label">PRESET IDEAS:</span>
            <div className="presets-row">
              <button onClick={() => handlePresetClick('Neon Tokyo Cyber Rain')} className="preset-chip cyber">⚡ Cyberpunk</button>
              <button onClick={() => handlePresetClick('Ethereal Cosmic Nebula Cloud')} className="preset-chip cosmic">🌌 Cosmic</button>
              <button onClick={() => handlePresetClick('Calm Deep Ocean Shanti')} className="preset-chip ocean">🌊 Zen Ocean</button>
              <button onClick={() => handlePresetClick('Thermodynamic Solar Plasma Storm')} className="preset-chip solar">🔥 Solar Flare</button>
            </div>
          </div>

          <hr className="divider" />

          {/* Core Synthesis Controls */}
          <div className="control-group">
            <h3 className="group-title">Acoustic & Kinetic Calibration</h3>
            
            {/* Audio Engine Primary Toggles */}
            <div className="engine-toggles">
              <button 
                onClick={handleTogglePlay} 
                className={`btn btn-primary ${isPlaying && !isMicEnabled ? 'playing' : ''}`}
              >
                {isPlaying && !isMicEnabled ? (
                  <>
                    <Square size={16} fill="currentColor" />
                    <span>MUTE SYNTH</span>
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    <span>START SYNTH</span>
                  </>
                )}
              </button>

              <button 
                onClick={handleToggleMic} 
                className={`btn btn-secondary ${isMicEnabled ? 'mic-active' : ''}`}
              >
                {isMicEnabled ? (
                  <>
                    <MicOff size={16} />
                    <span>MIC ACTIVE</span>
                  </>
                ) : (
                  <>
                    <Mic size={16} />
                    <span>SYNC MICROPHONE</span>
                  </>
                )}
              </button>
            </div>

            {/* Sliders */}
            <div className="slider-item">
              <div className="slider-label">
                <span>SYNTH VOLUME</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.01"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="custom-slider"
              />
            </div>

            <div className="slider-item">
              <div className="slider-label">
                <span>PARTICLE SPEED</span>
                <span>{localSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={localSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="custom-slider"
              />
            </div>

            <div className="slider-item">
              <div className="slider-label">
                <span>NOISE TURBULENCE</span>
                <span>{localTurbulence.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="4.0"
                step="0.1"
                value={localTurbulence}
                onChange={(e) => handleTurbulenceChange(parseFloat(e.target.value))}
                className="custom-slider"
              />
            </div>
          </div>

          <hr className="divider" />

          {/* Visual Shape Override */}
          <div className="control-group">
            <h3 className="group-title">WebGL Topology Model</h3>
            <div className="shape-grid">
              {(['nebula', 'helix', 'grid', 'neural'] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() => handleShapeSelect(shape)}
                  className={`shape-btn ${params.shapeMode === shape ? 'active' : ''}`}
                >
                  {shape.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Info / Terminal Column */}
        <section className="glass-panel terminal-col">
          <div className="spectrum-container">
            <h3 className="group-title">Acoustic Signal Frequency</h3>
            <div className="spectrum-wrapper">
              <SpectrumVisualizer 
                primaryColor={params.primaryColor} 
                secondaryColor={params.secondaryColor} 
              />
            </div>
          </div>

          <div className="terminal-container">
            <h3 className="group-title">Cognitive AI Node Log</h3>
            <div className="terminal-wrapper">
              <ConsoleTerminal logs={params.logs} />
            </div>
          </div>

          {/* Active Configuration Details */}
          <div className="config-grid">
            <div className="config-item">
              <span className="config-label">ACTIVE THEME</span>
              <span className="config-val color-pulse" style={{ color: params.primaryColor }}>
                {params.name.toUpperCase()}
              </span>
            </div>
            <div className="config-item">
              <span className="config-label">SYNTH SCALE</span>
              <span className="config-val">{params.scale}</span>
            </div>
            <div className="config-item">
              <span className="config-label">TEMPO</span>
              <span className="config-val">{params.tempo} BPM</span>
            </div>
            <div className="config-item">
              <span className="config-label">RENDER SPEED</span>
              <span className="config-val">60 FPS</span>
            </div>
          </div>
        </section>
      </main>

      {/* 3. Luxury Developer Footer */}
      <footer className="glass-panel signature-footer">
        <div className="developer-info">
          <span className="footer-title">SEMETEI A.</span>
          <span className="footer-desc">Creative Technologist — Specializing in WebGL, Three.js & AI Web Integrations.</span>
        </div>
        <div className="cta-buttons">
          <a href="https://www.upwork.com/freelancers/~01c743dbd4dafb51c7?mp_source=share" target="_blank" rel="noopener noreferrer" className="cta-link hire">
            HIRE ME ON UPWORK
          </a>
          <a href="https://github.com/Tryharder782" target="_blank" rel="noopener noreferrer" className="cta-link portfolio">
            GITHUB PORTFOLIO
          </a>
        </div>
      </footer>
    </div>
  );
};
