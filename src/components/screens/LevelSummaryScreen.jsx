import { useEffect, useRef } from 'react';
import { ArrowRight, Droplet, Star } from 'lucide-react';
import { FUNDACION_AQUAE_DATO, LEVEL1 } from '../../game/data/level1Data';
import { useGameStore } from '../../store/useGameStore';

/**
 * Closing screen of level 1. Compares the briefing estimate with the real
 * 80 L/day loss, awards stars (GDD 5.2) and unlocks level 2.
 */
export default function LevelSummaryScreen() {
  const estimacionJugador = useGameStore((state) => state.estimacionJugador);
  const perdidaDiaria = useGameStore((state) => state.perdidaDiaria);
  const piezasPerdidas = useGameStore((state) => state.piezasPerdidas);
  const puntos = useGameStore((state) => state.puntos);
  const setEstrellas = useGameStore((state) => state.setEstrellas);
  const unlockLevel = useGameStore((state) => state.unlockLevel);
  const addPuntos = useGameStore((state) => state.addPuntos);
  const setScreen = useGameStore((state) => state.setScreen);

  const real = LEVEL1.estimacionReal;
  const errorPct = Math.round((Math.abs(estimacionJugador - real) / real) * 100);
  const estimacionAcertada = errorPct <= LEVEL1.margenEstimacion * 100;

  let stars = 1;
  if (perdidaDiaria < LEVEL1.metaEstrella2) stars = 2;
  if (estimacionAcertada && piezasPerdidas === 0) stars = 3;

  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;

    setEstrellas(LEVEL1.id, stars);
    unlockLevel(LEVEL1.id + 1);
    if (estimacionAcertada) addPuntos(15);
  }, [stars, estimacionAcertada, setEstrellas, unlockLevel, addPuntos]);

  return (
    <main className="flex h-svh flex-col overflow-hidden bg-av-blue">
      <header className="shrink-0 bg-av-blue-deep px-4 py-2.5 text-center shadow-[0_8px_24px_rgba(0,25,60,0.28)]">
        <h1 className="m-0 font-display text-[clamp(1rem,3vw,1.5rem)] tracking-[0.05em] text-white uppercase">
          Nivel 1 completado
        </h1>
        <p className="m-0 font-body text-[0.6rem] tracking-[0.12em] text-av-cyan uppercase">
          La casa Ortiz · El medidor se detuvo
        </p>
      </header>

      <section className="flex min-h-0 flex-1 items-center overflow-y-auto px-[clamp(12px,3vw,32px)] py-3">
        <div className="mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-xl">
            <p className="m-0 font-body text-[0.58rem] font-bold tracking-[0.16em] text-av-blue-deep/60 uppercase">
              Estrellas del nivel
            </p>
            <div className="mt-1 flex items-center gap-1">
              {[0, 1, 2].map((index) => (
                <Star
                  key={index}
                  className={
                    index < stars
                      ? 'size-8 fill-av-yellow text-av-yellow'
                      : 'size-8 text-av-blue-deep/20'
                  }
                  aria-hidden="true"
                />
              ))}
              <span className="ml-2 font-display text-2xl text-av-blue-deep">{stars}/3</span>
            </div>

            <p className="mt-3 mb-0 font-body text-[0.68rem] leading-snug text-av-blue-deep/60">
              {stars < 3
                ? 'La tercera estrella pide estimación con menos de 15% de error y ninguna pieza perdida.'
                : 'Estimación precisa y kit intacto. Insignia de ojo de lince.'}
            </p>

            <div className="mt-3 rounded-xl bg-av-blue/10 px-3 py-2">
              <p className="m-0 font-body text-[0.58rem] font-bold tracking-[0.14em] text-[#0E76A8] uppercase">
                Puntos acumulados
              </p>
              <p className="m-0 font-display text-lg text-av-blue-deep">{puntos}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-xl">
            <p className="m-0 font-body text-[0.58rem] font-bold tracking-[0.16em] text-av-blue-deep/60 uppercase">
              Tu estimación vs. la realidad
            </p>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-av-blue/10 px-3 py-2">
                <p className="m-0 font-body text-[0.55rem] tracking-[0.1em] text-av-blue-deep/60 uppercase">
                  Dijiste
                </p>
                <p className="m-0 font-display text-lg text-av-blue-deep">
                  {estimacionJugador} L
                </p>
              </div>
              <div className="rounded-xl bg-[#0E76A8] px-3 py-2 text-white">
                <p className="m-0 font-body text-[0.55rem] tracking-[0.1em] text-white/70 uppercase">
                  Real
                </p>
                <p className="m-0 font-display text-lg">{real} L</p>
              </div>
            </div>

            <p className="mt-2 mb-0 font-body text-[0.7rem] text-av-blue-deep">
              Error de <span className="font-bold">{errorPct}%</span>
              {estimacionAcertada ? ' · dentro del margen del 15%.' : ' · fuera del margen del 15%.'}
            </p>

            <p className="mt-1 mb-0 font-body text-[0.68rem] text-av-blue-deep/60">
              Piezas perdidas: <span className="font-bold">{piezasPerdidas}</span>
            </p>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-av-yellow/20 px-3 py-2">
              <Droplet className="mt-0.5 size-4 shrink-0 text-[#0E76A8]" aria-hidden="true" />
              <p className="m-0 font-body text-[0.66rem] leading-snug text-av-blue-deep">
                {FUNDACION_AQUAE_DATO}
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="flex shrink-0 justify-end px-[clamp(12px,3vw,32px)] pb-[clamp(10px,2vh,20px)]">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-av-yellow px-[clamp(18px,3.5vw,28px)] py-[clamp(10px,1.6vh,14px)] font-body text-[clamp(0.75rem,1.8vw,0.9rem)] font-bold tracking-[0.04em] text-[#1557B0] shadow-[0_8px_20px_rgba(0,20,60,0.3)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-px motion-reduce:transition-none"
          onClick={() => setScreen('MAP')}
        >
          VOLVER AL MAPA
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
