import React, { useState, useEffect } from 'react';

const placeholders = [
  "Query architectural patterns or data insights...",
  "Compare sales with last year performance...",
  "Identify products with declining revenue trends...",
  "List customers inactive for six months...",
  "Top performing regions by profit margin..."
];

export function WorkspacePage() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        setOpacity(1);
      }, 300);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Top Half: AI Command Center */}
      <section className="flex-shrink-0 px-margin border-b border-outline-variant/5 bg-gradient-to-b from-surface-base to-surface-dim pt-24 pb-20 py-stack-lg flex items-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-10">
          <h1 className="font-display-lg text-display-lg md:text-[56px] text-on-surface tracking-tight leading-tight">
            Ask <span className="text-primary italic font-bold">CogniCore</span>
          </h1>
          
          <div className="w-full relative max-w-4xl mx-auto">
            <div className="glass-panel command-bar-glow rounded-xl p-3 flex items-center shadow-2xl border-copper-accent/20 group focus-within:border-copper-accent/50 transition-all duration-300">
              <div className="px-6 text-primary scale-125">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 500" }}>bolt</span>
              </div>
              <input 
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-headline-md font-body-lg text-on-surface placeholder-slate-muted py-6 transition-opacity duration-300" 
                id="ai-input" 
                placeholder={placeholders[placeholderIndex]} 
                type="text" 
                style={{ opacity }}
              />
              <div className="flex items-center gap-4 px-4">
                <div className="hidden md:flex items-center gap-1.5 font-tech-code text-[11px] text-slate-muted bg-surface-container-high px-2.5 py-1.5 rounded border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[14px]">keyboard_command_key</span>
                  <span>K</span>
                </div>
                <button className="bg-primary text-on-primary px-8 py-4 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-all active:scale-95 shadow-lg shadow-primary/10">
                  Analyze
                </button>
              </div>
            </div>
            
            {/* Interactive Tags/Chips */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <button className="bg-surface-container-high/40 border border-outline-variant/10 px-5 py-2.5 rounded-full font-label-md text-[12px] text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-surface-container-high transition-all">
                Find highest revenue customers
              </button>
              <button className="bg-surface-container-high/40 border border-outline-variant/10 px-5 py-2.5 rounded-full font-label-md text-[12px] text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-surface-container-high transition-all">
                Identify Q4 churn risks
              </button>
              <button className="bg-surface-container-high/40 border border-outline-variant/10 px-5 py-2.5 rounded-full font-label-md text-[12px] text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-surface-container-high transition-all">
                Compare EMEA vs AMER regions
              </button>
              <button className="bg-surface-container-high/40 border border-outline-variant/10 px-5 py-2.5 rounded-full font-label-md text-[12px] text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-surface-container-high transition-all">
                Schema performance audit
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Bottom Half: System & Actions (Empty for now) */}
      <section className="flex-1 bg-surface-container-lowest/30 p-margin overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {/* Content goes here */}
        </div>
      </section>
    </>
  );
}
