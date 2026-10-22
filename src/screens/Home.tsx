import { useEffect, useRef, useState } from 'react';
import { useCurriculum, useName, type Navigate } from '../App';
import { Stars } from '../components/ui';
import type { World } from '../content/types';
import { computeStats, dragonStage, isLevelPassed, isLevelReady, isUnitDone, isUnitUnlocked, nextAdventureStep, nextUnit, type AdventureStep } from '../lib/progress';
import { useProgress } from '../lib/store';

export function Home({ go, startAdventure }: { go: Navigate; startAdventure: (step: AdventureStep) => void }) {
  const c = useCurriculum();
  const p = useProgress();
  const name = useName();
  const stats = computeStats(p, c);
  const known = stats.learned + stats.placedOut;
  const stage = dragonStage(stats.learned);
  const step = nextAdventureStep(p, c);
  const current = nextUnit(p, c);
  const [worldId, setWorldId] = useState(current?.worldId ?? c.worlds[0]?.id);
  const world = c.worldById.get(worldId) ?? c.worlds[0];

  return (
    <div className="screen home">
      <header className="home-head">
        <div className="dragon" title={stage.name}>
          {stage.emoji}
        </div>
        <div className="home-hello">
          <h1>Hi, {name}!</h1>
          <div className="muted">
            Ziggy is a <strong>{stage.name}</strong>
            {stage.next ? ` · ${stage.next - stats.learned} more words to grow` : ''}
          </div>
        </div>
        <div className="stat-pills">
          <span className="pill" title="Days in a row">🔥 {p.streak.count}</span>
          <span className="pill" title="Stars">⭐ {p.stars}</span>
          <span className="pill" title="Words known">📚 {known.toLocaleString()}</span>
        </div>
      </header>

      <AdventureCard step={step} onStart={() => startAdventure(step)} go={go} />

      <nav className="home-nav">
        <button className="nav-btn" onClick={() => go({ name: 'collection' })}>
          <span>📚</span>My Words
        </button>
        <button className="nav-btn" onClick={() => go({ name: 'challenges' })}>
          <span>🏆</span>Challenges
        </button>
        <button className="nav-btn" onClick={() => go({ name: 'review' })} disabled={!stats.due}>
          <span>🧠</span>Review{stats.due ? ` (${stats.due})` : ''}
        </button>
        <button className="nav-btn" onClick={() => go({ name: 'parent' })}>
          <span>👪</span>Grown-ups
        </button>
      </nav>

      <div className="world-tabs" role="tablist">
        {c.worlds.map((w) => {
          const open = p.settings.unlockAll || isUnitUnlocked(p, c, w.units[0]);
          return (
            <button key={w.id} role="tab" aria-selected={w.id === world?.id} className={`world-tab ${w.id === world?.id ? 'on' : ''} ${open ? '' : 'locked'}`} onClick={() => setWorldId(w.id)}>
              <span className="world-tab-emoji">{open ? w.emoji : '🔒'}</span>
              <span className="world-tab-name">{w.title}</span>
            </button>
          );
        })}
      </div>
      {world && <WorldMap world={world} go={go} currentId={current?.id} />}
    </div>
  );
}

function AdventureCard({ step, onStart, go }: { step: AdventureStep; onStart: () => void; go: Navigate }) {
  const c = useCurriculum();
  let icon = '📖';
  let title = '';
  let detail = '';
  let button = 'Start ▶';
  switch (step.kind) {
    case 'review':
      icon = '🧠';
      title = `Warm-up: review ${step.count} word${step.count === 1 ? '' : 's'}`;
      detail = 'Remembering old words keeps them in your brain forever.';
      break;
    case 'challenge': {
      const w = c.worldById.get(step.level.worldId)!;
      icon = '🏆';
      title = `${w.title} ${step.level.title} Challenge`;
      detail = 'Show what you know to open the next level!';
      button = 'Take the challenge ▶';
      break;
    }
    case 'unit': {
      const w = c.worldById.get(step.unit.worldId)!;
      icon = w.emoji;
      title = `New words: ${step.unit.title}`;
      detail = `${w.title} · Unit ${step.unit.index + 1} · ${step.unit.words.slice(0, 5).map((x) => x.emoji).join(' ')}`;
      break;
    }
    case 'done':
      icon = step.reason === 'finished' ? '👑' : '🌙';
      title = step.reason === 'finished' ? 'You finished every world!' : 'All done for today!';
      detail = step.reason === 'finished' ? 'Amazing. Keep reviewing so you never forget.' : 'Come back tomorrow for new words. Want more? Try a quick test or replay a story.';
      button = '';
      break;
  }
  return (
    <section className={`adventure ${step.kind}`}>
      <div className="adventure-icon">{icon}</div>
      <div className="adventure-text">
        <div className="adventure-label">Today's adventure</div>
        <div className="adventure-title">{title}</div>
        <div className="adventure-detail">{detail}</div>
      </div>
      {button ? (
        <button className="btn primary big pulse" onClick={onStart}>
          {button}
        </button>
      ) : (
        <button className="btn soft big" onClick={() => go({ name: 'quicktest' })}>
          🎯 Quick test
        </button>
      )}
    </section>
  );
}

function WorldMap({ world, go, currentId }: { world: World; go: Navigate; currentId?: string }) {
  const c = useCurriculum();
  const p = useProgress();
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [world.id]);

  return (
    <div className="world-map">
      <div className="world-blurb">
        <span className="world-big-emoji">{world.emoji}</span>
        <div>
          <h2>{world.title}</h2>
          <div className="muted">
            {world.blurb} · {world.units.length * 10} words
          </div>
        </div>
      </div>
      {world.levels.map((level) => {
        const ready = isLevelReady(p, level);
        const passed = isLevelPassed(p, level);
        const best = p.levels[level.id]?.best ?? 0;
        return (
          <div key={level.id} className="level-row">
            <div className="level-label">{level.title}</div>
            <div className="level-path">
              {level.units.map((u) => {
                const done = isUnitDone(p, u);
                const up = p.units[u.id];
                const unlocked = isUnitUnlocked(p, c, u);
                const isCurrent = u.id === currentId;
                const cls = up?.placedOut && !up.completedAt ? 'skipped' : done ? 'done' : isCurrent ? 'current' : unlocked ? 'open' : 'locked';
                return (
                  <button
                    key={u.id}
                    ref={isCurrent ? currentRef : undefined}
                    className={`unit-node ${cls}`}
                    disabled={!unlocked}
                    onClick={() => go({ name: 'unit', unitId: u.id })}
                    title={u.title}
                  >
                    <span className="unit-num">{unlocked ? u.index + 1 : '🔒'}</span>
                    <span className="unit-title">{u.title}</span>
                    {up?.stars ? <Stars n={up.stars} /> : cls === 'skipped' ? <span className="unit-skip">known ✓</span> : null}
                  </button>
                );
              })}
              <button
                className={`trophy-node ${passed ? 'passed' : ready ? 'ready' : 'locked'}`}
                disabled={!ready && !passed}
                onClick={() => go({ name: 'level', levelId: level.id })}
                title={`${level.title} challenge`}
              >
                <span>{passed ? (best >= 95 ? '🥇' : best >= 80 ? '🥈' : best >= 70 ? '🥉' : '✅') : ready ? '🏆' : '🔒'}</span>
                <span className="unit-title">Challenge</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
