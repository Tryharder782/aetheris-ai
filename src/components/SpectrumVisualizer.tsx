import React, { useRef, useEffect } from 'react';
import { synthInstance } from '../audio/SynthEngine';

interface SpectrumVisualizerProps {
  primaryColor: string;
  secondaryColor: string;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  primaryColor,
  secondaryColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Handle high DPI displays
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      // Fetch audio data
      const freqData = synthInstance.getFrequencyData();
      const timeData = synthInstance.getTimeDomainData();

      // Clear with very slight transparency to leave a trailing blur effect
      ctx.fillStyle = 'rgba(5, 5, 8, 0.25)';
      ctx.fillRect(0, 0, w, h);

      // Create gradient matching the active theme
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(1, secondaryColor);

      // 1. Draw Frequency Bars (left half)
      const barCount = 40;
      const barWidth = (w / 2) / barCount;
      ctx.fillStyle = grad;

      for (let i = 0; i < barCount; i++) {
        // Sample frequencies logarithmically for better visual representation
        const sampleIndex = Math.floor(Math.pow(i / barCount, 1.5) * (freqData.length * 0.6));
        const val = freqData[sampleIndex] || 0;
        const percent = val / 255;
        const barHeight = Math.max(2, percent * h * 0.85);
        const x = i * barWidth;
        const y = h - barHeight;

        // Rounded rectangles for premium vibe
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2) : ctx.rect(x + 1, y, barWidth - 2, barHeight);
        ctx.fill();
      }

      // 2. Draw Oscilloscope Waveform (right half)
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.0;
      ctx.beginPath();

      const waveWidth = w / 2;
      const sliceWidth = waveWidth / timeData.length;
      let x = w / 2;

      for (let i = 0; i < timeData.length; i++) {
        const val = timeData[i] / 128.0; // center at 1.0
        const y = (val * h) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Draw subtle separator line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [primaryColor, secondaryColor]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};
