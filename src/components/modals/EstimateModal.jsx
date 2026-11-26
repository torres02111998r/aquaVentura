import { useState } from "react";
import { ArrowRight } from "lucide-react";
import CharacterAvatar from "../common/CharacterAvatar";

/**
 * Narrative estimate gate for Level 1.
 *
 * Rendered conditionally so it remounts with a fresh value every time it opens
 * (avoids syncing props to state inside an effect).
 */
export default function EstimateModal({ initialValue = 80, onConfirm }) {
  const [value, setValue] = useState(String(initialValue));

  const liters = Number(value) || 0;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#03142b]/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="estimate-modal-title"
    >
      <form
        className="w-full max-w-sm rounded-2xl border-2 border-av-blue-deep bg-white p-4 text-av-blue-deep shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(liters);
        }}
      >
        <div className="flex items-center gap-3">
          <CharacterAvatar id="luz" name="Luz" size="lg" ring />
          <div className="min-w-0">
            <p className="m-0 font-body text-[0.58rem] font-bold tracking-[0.14em] text-[#0E76A8] uppercase">
              Estimación previa
            </p>
            <h2
              id="estimate-modal-title"
              className="mt-0.5 mb-0 font-display text-base leading-tight"
            >
              ¿Cuánta agua se pierde por día?
            </h2>
          </div>
        </div>

        <p className="mt-3 mb-0 rounded-xl bg-av-blue/10 px-3 py-2 font-body text-[0.72rem] leading-snug">
          Luz: «¡Aquí no se desperdicia nada!»
        </p>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-4xl leading-none">{liters}</span>
          <span className="font-body text-[0.6rem] font-bold tracking-[0.12em] text-av-blue-deep/60 uppercase">
            L / día
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="200"
          step="5"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-2 w-full cursor-pointer accent-av-yellow"
          aria-label="Litros perdidos por día"
          autoFocus
        />
        <div className="flex justify-between font-body text-[0.55rem] font-semibold tracking-[0.1em] text-av-blue-deep/50 uppercase">
          <span>0 L</span>
          <span>200 L</span>
        </div>

        <button
          type="submit"
          className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-av-yellow px-4 py-2.5 font-body text-xs font-bold tracking-[0.04em] text-[#1557B0] shadow-[0_8px_20px_rgba(0,20,60,0.25)] transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow active:translate-y-px"
        >
          Confirmar y empezar
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
