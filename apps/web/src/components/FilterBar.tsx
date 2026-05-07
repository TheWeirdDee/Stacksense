'use client';

import { SignalType } from "@/types";

interface FilterBarProps {
  activeSignal: SignalType | 'all';
  setActiveSignal: (signal: SignalType | 'all') => void;
  activeProtocol: string | 'all';
  setActiveProtocol: (protocol: string | 'all') => void;
}

const protocols = ["ALEX", "Arkadiko", "Velar", "sBTC Bridge", "Native STX"];
const signals: (SignalType | 'all')[] = ['all', 'bullish', 'neutral', 'risk', 'anomaly'];

export default function FilterBar({ 
  activeSignal, 
  setActiveSignal, 
  activeProtocol, 
  setActiveProtocol 
}: FilterBarProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-3">Signal Filter</h4>
        <div className="flex flex-col gap-1">
          {signals.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSignal(s)}
              className={`text-left px-3 py-2 rounded text-xs transition-colors ${
                activeSignal === s 
                  ? 'bg-background-elevated text-text-primary border border-background-border' 
                  : 'text-text-secondary hover:bg-background-elevated/50'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-3">Protocol Filter</h4>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setActiveProtocol('all')}
            className={`text-left px-3 py-2 rounded text-xs transition-colors ${
              activeProtocol === 'all' 
                ? 'bg-background-elevated text-text-primary border border-background-border' 
                : 'text-text-secondary hover:bg-background-elevated/50'
            }`}
          >
            ALL PROTOCOLS
          </button>
          {protocols.map((p) => (
            <button
              key={p}
              onClick={() => setActiveProtocol(p)}
              className={`text-left px-3 py-2 rounded text-xs transition-colors ${
                activeProtocol === p 
                  ? 'bg-background-elevated text-text-primary border border-background-border' 
                  : 'text-text-secondary hover:bg-background-elevated/50'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
