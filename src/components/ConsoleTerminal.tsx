import React, { useState, useEffect, useRef } from 'react';

interface ConsoleTerminalProps {
  logs: string[];
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({ logs }) => {
  const [displayedLogs, setDisplayedLogs] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs.length === 0) return;

    setDisplayedLogs([]);
    let currentLine = 0;

    const interval = setInterval(() => {
      if (currentLine < logs.length) {
        const nextLine = logs[currentLine];
        setDisplayedLogs((prev) => [...prev, nextLine]);
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [logs]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLogs]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '11px',
        color: '#34d399', // emerald green text
        backgroundColor: 'rgba(5, 5, 8, 0.5)',
        border: '1px solid rgba(52, 211, 153, 0.15)',
        borderRadius: '6px',
        padding: '10px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        lineHeight: '1.4',
        boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8)',
      }}
    >
      {displayedLogs.map((log, index) => {
        if (!log) return null;
        let color = '#34d399'; // default green
        if (log.includes('[Semantic Engine]')) color = '#f472b6'; // pink
        if (log.includes('[Synth Engine]')) color = '#60a5fa'; // blue
        if (log.includes('[Visualizer Map]')) color = '#c084fc'; // purple
        if (log.includes('[Cognitive Sync]')) color = '#fb7185'; // rose

        return (
          <div key={index} style={{ color, wordBreak: 'break-all' }}>
            {log}
          </div>
        );
      })}
      {displayedLogs.length < logs.length && (
        <div style={{ display: 'inline-block', width: '6px', height: '12px', backgroundColor: '#34d399', animation: 'blink 0.8s infinite' }} />
      )}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
