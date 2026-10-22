import type { ReactNode } from 'react';

type Kind = 'outdoor' | 'water' | 'indoor' | 'dark' | 'air';

interface Theme {
  kind: Kind;
  sky: [string, string];
  ground: string;
  ground2?: string;
  decor: string[];
  sun?: boolean;
  moon?: boolean;
}

const T: Record<string, Theme> = {
  home: { kind: 'indoor', sky: ['#FFE8CC', '#FFD9A8'], ground: '#C98B5B', decor: ['🛋️', '🪴', '🖼️'] },
  meadow: { kind: 'outdoor', sky: ['#8FD3FF', '#DFF4FF'], ground: '#7BD389', ground2: '#A8E6A3', decor: ['🌼', '🌷', '🦋'], sun: true },
  forest: { kind: 'outdoor', sky: ['#A7E3C9', '#E8FFF2'], ground: '#3F9E5B', ground2: '#6CC48A', decor: ['🌲', '🌳', '🍄'] },
  ocean: { kind: 'water', sky: ['#7CC6FF', '#CDEBFF'], ground: '#2D8BDB', ground2: '#5AAAF0', decor: ['⛵', '🐬', '🌊'], sun: true },
  beach: { kind: 'water', sky: ['#8FD3FF', '#FFF1C1'], ground: '#F6D58E', ground2: '#4FB3F0', decor: ['🌴', '🐚', '🦀'], sun: true },
  space: { kind: 'dark', sky: ['#0B1340', '#28286E'], ground: '#3A2F7A', decor: ['🪐', '⭐', '🚀'] },
  castle: { kind: 'outdoor', sky: ['#C9B8FF', '#F3EDFF'], ground: '#7FB77E', ground2: '#A3D19C', decor: ['🏰', '🚩', '🌳'] },
  city: { kind: 'outdoor', sky: ['#9AD0F5', '#E9F6FF'], ground: '#9AA5B1', ground2: '#B8C2CC', decor: ['🏙️', '🚕', '🚦'], sun: true },
  snow: { kind: 'outdoor', sky: ['#CFE8FF', '#F5FBFF'], ground: '#FFFFFF', ground2: '#E3F0FF', decor: ['⛄', '❄️', '🌲'] },
  desert: { kind: 'outdoor', sky: ['#FFD39B', '#FFF0D6'], ground: '#F2C078', ground2: '#F7D59C', decor: ['🌵', '🐪', '🏜️'], sun: true },
  jungle: { kind: 'outdoor', sky: ['#9FE0B8', '#E6FFF0'], ground: '#2E8B57', ground2: '#4FB077', decor: ['🌴', '🦜', '🐒'] },
  school: { kind: 'indoor', sky: ['#E6F0FF', '#D3E3FF'], ground: '#B98B63', decor: ['📚', '✏️', '🍎'] },
  night: { kind: 'dark', sky: ['#1B1F5E', '#4B3C8F'], ground: '#263A5E', decor: ['🦉', '🌲', '✨'], moon: true },
  mountain: { kind: 'outdoor', sky: ['#A8D8FF', '#EAF6FF'], ground: '#8A9BAE', ground2: '#B5C3D1', decor: ['🏔️', '🦅', '🌲'] },
  farm: { kind: 'outdoor', sky: ['#9BD7FF', '#E5F6FF'], ground: '#8BCB6B', ground2: '#B3DE8F', decor: ['🚜', '🐄', '🌾'], sun: true },
  cave: { kind: 'dark', sky: ['#3B3049', '#5E4B73'], ground: '#4A3B57', decor: ['💎', '🦇', '🕯️'] },
  sky: { kind: 'air', sky: ['#7EC8FF', '#E6F5FF'], ground: '#FFFFFF', decor: ['☁️', '🎈', '🌈'], sun: true },
  garden: { kind: 'outdoor', sky: ['#A9E2FF', '#F0FBFF'], ground: '#6CC070', ground2: '#97D98F', decor: ['🌻', '🌹', '🐝'], sun: true },
  library: { kind: 'indoor', sky: ['#F3E2C7', '#EBD3AE'], ground: '#8B5E3C', decor: ['📚', '📖', '🕯️'] },
  kitchen: { kind: 'indoor', sky: ['#FFF3E0', '#FFE6C2'], ground: '#D9A066', decor: ['🍳', '🥕', '🧁'] },
  market: { kind: 'outdoor', sky: ['#FFD6A5', '#FFF4E0'], ground: '#E8B87A', ground2: '#F2CC96', decor: ['🍎', '🧺', '🎪'], sun: true },
  river: { kind: 'water', sky: ['#A0DBFF', '#E8F7FF'], ground: '#7CC97F', ground2: '#4AA8E8', decor: ['🐟', '🌿', '🛶'] },
  island: { kind: 'water', sky: ['#6FC3FF', '#D8F2FF'], ground: '#2A9DF4', ground2: '#56B7FA', decor: ['🏝️', '🦀', '🐠'], sun: true },
  lab: { kind: 'indoor', sky: ['#E3FAF7', '#C8F1EC'], ground: '#7FA8A3', decor: ['🧪', '🔬', '⚗️'] },
  museum: { kind: 'indoor', sky: ['#EFE9F7', '#DED3EF'], ground: '#9C8AB4', decor: ['🦖', '🖼️', '🏺'] },
  park: { kind: 'outdoor', sky: ['#9DD9FF', '#EAF8FF'], ground: '#79C56E', ground2: '#A2D997', decor: ['🌳', '🛝', '🐿️'], sun: true },
  rain: { kind: 'outdoor', sky: ['#8EA4BF', '#C9D6E3'], ground: '#6FA86A', ground2: '#8FBF88', decor: ['☔', '🌧️', '🐸'] },
  volcano: { kind: 'outdoor', sky: ['#FFB38A', '#FFE3CC'], ground: '#8B5E3C', ground2: '#A97A52', decor: ['🌋', '🔥', '🦖'] },
  underwater: { kind: 'water', sky: ['#6FD0FF', '#0F5FA8'], ground: '#E9C98B', ground2: '#2C7FC9', decor: ['🐠', '🐙', '🪸'] },
  camp: { kind: 'dark', sky: ['#FF9E7A', '#5B4B8A'], ground: '#3E6B48', decor: ['⛺', '🔥', '🌲'], moon: true },
};

const STARS = Array.from({ length: 40 }, (_, i) => ({ x: (i * 137) % 1000, y: (i * 89) % 380, r: 1 + (i % 3) }));

export function Scene({ theme, children, className = '' }: { theme: string; children?: ReactNode; className?: string }) {
  const t = T[theme] ?? T.meadow;
  const id = `sky-${theme}`;
  return (
    <div className={`scene ${className}`}>
      <svg className="scene-bg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.sky[0]} />
            <stop offset="1" stopColor={t.sky[1]} />
          </linearGradient>
        </defs>
        <rect width="1000" height="600" fill={`url(#${id})`} />
        {t.kind === 'dark' && STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.7} />)}
        {t.sun && <circle cx="840" cy="110" r="60" fill="#FFD84D" opacity={0.95} />}
        {t.moon && <circle cx="840" cy="100" r="46" fill="#FFF6C9" />}
        {t.kind === 'indoor' && (
          <>
            <rect x="120" y="90" width="220" height="170" rx="14" fill="#BFE6FF" stroke="#fff" strokeWidth="12" />
            <rect x="660" y="80" width="200" height="140" rx="10" fill="#fff" opacity={0.45} />
            <rect y="470" width="1000" height="130" fill={t.ground} />
            <rect y="462" width="1000" height="12" fill="#000" opacity={0.08} />
          </>
        )}
        {t.kind === 'outdoor' && (
          <>
            <path d="M0 420 Q 200 330 420 400 T 1000 380 V600 H0Z" fill={t.ground2 ?? t.ground} />
            <path d="M0 480 Q 260 420 520 470 T 1000 460 V600 H0Z" fill={t.ground} />
          </>
        )}
        {t.kind === 'water' && (
          <>
            <path d="M0 400 Q 125 380 250 400 T 500 400 T 750 400 T 1000 400 V600 H0Z" fill={t.ground2 ?? t.ground} />
            <path d="M0 470 Q 125 450 250 470 T 500 470 T 750 470 T 1000 470 V600 H0Z" fill={t.ground} />
          </>
        )}
        {t.kind === 'dark' && <path d="M0 470 Q 250 430 500 470 T 1000 460 V600 H0Z" fill={t.ground} />}
        {t.kind === 'air' && (
          <>
            <ellipse cx="200" cy="470" rx="220" ry="60" fill="#fff" />
            <ellipse cx="620" cy="520" rx="300" ry="70" fill="#fff" />
            <ellipse cx="420" cy="180" rx="120" ry="34" fill="#fff" opacity={0.8} />
          </>
        )}
      </svg>
      <div className="scene-decor" aria-hidden>
        {t.decor.map((d, i) => (
          <span key={i} className={`decor decor-${i}`}>
            {d}
          </span>
        ))}
      </div>
      <div className="scene-content">{children}</div>
    </div>
  );
}
