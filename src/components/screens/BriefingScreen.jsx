import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import SpeechBubble from './SpeechBubble';

const MIN_LITROS = 0;
const MAX_LITROS = 200;

export default function BriefingScreen() {
  const estimacionJugador = useGameStore((state) => state.estimacionJugador);
  const setEstimacionJugador = useGameStore((state) => state.setEstimacionJugador);
  const startLevel = useGameStore((state) => state.startLevel);
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <main className="flex h-svh flex-col overflow-hidden bg-av-blue">
      <header className="shrink-0 bg-av-blue-deep px-4 py-2.5 text-center shadow-[0_8px_24px_rgba(0,25,60,0.28)]">
        <h1 className="m-0 font-display text-[clamp(1rem,3vw,1.6rem)] tracking-[0.05em] text-white uppercase">
          Estimación previa
        </h1>
        <p className="m-0 font-body text-[0.6rem] tracking-[0.12em] text-av-cyan uppercase">
          Nivel 1 · La casa Ortiz
        </p>
      </header>

      <section className="flex min-h-0 flex-1 items-center overflow-y-auto px-[clamp(12px,3vw,32px)] py-3">
        <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl sm:p-5">
          <div className="flex items-end gap-3">
            <div className="relative flex h-28 w-24 shrink-0 items-end justify-center rounded-t-2xl bg-[#F7EAD6] shadow-[inset_0_0_0_2px_rgba(90,59,34,0.12)]">
              <div
                className="absolute inset-x-0 top-0 h-3 rounded-t-2xl bg-[#C97B4A]"
                aria-hidden="true"
              />
              <span className="absolute top-5 left-2 h-10 w-1.5 rounded-full bg-[#5A3B22]/25" aria-hidden="true" />
              <span className="relative mb-3 grid size-12 place-items-center rounded-full bg-av-blue-button-alt font-display text-lg text-white shadow-[0_6px_14px_rgba(0,20,60,0.3)]">
                L
              </span>
              <span className="absolute bottom-1 font-body text-[0.5rem] tracking-[0.14em] text-[#5A3B22]/70 uppercase">
                Luz
              </span>
            </div>

            <SpeechBubble className="mb-4 flex-1" tailSide="left">
              <p className="m-0 font-body text-[0.6rem] font-bold tracking-[0.16em] text-[#0E76A8] uppercase">
                Luz
              </p>
              <p className="mt-1 mb-0 font-body text-sm leading-snug">
                ¡Aquí no se desperdicia nada!
              </p>
            </SpeechBubble>
          </div>

          <div className="mt-4">
            <p className="m-0 font-body text-[0.62rem] font-bold tracking-[0.16em] text-av-blue-deep/70 uppercase">
              ¿Cuánta agua crees que pierde esta casa al día?
            </p>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-2xl text-av-blue-deep">{estimacionJugador}</span>
              <span className="font-body text-xs font-semibold tracking-[0.1em] text-av-blue-deep/60 uppercase">
                L / día
              </span>
            </div>

            <input
              id="estimacion"
              type="range"
              min={MIN_LITROS}
              max={MAX_LITROS}
              step={5}
              value={estimacionJugador}
              onChange={(event) => setEstimacionJugador(event.target.value)}
              className="mt-2 w-full cursor-pointer accent-av-yellow focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-av-yellow"
              aria-label="Estimación de litros perdidos por día"
            />

            <div className="flex justify-between font-body text-[0.55rem] font-semibold tracking-[0.1em] text-av-blue-deep/50 uppercase">
              <span>{MIN_LITROS} L</span>
              <span>{MAX_LITROS} L</span>
            </div>

            <p className="mt-2 mb-0 font-body text-[0.68rem] leading-snug text-av-blue-deep/60">
              Un error menor al 15% te da puntos de bonificación.
            </p>
          </div>
        </div>
      </section>

      <footer className="flex shrink-0 items-center justify-between gap-3 px-[clamp(12px,3vw,32px)] pb-[clamp(10px,2vh,20px)]">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-[clamp(14px,2.6vw,22px)] py-[clamp(9px,1.4vh,12px)] font-body text-[clamp(0.72rem,1.8vw,0.88rem)] font-semibold text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.55)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-av-yellow active:translate-y-px motion-reduce:transition-none"
          onClick={() => setScreen('MAP')}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Mapa
        </button>

        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-av-yellow px-[clamp(18px,3.5vw,28px)] py-[clamp(10px,1.6vh,14px)] font-body text-[clamp(0.75rem,1.8vw,0.9rem)] font-bold tracking-[0.04em] text-[#1557B0] shadow-[0_8px_20px_rgba(0,20,60,0.3)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-px motion-reduce:transition-none"
          onClick={() => {
            startLevel();
            setScreen('PLAYING');
          }}
        >
          EMPEZAR INSPECCIÓN
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
