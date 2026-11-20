import HomeScreen from './components/screens/HomeScreen';
import InstructionsScreen from './components/screens/InstructionsScreen';
import IntroScreen from './components/screens/IntroScreen';
import { useGameStore } from './store/useGameStore';

/** Temporary fallback for screens that are not implemented yet. */
function UnimplementedScreen({ screen }) {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <main className="flex h-svh flex-col items-center justify-center gap-4 bg-av-blue px-6 text-center">
      <h1 className="m-0 font-display text-[clamp(1.4rem,4vw,2.5rem)] text-white uppercase">
        {screen}
      </h1>
      <p className="m-0 max-w-[34ch] font-body text-white/85">
        Esta pantalla todavía no está implementada.
      </p>
      <button
        type="button"
        className="cursor-pointer rounded-full bg-av-blue-button px-6 py-3 font-body font-semibold text-av-yellow shadow-[0_6px_18px_rgba(0,20,60,0.28)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-[1.07] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-av-yellow active:translate-y-px motion-reduce:transition-none"
        onClick={() => setScreen('HOME')}
      >
        Ir al inicio
      </button>
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
      return <InstructionsScreen />;
    default:
      return <UnimplementedScreen screen={currentScreen} />;
  }
}
