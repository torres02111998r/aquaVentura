import { useState } from 'react';
import { Home, House, Lock, Star, Waves } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

const LEVELS = [
  { id: 1, name: 'La casa Ortiz', tag: 'Exploración' },
  { id: 2, name: 'El patio', tag: 'Desafío 1' },
  { id: 3, name: 'El día del corte', tag: 'Desafío 2' },
  { id: 4, name: 'La cuadra', tag: 'Misión final' },
];

function Stars({ count }) {
  return (
    <span className="flex gap-0.5" aria-label={`${count} de 3 estrellas`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className={
            i < count
              ? 'size-3 fill-av-yellow text-av-yellow'
              : 'size-3 text-[#5A3B22]/25'
          }
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function LevelHouse({ level, unlocked, stars, onPlay }) {
  return (
    <div className="flex flex-col">
      <div
        className="h-5 w-full bg-[#C97B4A] [clip-path:polygon(50%_0,100%_100%,0_100%)]"
        aria-hidden="true"
      />
      <button
        type="button"
        disabled={!unlocked}
        onClick={onPlay}
        className={`flex flex-1 flex-col items-center gap-1 rounded-b-xl bg-[#F7EAD6] px-2 py-2 text-center shadow-[0_8px_18px_rgba(0,20,60,0.22)] transition-transform duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow ${unlocked
            ? 'cursor-pointer hover:-translate-y-0.5'
            : 'cursor-not-allowed opacity-80'
          }`}
      >
        <span
          className={`grid size-8 place-items-center rounded-full ${unlocked ? 'bg-av-blue/20 text-av-blue-deep' : 'bg-[#5A3B22]/10 text-[#5A3B22]/60'
            }`}
        >
          {unlocked ? (
            <House className="size-4" aria-hidden="true" />
          ) : (
            <Lock className="size-4" aria-hidden="true" />
          )}
        </span>
        <span className="font-display text-[0.6rem] leading-tight text-[#5A3B22] uppercase">
          {level.name}
        </span>
        <span className="font-body text-[0.52rem] tracking-[0.1em] text-[#5A3B22]/60 uppercase">
          {level.tag}
        </span>
        <Stars count={stars} />
      </button>
    </div>
  );
}

export default function MapScreen() {
  const inspectorName = useGameStore((state) => state.inspectorName);
  const nivelesAbiertos = useGameStore((state) => state.nivelesAbiertos);
  const estrellasPorNivel = useGameStore((state) => state.estrellasPorNivel);
  const caudalRio = useGameStore((state) => state.caudalRio);
  const setScreen = useGameStore((state) => state.setScreen);
  const setNivelActual = useGameStore((state) => state.setNivelActual);
  const [notice, setNotice] = useState('');

  const playLevel = (id) => {
    setNivelActual(id);

    if (id === 1) {
      setScreen('BRIEFING');
      return;
    }

    if (id === 2) {
      setScreen('PLAYING');
      return;
    }

    setNotice(`El nivel ${id} todavía está en construcción.`);
  };
  return (
    <main className="flex h-svh flex-col overflow-hidden bg-[linear-gradient(180deg,#7FB2F5_0%,#619BF2_55%,#5B93EE_100%)]">
      <header className="relative flex shrink-0 items-center justify-center bg-av-blue-deep px-3 py-2.5 shadow-[0_8px_24px_rgba(0,25,60,0.28)]">
        <button
          type="button"
          className="absolute left-3 grid size-9 cursor-pointer place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow"
          onClick={() => setScreen('HOME')}
          aria-label="Volver al inicio"
          title="Volver al inicio"
        >
          <Home className="size-5" aria-hidden="true" />
        </button>

        <div className="text-center">
          <h1 className="m-0 font-display text-[clamp(0.95rem,2.8vw,1.5rem)] tracking-[0.05em] text-white uppercase">
            Mapa del barrio
          </h1>
          <p className="m-0 font-body text-[0.6rem] tracking-[0.12em] text-av-cyan uppercase">
            Los Cámbulos · Inspector {inspectorName || 'invitado'}
          </p>
        </div>
      </header>

      {notice && (
        <p className="mx-auto mt-2 mb-0 rounded-full bg-white/90 px-4 py-1 font-body text-[0.7rem] font-semibold text-av-blue-deep shadow">
          {notice}
        </p>
      )}

      <section className="flex min-h-0 flex-1 flex-col justify-between gap-2 px-[clamp(12px,3vw,32px)] py-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {LEVELS.map((level, index) => (
            <LevelHouse
              key={level.id}
              level={level}
              // unlocked={Boolean(nivelesAbiertos[index])}
              unlocked={index < 2 || Boolean(nivelesAbiertos[index])}//provisional
              stars={estrellasPorNivel[index] ?? 0}
              onPlay={() => playLevel(level.id)}
            />
          ))}
        </div>

        <div className="h-1.5 rounded-full bg-white/40" aria-hidden="true" />

        <div className="rounded-xl bg-[linear-gradient(180deg,#2F86D8_0%,#1557B0_100%)] px-3 py-2 text-white shadow-[0_8px_20px_rgba(0,20,60,0.28)]">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-display text-[0.62rem] tracking-[0.06em] uppercase">
              <Waves className="size-4 text-av-cyan" aria-hidden="true" />
              Caudal del río
            </span>
            <span className="font-display text-sm">{caudalRio}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-av-cyan transition-[width] duration-500"
              style={{ width: `${Math.min(Math.max(caudalRio, 0), 100)}%` }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
