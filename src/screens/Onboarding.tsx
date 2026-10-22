import { useState } from 'react';
import { Scene } from '../components/Scene';
import { speak } from '../lib/speech';
import { requestPersistence, update } from '../lib/store';

export function Onboarding({ onDone }: { onDone: (placement: boolean) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  function finish(placement: boolean) {
    update((p) => {
      p.settings.childName = name.trim();
      p.onboarded = true;
      if (!placement) p.placementDone = true;
    });
    void requestPersistence();
    onDone(placement);
  }

  return (
    <div className="screen onboarding">
      <Scene theme="meadow" className="onboard-scene">
        <div className="onboard-egg">{step === 0 ? '🥚' : '🐣'}</div>
      </Scene>
      <div className="done-card">
        {step === 0 && (
          <>
            <h1>Welcome to Word Quest!</h1>
            <p>This is Ziggy's egg. Ziggy is a baby dragon who loves words. Every word you learn helps Ziggy hatch and grow!</p>
            <button
              className="btn primary big"
              onClick={() => {
                void speak("Welcome to Word Quest! Every word you learn helps Ziggy the dragon grow.");
                setStep(1);
              }}
            >
              Let's go! →
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <h2>What's your name?</h2>
            <p className="muted">You'll be the hero of every story.</p>
            <input className="name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus autoCapitalize="words" />
            <button className="btn primary big" disabled={!name.trim()} onClick={() => setStep(2)}>
              That's me →
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Hi, {name.trim()}! 👋</h2>
            <p>Want to do a quick word check first? It finds the right starting place so you don't spend time on words you already know.</p>
            <div className="done-actions column">
              <button className="btn primary big" onClick={() => finish(true)}>
                🧭 Do the word check (recommended)
              </button>
              <button className="btn soft big" onClick={() => finish(false)}>
                🌱 Start from the very beginning
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
