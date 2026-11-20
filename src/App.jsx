import GameFrame from './components/hud/GameFrame';
import BriefingScreen from './components/screens/BriefingScreen';
import CastScreen from './components/screens/CastScreen';
import HomeScreen from './components/screens/HomeScreen';
import InstructionsScreen from './components/screens/InstructionsScreen';
import IntroScreen from './components/screens/IntroScreen';
import MapScreen from './components/screens/MapScreen';
import { useGameStore } from './store/useGameStore';

/**
 * Temporary canvas slot: the Phaser scene for level 1 will mount here.
 * It already sits inside the persistent HUD frame.
 */
function PlayingPlaceholder() {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <GameFrame>
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0b2a4a] px-6 text-center text-white/80">
        <p className="m-0 font-display text-[0.7rem] tracking-[0.28em] uppercase">
          Escena Phaser
        </p>
        <p className="m-0 max-w-[38ch] font-body text-xs leading-relaxed">
          Aquí se montará el canvas 2D del Nivel 1: la casa Ortiz en corte lateral.
        </p>
        <button
          type="button"
          className="mt-2 cursor-pointer rounded-full bg-av-yellow px-5 py-2 font-body text-[0.72rem] font-bold tracking-[0.06em] text-[#1557B0] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-px motion-reduce:transition-none"
          onClick={() => setScreen('MAP')}
        >
          Salir al mapa
        </button>
      </div>
    </GameFrame>
  );
}

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
        className="cursor-pointer rounded-full bg-av-blue-button px-6 py-3 font-body font-semibold text-av-yellow shadow-[0_6px_18px_rgba(0,20,60,0.28)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-av-yellow active:translate-y-px motion-reduce:transition-none"
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
    case 'CAST':
      return <CastScreen />;
    case 'MAP':
      return <MapScreen />;
    case 'BRIEFING':
      return <BriefingScreen />;
    case 'PLAYING':
      return <PlayingPlaceholder />;
    default:
      return <UnimplementedScreen screen={currentScreen} />;
  }
}
