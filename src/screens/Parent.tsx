import { useEffect, useMemo, useState } from 'react';
import { useCurriculum, type Navigate } from '../App';
import { ProgressBar, TopBar } from '../components/ui';
import { computeStats, isUnitDone, pace, troubleWords } from '../lib/progress';
import { englishVoices, speak } from '../lib/speech';
import { exportProgress, parseBackup, replaceProgress, requestPersistence, resetProgress, update, useProgress } from '../lib/store';
import { todayKey } from '../lib/text';

function Gate({ onPass, onBack }: { onPass: () => void; onBack: () => void }) {
  const [[a, b]] = useState(() => [6 + Math.floor(Math.random() * 4), 6 + Math.floor(Math.random() * 4)]);
  const [value, setValue] = useState('');
  const wrong = value.length >= String(a * b).length && Number(value) !== a * b;
  return (
    <div className="screen center-screen">
      <TopBar title="Grown-ups only" onBack={onBack} />
      <div className="done-card">
        <div className="done-emoji">👪</div>
        <h2>
          What is {a} × {b}?
        </h2>
        <input
          className="gate-input"
          inputMode="numeric"
          value={value}
          autoFocus
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            setValue(v);
            if (Number(v) === a * b) onPass();
          }}
        />
        {wrong && <p className="muted">Not quite — ask a grown-up!</p>}
      </div>
    </div>
  );
}

export function Parent({ go, onBack }: { go: Navigate; onBack: () => void }) {
  const [ok, setOk] = useState(false);
  if (!ok) return <Gate onPass={() => setOk(true)} onBack={onBack} />;
  return <Dashboard go={go} onBack={onBack} />;
}

function Dashboard({ go, onBack }: { go: Navigate; onBack: () => void }) {
  const c = useCurriculum();
  const p = useProgress();
  const s = p.settings;
  const stats = computeStats(p, c);
  const known = stats.learned + stats.placedOut;
  const { perWeek, etaDays } = pace(p, c.words.length, known);
  const trouble = troubleWords(p, c);
  const [voices, setVoices] = useState(englishVoices());
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone);

  useEffect(() => {
    const t = window.setTimeout(() => setVoices(englishVoices()), 500);
    requestPersistence().then(setPersisted);
    return () => window.clearTimeout(t);
  }, []);

  const week = useMemo(() => {
    let answered = 0;
    let correct = 0;
    let minutesDays = 0;
    for (let i = 0; i < 7; i++) {
      const d = p.days[todayKey(Date.now() - i * 86400000)];
      if (!d) continue;
      answered += d.answered;
      correct += d.correct;
      if (d.answered) minutesDays++;
    }
    return { answered, accuracy: answered ? Math.round((correct / answered) * 100) : null, activeDays: minutesDays };
  }, [p.days]);

  const set = (patch: Partial<typeof s>) => update((d) => Object.assign(d.settings, patch));

  function download() {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `word-quest-backup-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function importFile(file: File) {
    try {
      const next = parseBackup(await file.text());
      if (confirm('Replace all current progress with this backup?')) {
        replaceProgress(next);
        setMessage('Backup restored ✓');
      }
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  return (
    <div className="screen parent">
      <TopBar title="👪 Grown-ups" onBack={onBack} />

      <section className="panel">
        <h2>Progress</h2>
        <div className="stat-grid">
          <Stat label="Words studied" value={stats.learned} />
          <Stat label="Mastered" value={stats.mastered} hint="recalled after 8+ days" />
          <Stat label="Skipped by word check" value={stats.placedOut} hint="estimated already known" />
          <Stat label="Reviews due now" value={stats.due} />
          <Stat label="Day streak" value={p.streak.count} />
          <Stat label="Accuracy (7 days)" value={week.accuracy === null ? '—' : `${week.accuracy}%`} hint={`${week.answered} answers`} />
        </div>
        <p>
          <strong>Pace:</strong> {perWeek} new words/week over the last 2 weeks
          {etaDays !== null ? `. At this pace she reaches all ${c.words.length.toLocaleString()} words in about ${Math.round(etaDays / 30)} months.` : '. Not enough activity yet to project.'}
        </p>
        <p className="muted">
          “Mastered” is the number that matters. Studied words that are never reviewed fade within weeks — keep reviews at zero most days.
        </p>
      </section>

      <section className="panel">
        <h2>Worlds</h2>
        {c.worlds.map((w) => {
          const done = w.units.filter((u) => isUnitDone(p, u)).length;
          return (
            <div key={w.id} className="world-progress">
              <span>
                {w.emoji} {w.title}
              </span>
              <ProgressBar value={done} max={w.units.length} />
              <span className="muted">
                {done}/{w.units.length} units
              </span>
            </div>
          );
        })}
      </section>

      {trouble.length > 0 && (
        <section className="panel">
          <h2>Tricky words</h2>
          <p className="muted">Missed most often. Try using these in conversation this week — real-life use is the best teacher.</p>
          <div className="word-chips">
            {trouble.map((t) => (
              <button key={t.word.id} className="chip big" onClick={() => speak(`${t.word.word}. ${t.word.definition}`)}>
                {t.word.emoji} {t.word.word} <span className="muted">×{t.lapses}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Settings</h2>
        <label className="field">
          <span>Child's name (she's the hero of every story)</span>
          <input value={s.childName} onChange={(e) => set({ childName: e.target.value })} />
        </label>
        <div className="field">
          <span>New units per day (10 words each)</span>
          <div className="segmented">
            {[1, 2, 3].map((n) => (
              <button key={n} className={s.newUnitsPerDay === n ? 'on' : ''} onClick={() => set({ newUnitsPerDay: n })}>
                {n} ({n * 10} words)
              </button>
            ))}
          </div>
          <span className="muted">1 unit/day is plenty for most 7-year-olds. More new words means more reviews later.</span>
        </div>
        <label className="field">
          <span>Voice</span>
          <select value={s.voiceURI ?? ''} onChange={(e) => set({ voiceURI: e.target.value || null })}>
            <option value="">Automatic</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Speaking speed: {s.rate.toFixed(2)}×</span>
          <input type="range" min={0.6} max={1.2} step={0.05} value={s.rate} onChange={(e) => set({ rate: Number(e.target.value) })} />
        </label>
        <button className="btn soft" onClick={() => speak('Enormous. If something is enormous, it is very, very big.')}>
          🔊 Test voice
        </button>
        <Toggle label="Read words and story pages aloud automatically" on={s.autoRead} onChange={(v) => set({ autoRead: v })} />
        <Toggle label="Sound effects" on={s.sound} onChange={(v) => set({ sound: v })} />
        <Toggle label="Unlock everything (skip level challenges)" on={s.unlockAll} onChange={(v) => set({ unlockAll: v })} />
      </section>

      <section className="panel">
        <h2>Word check (placement)</h2>
        <p className="muted">
          {p.placementResult ? `Last placed in ${c.worlds[p.placementResult.worldIndex]?.title} on ${new Date(p.placementResult.at).toLocaleDateString()}. ` : 'Not taken yet. '}
          Retaking it only changes which worlds are marked as already known; studied words are kept.
        </p>
        <button className="btn soft" onClick={() => go({ name: 'placement' })}>
          🧭 Retake word check
        </button>
      </section>

      <section className="panel">
        <h2>Save her progress</h2>
        {!standalone && (
          <p className="warn">
            ⚠️ Install this app: tap Safari's Share button → <strong>Add to Home Screen</strong>. Safari can erase website data after about a week of not
            visiting; home-screen apps are kept and open full-screen.
          </p>
        )}
        <p className="muted">
          Storage protection: {persisted === null ? 'checking…' : persisted ? 'on ✓' : 'not granted by the browser (installing to the Home Screen helps)'}. Progress lives only on
          this iPad — download a backup now and then.
        </p>
        <div className="row">
          <button className="btn primary" onClick={download}>
            ⬇️ Download backup
          </button>
          <label className="btn soft file-btn">
            ⬆️ Restore backup
            <input type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          </label>
        </div>
        {message && <p>{message}</p>}
      </section>

      <section className="panel">
        <h2>How to get the most out of this</h2>
        <ul className="tips">
          <li>Short and daily beats long and rare: 15–20 minutes, ideally at the same time each day.</li>
          <li>Do reviews first. They're what turns “studied” into “known”.</li>
          <li>Use the week's words at dinner, in the car, at bedtime. Hearing a word in real life a few times does more than any app.</li>
          <li>Keep reading to her from books above her own reading level. Wide reading is where most vocabulary comes from — this app is a supplement to that, not a replacement.</li>
        </ul>
      </section>

      <section className="panel danger">
        <h2>Reset</h2>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Erase ALL progress on this iPad? Download a backup first if unsure.')) {
              resetProgress();
              go({ name: 'home' });
            }
          }}
        >
          Erase all progress
        </button>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="toggle-track">
        <span className="toggle-knob" />
      </span>
      <span>{label}</span>
    </button>
  );
}
