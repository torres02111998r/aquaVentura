import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';

const LOGO_SRC = '/assets/Logo_pantalla_1_transparent.png';

export default function HomeScreen() {
  const setScreen = useGameStore((state) => state.setScreen);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <main className="grid min-h-svh grid-rows-[auto_1fr_auto] place-items-center gap-[clamp(16px,3vh,32px)] bg-av-blue px-[clamp(16px,4vw,32px)] py-[clamp(24px,5vh,48px)] text-center">
      <h1 className="m-0 font-display text-[clamp(2rem,6vw,3.75rem)] leading-[1.05] font-normal tracking-[0.04em] text-white uppercase [text-shadow:0_3px_0_rgba(0,30,80,0.22),0_10px_24px_rgba(0,20,60,0.28)]">
        BIENVENIDO
      </h1>

      <div className="flex w-[min(78vw,420px)] items-center justify-center">
        {logoFailed ? (
          <div
            className="flex flex-col items-center gap-2"
            role="img"
            aria-label="Aquaventura: cada gota cuenta"
          >
            <svg
              className="h-auto w-[min(40vw,180px)] [filter:drop-shadow(0_14px_28px_rgba(0,20,60,0.32))]"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="homeDropFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#F4CE0F" />
                </linearGradient>
              </defs>
              <path
                d="M60 6c18 26 40 47 40 70a40 40 0 0 1-80 0C20 53 42 32 60 6Z"
                fill="url(#homeDropFill)"
              />
            </svg>
            <p className="m-0 font-display text-[clamp(1.5rem,5vw,2.25rem)] tracking-[0.03em] text-white uppercase">
              Aquaventura
            </p>
            <p className="m-0 font-body text-[clamp(0.85rem,2.4vw,1rem)] tracking-[0.18em] text-av-yellow uppercase">
              Cada gota cuenta
            </p>
          </div>
        ) : (
          <img
            className="h-auto max-h-[46vh] w-full object-contain [filter:drop-shadow(0_18px_32px_rgba(0,20,60,0.3))]"
            src={LOGO_SRC}
            alt="Aquaventura"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      <button
        type="button"
        className="cursor-pointer rounded-[20px] bg-av-blue-button px-[clamp(48px,12vw,88px)] py-[clamp(14px,2.4vh,20px)] font-display text-[clamp(1.25rem,3vw,1.75rem)] tracking-[0.12em] text-av-yellow uppercase shadow-[0_8px_0_#1b4a8a,0_14px_28px_rgba(0,20,60,0.3)] transition-[transform,box-shadow,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-[1.07] hover:shadow-[0_10px_0_#1b4a8a,0_18px_30px_rgba(0,20,60,0.32)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-av-yellow active:translate-y-[3px] active:shadow-[0_4px_0_#1b4a8a,0_8px_16px_rgba(0,20,60,0.26)] motion-reduce:transition-none"
        onClick={() => setScreen('INTRO')}
      >
        JUGAR
      </button>
    </main>
  );
}
