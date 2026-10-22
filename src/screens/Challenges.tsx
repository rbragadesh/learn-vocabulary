import { useCurriculum, type Navigate } from '../App';
import { TopBar } from '../components/ui';
import { LEVEL_PASS, isLevelPassed, isLevelReady } from '../lib/progress';
import { LEVEL_TEST_SIZE } from '../lib/quiz';
import { useProgress } from '../lib/store';

export function Challenges({ go, onBack }: { go: Navigate; onBack: () => void }) {
  const c = useCurriculum();
  const p = useProgress();
  const learned = Object.keys(p.cards).length;

  return (
    <div className="screen">
      <TopBar title="🏆 Challenges" onBack={onBack} />
      <section className="panel">
        <h2>🎯 Quick test</h2>
        <p className="muted">10 questions on words you've already learned. Great for a quick brain workout.</p>
        <button className="btn primary big" disabled={!learned} onClick={() => go({ name: 'quicktest' })}>
          Start a quick test
        </button>
      </section>
      <section className="panel">
        <h2>Level challenges</h2>
        <p className="muted">
          Finish all 5 units in a level, then score {LEVEL_PASS}% or more on its {LEVEL_TEST_SIZE}-question challenge to open the next level. 🥉 70% · 🥈 80% · 🥇 95%
        </p>
        {c.worlds.map((w) => {
          const levels = w.levels.filter((l) => isLevelReady(p, l) && !l.units.every((u) => p.units[u.id]?.placedOut));
          if (!levels.length) return null;
          return (
            <div key={w.id} className="challenge-world">
              <h3>
                {w.emoji} {w.title}
              </h3>
              <div className="challenge-grid">
                {levels.map((l) => {
                  const best = p.levels[l.id]?.best ?? 0;
                  const passed = isLevelPassed(p, l);
                  return (
                    <button key={l.id} className={`challenge-tile ${passed ? 'passed' : 'ready'}`} onClick={() => go({ name: 'level', levelId: l.id })}>
                      <span className="challenge-emoji">{best >= 95 ? '🥇' : best >= 80 ? '🥈' : best >= 70 ? '🥉' : '🏆'}</span>
                      <span>{l.title}</span>
                      <span className="muted">{p.levels[l.id] ? `best ${best}%` : 'not tried'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!c.levelById.size || ![...c.levelById.values()].some((l) => isLevelReady(p, l)) ? (
          <p className="muted">Finish your first 5 units to unlock your first challenge.</p>
        ) : null}
      </section>
    </div>
  );
}
