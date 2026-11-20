import { Compass, Droplets, Home, Radar, Volume2, Wrench } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

const STEPS = [
  {
    icon: Compass,
    title: 'Explora',
    text: 'Muévete con A/D o Flechas',
  },
  {
    icon: Radar,
    title: 'Detecta',
    text: 'Usa el detector acústico con cargas limitadas',
  },
  {
    icon: Wrench,
    title: 'Repara',
    text: 'Elige la pieza exacta del kit',
  },
  {
    icon: Droplets,
    title: 'Estima y Ahorra',
    text: 'Calcula la pérdida diaria ±15% para ganar bono y cuida el tanque >20%',
  },
];

export default function InstructionsScreen() {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <main className="flex h-svh flex-col justify-between overflow-hidden bg-av-blue">
      <header className="relative flex shrink-0 items-center justify-center bg-av-blue-deep px-4 py-3 shadow-[0_8px_24px_rgba(0,25,60,0.28)]">
        <button
          type="button"
          className="absolute left-3 grid size-9 cursor-pointer place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow"
          onClick={() => setScreen('HOME')}
          aria-label="Volver al inicio"
          title="Volver al inicio"
        >
          <Home className="size-5" aria-hidden="true" />
        </button>

        <h1 className="m-0 px-10 text-center font-display text-[clamp(1.05rem,3.2vw,1.9rem)] leading-tight tracking-[0.04em] text-white uppercase [text-shadow:0_2px_0_rgba(0,0,0,0.18)]">
          PREPARACIÓN DE MISIÓN
        </h1>
      </header>

      <section className="flex min-h-0 flex-1 items-center overflow-hidden px-[clamp(16px,4vw,40px)] py-[clamp(12px,2vh,24px)]">
        <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start gap-3 rounded-xl bg-av-blue-deep/10 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-av-blue-deep text-av-yellow">
              <Volume2 className="size-4" aria-hidden="true" />
            </span>
            <p className="m-0 font-body text-[clamp(0.8rem,1.8vw,0.95rem)] leading-relaxed text-av-blue-deep">
              <span className="font-bold">Tato, tu mentor por radio:</span>{' '}
              ¡Hola Inspector! Tu misión es detener el desperdicio en el barrio
              antes de que se vacíe el tanque.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex flex-col items-center rounded-xl bg-av-blue/10 p-3 text-center"
              >
                <span className="grid size-10 place-items-center rounded-full bg-av-blue text-white">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-2 mb-1 font-display text-[0.72rem] tracking-[0.04em] text-av-blue-deep uppercase">
                  {title}
                </p>
                <p className="m-0 font-body text-[0.68rem] leading-snug text-av-blue-deep/75">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="flex shrink-0 items-center justify-between gap-3 px-[clamp(16px,4vw,40px)] pb-[clamp(12px,2.4vh,24px)]">
        <button
          type="button"
          className="cursor-pointer rounded-full bg-transparent px-[clamp(16px,3vw,24px)] py-[clamp(10px,1.6vh,14px)] font-body text-[clamp(0.78rem,1.9vw,0.92rem)] font-semibold text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.55)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-[1.07] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-av-yellow active:translate-y-px motion-reduce:transition-none"
          onClick={() => setScreen('INTRO')}
        >
          ← Volver
        </button>

        <button
          type="button"
          className="cursor-pointer rounded-full bg-av-yellow px-[clamp(20px,4vw,32px)] py-[clamp(10px,1.6vh,14px)] font-body text-[clamp(0.78rem,1.9vw,0.92rem)] font-bold tracking-[0.04em] text-av-blue-deep shadow-[0_8px_20px_rgba(0,20,60,0.3)] transition-[transform,box-shadow,filter] duration-150 hover:-translate-y-0.5 hover:brightness-[1.05] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-px motion-reduce:transition-none"
          onClick={() => setScreen('CAST')}
        >
          CONTINUAR →
        </button>
      </footer>
    </main>
  );
}
