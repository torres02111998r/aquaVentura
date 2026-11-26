import {
  ClipboardList,
  Clock,
  Droplet,
  Gauge,
  Receipt,
  Star,
  Waves,
} from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import useLevel4Hud from "../../hooks/useLevel4Hud";

const formatPesos = (valor) => `$${Math.round(valor).toLocaleString("es-CO")}`;

function MeterBlock({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-1.5">
      <Icon className="size-4 shrink-0 text-av-cyan" aria-hidden="true" />
      <div className="min-w-0 leading-tight">
        <p className="m-0 text-[0.55rem] font-semibold tracking-[0.16em] text-white/65 uppercase">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function TopHUD() {
  const tanque = useGameStore((state) => state.tanque);
  const factura = useGameStore((state) => state.factura);
  const caudalRio = useGameStore((state) => state.caudalRio);
  const missionText = useGameStore((state) => state.missionText);
  const estrellas = useGameStore((state) => state.estrellasPorNivel[0]);

  // Datos del nivel 4 (null en cualquier otro nivel)
  const level4Hud = useLevel4Hud();
  const caudal = level4Hud ? level4Hud.river : caudalRio;
  const objetivo =
    level4Hud?.objective ?? level4Hud?.missionText ?? missionText;

  const PACE = {
    waiting: { text: "Esperando", color: "text-white/70" },
    deciding: {
      text: `Decide en ${level4Hud?.decisionSecondsLeft}s`,
      color: "text-av-yellow",
    },
    critical: { text: "Crítico", color: "text-red-300" },
    normal: { text: "Normal", color: "text-emerald-300" },
  };
  const pace = level4Hud ? PACE[level4Hud.pace] : null;

  return (
    <header
      className={`grid w-full shrink-0 grid-cols-2 items-stretch gap-2 bg-[#1557B0] px-3 py-2 text-white shadow-[0_6px_18px_rgba(0,20,60,0.35)] ${
        level4Hud
          ? "sm:grid-cols-[1fr_auto_auto_auto]"
          : "sm:grid-cols-[auto_1fr_auto_auto]"
      }`}
    >
      {/* Tanque: solo fuera del nivel 4 */}
      {!level4Hud && (
        <MeterBlock icon={Droplet} label="Tanque">
          <p className="m-0 font-display text-sm whitespace-nowrap">
            {tanque} L
          </p>
        </MeterBlock>
      )}

      {/* Centro: en el nivel 4 va objetivo + hora + ritmo; en los demás, el objetivo de siempre */}
      <div className="order-first col-span-2 flex items-center justify-center gap-2 rounded-xl bg-white/10 px-2.5 py-1.5 sm:order-none sm:col-span-1">
        <ClipboardList
          className="size-4 shrink-0 text-av-yellow"
          aria-hidden="true"
        />
        <div className="min-w-0 text-center leading-tight">
          <p className="m-0 text-[0.55rem] font-semibold tracking-[0.16em] text-white/65 uppercase">
            {level4Hud ? `Misión ${level4Hud.missionIndex} de 5` : "Objetivo"}
          </p>
          <p
            className={`m-0 font-body text-[0.78rem] font-semibold ${
              level4Hud ? "line-clamp-2" : "truncate"
            }`}
          >
            {objetivo}
          </p>
        </div>
      </div>

      {level4Hud && (
        <>
          <MeterBlock icon={Clock} label="Hora">
            <p
              className={`m-0 font-display text-sm whitespace-nowrap ${
                level4Hud.alert ? "animate-pulse text-red-400" : ""
              }`}
            >
              {level4Hud.clock} / 12:00
            </p>
          </MeterBlock>

          <MeterBlock icon={Gauge} label="Ritmo">
            <p
              className={`m-0 font-display text-sm whitespace-nowrap ${pace.color}`}
            >
              {pace.text}
            </p>
          </MeterBlock>
        </>
      )}

      {/* Factura: solo fuera del nivel 4 */}
      {!level4Hud && (
        <MeterBlock icon={Receipt} label="Factura">
          <div className="flex items-center gap-1.5">
            <p className="m-0 font-display text-sm whitespace-nowrap">
              {formatPesos(factura)}
            </p>
            <span
              className="flex items-center gap-0.5"
              aria-label={`${estrellas} de 3 estrellas`}
            >
              {[0, 1, 2].map((i) => (
                <Star
                  key={i}
                  className={
                    i < estrellas
                      ? "size-3 fill-av-yellow text-av-yellow"
                      : "size-3 text-white/35"
                  }
                  aria-hidden="true"
                />
              ))}
            </span>
          </div>
        </MeterBlock>
      )}

      <MeterBlock icon={Waves} label="Caudal del río">
        <div className="flex items-center gap-1.5">
          <p className="m-0 font-display text-sm whitespace-nowrap">
            {caudal}%
          </p>
          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/25">
            <span
              className="block h-full rounded-full bg-av-cyan transition-[width] duration-300"
              style={{ width: `${Math.min(Math.max(caudal, 0), 100)}%` }}
            />
          </span>
        </div>
      </MeterBlock>
    </header>
  );
}
