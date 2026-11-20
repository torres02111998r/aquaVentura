import HomeScreen from './components/screens/HomeScreen';
import IntroScreen from './components/screens/IntroScreen';
import { useGameStore } from './store/useGameStore';

/**
 * Temporary view used to verify navigation. It will be replaced by the real
 * instructions screen (GDD section 7.1).
 */
function InstructionsPlaceholder() {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-[clamp(14px,2.6vh,24px)] bg-av-blue px-[clamp(16px,4vw,40px)] py-[clamp(24px,6vh,56px)] text-center">
      <h1 className="m-0 font-display text-[clamp(1.8rem,5.4vw,3.25rem)] font-normal tracking-[0.04em] text-white uppercase [text-shadow:0_3px_0_rgba(0,30,80,0.22),0_10px_24px_rgba(0,20,60,0.28)]">
        INSTRUCCIONES
      </h1>
      <p className="m-0 max-w-[34ch] text-[clamp(0.9rem,2.2vw,1.05rem)] leading-relaxed text-white/90">
        Pantalla en construcción: moverte, detector, kit y medidores.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="cursor-pointer rounded-full bg-av-blue-button px-6 py-3 font-body text-[clamp(0.8rem,2vw,0.95rem)] font-semibold text-av-yellow shadow-[0_6px_18px_rgba(0,20,60,0.28)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-[1.07] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-av-yellow active:translate-y-px motion-reduce:transition-none"
          onClick={() => setScreen('INTRO')}
        >
          ← Volver a la introducción
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-full bg-transparent px-6 py-3 font-body text-[clamp(0.8rem,2vw,0.95rem)] font-semibold text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.55)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-[1.07] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-av-yellow active:translate-y-px motion-reduce:transition-none"
          onClick={() => setScreen('HOME')}
        >
          Ir al inicio
        </button>
      </div>
    </main>
  );
}

export default function App() {
  const currentScreen = useGameStore((state) => state.currentScreen);

  switch (currentScreen) {
    case 'HOME':
      return <HomeScreen />;
    case 'INTRO':
      return <IntroScreen />;
    case 'INSTRUCTIONS':
      return <InstructionsPlaceholder />;
    default:
      return <InstructionsPlaceholder />;
  }
}
