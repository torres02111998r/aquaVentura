import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import SpeechBubble from './SpeechBubble';

/**
 * Cast from the GDD (section 4.1). Every line keeps the script rule:
 * one sentence, twelve words at most.
 */
const CAST = [
  {
    id: 'tato',
    name: 'Tato',
    role: 'Plomero jubilado',
    line: 'Con todo cerrado, la aguja no debería moverse.',
    avatar: 'bg-av-blue-deep',
  },
  {
    id: 'luz',
    name: 'Luz',
    role: 'Mamá de los Ortiz',
    line: '¡Aquí no se desperdicia nada!',
    avatar: 'bg-av-blue-button-alt',
  },
  {
    id: 'hernan',
    name: 'Hernán',
    role: 'Papá de los Ortiz',
    line: 'Yo lavo el patio con manguera, es más rápido.',
    avatar: 'bg-av-blue-button',
  },
  {
    id: 'mateo',
    name: 'Mateo',
    role: 'Hijo, 10 años',
    line: 'Se me olvidó cerrar la llave otra vez.',
    avatar: 'bg-[#0E76A8]',
  },
  {
    id: 'efrain',
    name: 'Efraín',
    role: 'Vecino de la moto',
    line: 'Vengo a lavar la moto, no tardo nada.',
    avatar: 'bg-[#1557B0]',
  },
  {
    id: 'valentina',
    name: 'Valentina',
    role: 'Estudiante del apartamento',
    line: 'Mi ducha larga es lo único que me relaja.',
    avatar: 'bg-[#0B6FA4]',
  },
];

export default function CastScreen() {
  const inspectorName = useGameStore((state) => state.inspectorName);
  const setInspectorName = useGameStore((state) => state.setInspectorName);
  const setScreen = useGameStore((state) => state.setScreen);

  const [draft, setDraft] = useState(inspectorName);
  const [selectedId, setSelectedId] = useState(null);

  const confirmed = Boolean(inspectorName);
  const selected = CAST.find((person) => person.id === selectedId) ?? null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setInspectorName(name);
    setSelectedId(null);
  };

  return (
    <main className="flex h-svh flex-col overflow-hidden bg-av-blue">
      <header className="shrink-0 bg-av-blue-deep px-4 py-2.5 text-center shadow-[0_8px_24px_rgba(0,25,60,0.28)]">
        <h1 className="m-0 font-display text-[clamp(1rem,3vw,1.6rem)] tracking-[0.05em] text-white uppercase">
          Elenco de Los Cámbulos
        </h1>
      </header>

      <section className="flex min-h-0 flex-1 items-center overflow-y-auto px-[clamp(12px,3vw,32px)] py-3">
        <div className="mx-auto grid w-full max-w-4xl gap-3 lg:grid-cols-[minmax(0,17rem)_1fr]">
          <form
            className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-xl"
            onSubmit={handleSubmit}
          >
            <label
              className="font-body text-[0.62rem] font-bold tracking-[0.16em] text-av-blue-deep/70 uppercase"
              htmlFor="inspector-name"
            >
              Nombre del inspector
            </label>
            <div className="flex gap-2">
              <input
                id="inspector-name"
                className="min-w-0 flex-1 rounded-xl bg-av-blue/10 px-3 py-2 font-body text-sm text-av-blue-deep outline-none placeholder:text-av-blue-deep/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ej. Wil"
                maxLength={18}
                autoComplete="off"
              />
              <button
                type="submit"
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-av-blue-deep text-av-yellow transition-colors hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow"
                aria-label="Confirmar nombre"
                title="Confirmar nombre"
              >
                <Check className="size-5" aria-hidden="true" />
              </button>
            </div>
            <p className="m-0 font-body text-[0.68rem] leading-snug text-av-blue-deep/60">
              {confirmed
                ? `Credencial lista, Inspector ${inspectorName}.`
                : 'Escribe tu nombre y confirma la credencial.'}
            </p>
          </form>

          <div className="flex min-h-0 flex-col gap-2">
            {confirmed ? (
              <>
                <SpeechBubble className="mx-auto w-full max-w-md">
                  <p className="m-0 font-body text-[0.6rem] font-bold tracking-[0.16em] text-[#0E76A8] uppercase">
                    {selected ? selected.name : 'Tato'}
                  </p>
                  <p className="mt-1 mb-0 font-body text-sm leading-snug">
                    {selected
                      ? selected.line
                      : `¡Hola, Inspector ${inspectorName}! Bienvenido a la junta.`}
                  </p>
                </SpeechBubble>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {CAST.map((person) => {
                    const active = person.id === selectedId;
                    return (
                      <button
                        key={person.id}
                        type="button"
                        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl p-2 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow ${
                          active ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'
                        }`}
                        onClick={() =>
                          setSelectedId(active ? null : person.id)
                        }
                        aria-pressed={active}
                      >
                        <span
                          className={`grid size-9 place-items-center rounded-full font-display text-sm text-white shadow-[0_4px_10px_rgba(0,20,60,0.3)] ${person.avatar}`}
                        >
                          {person.name.charAt(0)}
                        </span>
                        <span className="font-body text-[0.6rem] font-semibold text-white">
                          {person.name}
                        </span>
                        <span className="font-body text-[0.5rem] leading-none text-white/60">
                          {person.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="m-0 self-center rounded-2xl bg-white/10 px-4 py-3 text-center font-body text-sm text-white/85">
                Confirma tu nombre para conocer al equipo de la junta.
              </p>
            )}
          </div>
        </div>
      </section>

      <footer className="flex shrink-0 justify-end px-[clamp(12px,3vw,32px)] pb-[clamp(10px,2vh,20px)]">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-av-yellow px-[clamp(18px,3.5vw,28px)] py-[clamp(10px,1.6vh,14px)] font-body text-[clamp(0.75rem,1.8vw,0.9rem)] font-bold tracking-[0.04em] text-[#1557B0] shadow-[0_8px_20px_rgba(0,20,60,0.3)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:brightness-100 motion-reduce:transition-none"
          onClick={() => setScreen('MAP')}
          disabled={!confirmed}
        >
          IR AL MAPA DEL BARRIO
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
