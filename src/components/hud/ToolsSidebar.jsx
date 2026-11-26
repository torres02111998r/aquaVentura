import { useState } from "react";
import { PaintBucket, Radar, Radio, Timer, Wrench, X } from "lucide-react";
import { EventBus } from "../../game/EventBus";
import CharacterAvatar from "../common/CharacterAvatar";
import { useGameStore } from "../../store/useGameStore";
import useLevel4Hud from "../../hooks/useLevel4Hud"; //Prueba Maicol Nivel 4

const DEFAULT_TATO_MESSAGE = "Tato: la aguja sigue girando. Algo se escapa.";

function ToolSlot({ icon: Icon, label, count, muted = false, onClick, title }) {
  const content = (
    <>
      <span className="relative grid size-11 place-items-center rounded-xl bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]">
        <Icon className="size-5" aria-hidden="true" />
        {count !== undefined && (
          <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-av-yellow font-body text-[0.6rem] font-bold text-[#1557B0]">
            {count}
          </span>
        )}
      </span>
      <span className="text-center font-body text-[0.55rem] font-semibold tracking-[0.08em] text-white/85 uppercase">
        {label}
      </span>
    </>
  );

  const baseClass = `flex w-full flex-col items-center gap-1 ${muted ? "opacity-70" : ""}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={`${baseClass} cursor-pointer rounded-xl px-1 py-1 transition-colors hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow`}
        onClick={onClick}
        aria-label={`Usar ${label}`}
        title={`Usar ${label}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={baseClass} title={title}>
      {content}
    </div>
  );
}

export default function ToolsSidebar() {
  const cargasDetector = useGameStore((state) => state.cargasDetector);
  const piezasKit = useGameStore((state) => state.piezasKit);
  const tatoMessage = useGameStore((state) => state.tatoMessage);
  const [tatoOpen, setTatoOpen] = useState(false);

  const totalPiezas = Object.values(piezasKit).reduce(
    (total, n) => total + n,
    0,
  );

  const level4Hud = useLevel4Hud();
  const detectorCount = level4Hud ? level4Hud.detectorCharges : cargasDetector;
  const piezasCount = level4Hud ? level4Hud.kitTotal : totalPiezas;
  const kitDetalle = level4Hud
    ? `Empaques: ${level4Hud.kit.empaque} · Flotadores: ${level4Hud.kit.flotador} · Cinta: ${level4Hud.kit.cinta} · Abrazaderas: ${level4Hud.kit.abrazadera}`
    : undefined;

  const requestDetector = () => EventBus.emit("game:detector-request");

  return (
    <aside className="relative flex w-[5.25rem] shrink-0 flex-col items-center gap-3 bg-[#0E76A8] px-2 py-3 text-white shadow-[-6px_0_18px_rgba(0,20,60,0.25)]">
      <p className="m-0 text-center font-body text-[0.55rem] font-bold tracking-[0.18em] text-white/70 uppercase">
        Herramientas
      </p>

      <ToolSlot
        icon={Radar}
        label="Detector"
        count={detectorCount}
        onClick={requestDetector}
      />
      <ToolSlot
        icon={Wrench}
        label="Kit"
        count={piezasCount}
        title={kitDetalle}
      />
      {(!level4Hud || level4Hud.activeHouseId === "efrain") && (
        <ToolSlot icon={PaintBucket} label="Cubeta" muted={!level4Hud} />
      )}
      {!level4Hud && <ToolSlot icon={Timer} label="Temporizador" muted />}

      {/* <ToolSlot icon={PaintBucket} label="Cubeta" muted />  */}
      {/* <ToolSlot icon={Timer} label="Temporizador" muted /> */}

      <button
        type="button"
        className="mt-auto flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-1 transition-colors hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow"
        onClick={() => setTatoOpen((open) => !open)}
        aria-expanded={tatoOpen}
        aria-label="Abrir la radio de Tato"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-av-yellow text-[#1557B0] shadow-[0_6px_14px_rgba(0,20,60,0.35)]">
          <Radio className="size-5" aria-hidden="true" />
        </span>
        <span className="text-center font-body text-[0.55rem] font-semibold tracking-[0.08em] text-white/85 uppercase">
          Radio
        </span>
      </button>

      {tatoOpen && (
        <div className="absolute right-full bottom-6 mr-2 w-52 rounded-2xl bg-white p-3 text-left shadow-xl">
          <button
            type="button"
            className="absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full text-av-blue-deep/60 hover:bg-av-blue-deep/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow"
            onClick={() => setTatoOpen(false)}
            aria-label="Cerrar mensaje de Tato"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <CharacterAvatar id="tato" name="Tato" size="xs" />
            <p className="m-0 font-body text-[0.7rem] font-bold tracking-[0.1em] text-[#0E76A8] uppercase">
              Tato
            </p>
          </div>
          <p className="mt-1 mb-0 pr-4 font-body text-[0.75rem] leading-snug text-av-blue-deep">
            {tatoMessage || DEFAULT_TATO_MESSAGE}
          </p>
          <span className="absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 rotate-45 bg-white" />
        </div>
      )}
    </aside>
  );
}
