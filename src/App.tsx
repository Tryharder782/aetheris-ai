import { useState } from 'react';
import { parsePrompt, type MoodParams } from './utils/promptParser';
import { Visualizer3D } from './components/Visualizer3D';
import { ControlPanel } from './components/ControlPanel';
import { synthInstance } from './audio/SynthEngine';
import { Eye, ShieldCheck, Volume2 } from 'lucide-react';
import './App.css';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [params, setParams] = useState<MoodParams>(() => parsePrompt('Cosmic Nebula'));
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  // Initialize the sound context and projection
  const handleInitialize = async () => {
    try {
      await synthInstance.init();
      synthInstance.updateParams(params);
      synthInstance.start();
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      // Fallback: Proceed anyway, controls will re-initialize
      setIsInitialized(true);
    }
  };

  // Submit prompt and trigger dynamic parsing
  const handlePromptSubmit = (promptText: string) => {
    setLoadingPrompt(true);
    
    // Simulate cognitive thinking pause
    setTimeout(() => {
      const newParams = parsePrompt(promptText);
      setParams(newParams);
      
      // Send parameters directly to synth
      synthInstance.updateParams(newParams);
      
      setLoadingPrompt(false);
    }, 400);
  };

  return (
    <div className="app-container">
      {/* 1. Introductory Landing Gate */}
      {!isInitialized && (
        <div className="landing-overlay">
          <div className="landing-glow-circle"></div>
          <div className="landing-content">
            <header className="landing-header">
              <span className="landing-pre">SENSORY INTERACTION INTERFACE</span>
              <h1 className="landing-title">A E T H E R I S &nbsp; A I</h1>
              <p className="landing-desc">
                Procedural Soundscape & Synesthetic 3D Particle Generator.
              </p>
            </header>

            <button onClick={handleInitialize} className="initialize-btn">
              <div className="btn-glow"></div>
              <span className="btn-text">INITIALIZE PROJECTION</span>
            </button>

            <footer className="landing-footer">
              <div className="disclaimer-item">
                <Volume2 size={13} />
                <span>Enables procedural audio synthesis</span>
              </div>
              <div className="disclaimer-item">
                <Eye size={13} />
                <span>Renders 50,000+ interactive particles</span>
              </div>
              <div className="disclaimer-item">
                <ShieldCheck size={13} />
                <span>Optimized for desktop and high performance</span>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* 2. Visualizer Backdrop */}
      <Visualizer3D params={params} />

      {/* 3. Main Dashboard UI (Only shown after initialization) */}
      {isInitialized && (
        <ControlPanel
          params={params}
          onUpdateParams={setParams}
          onPromptSubmit={handlePromptSubmit}
        />
      )}

      {/* 4. Loader screen during prompt updates */}
      {loadingPrompt && (
        <div className="prompt-loader">
          <div className="loader-spinner"></div>
          <span>CALIBRATING COGNITIVE SYNC...</span>
        </div>
      )}
    </div>
  );
}

export default App;
