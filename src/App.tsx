import { createContext, useContext, useEffect, useState } from 'react';
import { curriculum } from './content/curriculum';
import type { Curriculum } from './content/types';
import { nextAdventureStep, type AdventureStep } from './lib/progress';
import { setSoundEnabled } from './lib/sfx';
import { configureSpeech, stopSpeaking } from './lib/speech';
import { getProgress, useProgress, type Settings } from './lib/store';
import { Challenges } from './screens/Challenges';
import { Collection } from './screens/Collection';
import { Home } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { Parent } from './screens/Parent';
import { LevelChallenge, Placement, QuickTest, ReviewSession } from './screens/Sessions';
import { UnitFlow } from './screens/UnitFlow';

export type Route =
  | { name: 'home' }
  | { name: 'placement' }
  | { name: 'unit'; unitId: string }
  | { name: 'review' }
  | { name: 'quicktest' }
  | { name: 'level'; levelId: string }
  | { name: 'challenges' }
  | { name: 'collection' }
  | { name: 'parent' };

export type Navigate = (r: Route) => void;

const CurriculumContext = createContext<Curriculum>(curriculum);
export const useCurriculum = () => useContext(CurriculumContext);
export const useSettings = (): Settings => useProgress().settings;
export const useName = (): string => useProgress().settings.childName || 'Maya';

function parseHash(): Route {
  const [name, arg] = window.location.hash.replace(/^#\/?/, '').split('/');
  switch (name) {
    case 'unit':
      return curriculum.unitById.has(arg) ? { name, unitId: arg } : { name: 'home' };
    case 'level':
      return curriculum.levelById.has(arg) ? { name, levelId: arg } : { name: 'home' };
    case 'placement':
    case 'review':
    case 'quicktest':
    case 'challenges':
    case 'collection':
    case 'parent':
      return { name };
    default:
      return { name: 'home' };
  }
}

function toHash(r: Route): string {
  if (r.name === 'unit') return `#/unit/${r.unitId}`;
  if (r.name === 'level') return `#/level/${r.levelId}`;
  return r.name === 'home' ? '#/' : `#/${r.name}`;
}

function routeForStep(step: AdventureStep): Route {
  switch (step.kind) {
    case 'review':
      return { name: 'review' };
    case 'challenge':
      return { name: 'level', levelId: step.level.id };
    case 'unit':
      return { name: 'unit', unitId: step.unit.id };
    default:
      return { name: 'home' };
  }
}

export default function App() {
  const progress = useProgress();
  const [{ route, visit }, setNav] = useState(() => ({ route: parseHash(), visit: 0 }));
  // `visit` remounts the screen on every navigation, even to the same route (e.g. review → review).
  const setRoute = (r: Route) => setNav((n) => ({ route: r, visit: n.visit + 1 }));

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    configureSpeech({ voiceURI: progress.settings.voiceURI, rate: progress.settings.rate });
    setSoundEnabled(progress.settings.sound);
  }, [progress.settings.voiceURI, progress.settings.rate, progress.settings.sound]);

  useEffect(() => {
    stopSpeaking();
    window.scrollTo(0, 0);
  }, [visit]);

  const go: Navigate = (r) => {
    if (toHash(r) === window.location.hash) setRoute(r);
    else window.location.hash = toHash(r);
  };
  const home = () => go({ name: 'home' });
  // After finishing something, jump straight to the next step of today's adventure.
  const continueAdventure = () => go(routeForStep(nextAdventureStep(getProgress(), curriculum)));

  let screen: React.ReactNode;
  if (!curriculum.units.length) {
    screen = <div className="screen center-screen">No curriculum found.</div>;
  } else if (!progress.onboarded) {
    screen = <Onboarding onDone={(placement) => go(placement ? { name: 'placement' } : { name: 'home' })} />;
  } else {
    switch (route.name) {
      case 'placement':
        screen = <Placement onExit={home} onDone={home} />;
        break;
      case 'unit':
        screen = <UnitFlow key={route.unitId} unit={curriculum.unitById.get(route.unitId)!} onExit={home} onNext={continueAdventure} />;
        break;
      case 'review':
        screen = <ReviewSession onExit={home} onNext={continueAdventure} />;
        break;
      case 'quicktest':
        screen = <QuickTest onExit={home} />;
        break;
      case 'level':
        screen = <LevelChallenge key={route.levelId} level={curriculum.levelById.get(route.levelId)!} onExit={home} onNext={continueAdventure} />;
        break;
      case 'challenges':
        screen = <Challenges go={go} onBack={home} />;
        break;
      case 'collection':
        screen = <Collection onBack={home} />;
        break;
      case 'parent':
        screen = <Parent go={go} onBack={home} />;
        break;
      default:
        screen = <Home go={go} startAdventure={(step) => go(routeForStep(step))} />;
    }
  }

  return (
    <CurriculumContext.Provider value={curriculum}>
      <div key={visit} className="app">
        {screen}
      </div>
    </CurriculumContext.Provider>
  );
}
