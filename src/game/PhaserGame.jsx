import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import Level1Scene from "../game/scenes/Level1Scene";
import Level2Scene from "../game/scenes/Level2Scene";
import Level4Scene from "../game/scenes/Level4Scene";
import { EventBus } from "../game/EventBus";
import { TATO_LINES } from "../game/data/level1Data";
import { SoundFX } from "./utils/SoundFX";
import { useGameStore } from "../store/useGameStore";
import RepairKitModal from "../components/modals/RepairKitModal";
import EstimateModal from "../components/modals/EstimateModal";
import CharacterAvatar from "../components/common/CharacterAvatar";

const SPEAKER_IDS = {
  inspector: "inspector",
  tato: "tato",
  luz: "luz",
  hernan: "hernan",
  mateo: "mateo",
  efrain: "efrain",
  valentina: "valentina",
};

const speakerIdFor = (speaker) => {
  const key = String(speaker ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return SPEAKER_IDS[key] ?? "tato";
};

export default function PhaserGame() {
  const parentRef = useRef(null);
  const gameRef = useRef(null);
  const patchGame = useGameStore((state) => state.patchGame);
  const setScreen = useGameStore((state) => state.setScreen);
  const nivelActual = useGameStore((state) => state.nivelActual);
  const estimacionJugador = useGameStore((state) => state.estimacionJugador);
  const setEstimacionJugador = useGameStore(
    (state) => state.setEstimacionJugador,
  );

  const [message, setMessage] = useState({
    speaker: "Tato",
    text: TATO_LINES.intro,
  });
  const [l1EstimateOpen, setL1EstimateOpen] = useState(false);

  const HOUSE_STATUS = {
    pending: { text: "Pendiente", cls: "bg-red-100 text-red-700" },
    partial: { text: "Parcial", cls: "bg-amber-100 text-amber-700" },
    attended: { text: "Atendida", cls: "bg-green-100 text-green-700" },
  };

  const KIT_NAMES = {
    empaque: "Empaques",
    flotador: "Flotadores",
    cinta: "Cinta",
    abrazadera: "Abrazaderas",
  };

  // Ventana pequeña de estimación para Nivel 4
  const [estimateInput, setEstimateInput] = useState("120");
  const [l4Comparison, setL4Comparison] = useState(null);
  const [l4ShowReport, setL4ShowReport] = useState(false);
  const [l4Challenges, setL4Challenges] = useState([]);
  const [estimateDone, setEstimateDone] = useState(false);
  const [prevNivel, setPrevNivel] = useState(nivelActual);
  const [runId, setRunId] = useState(0); // Para reiniciar el juego si se cambia de nivel

  // El modal se calcula, no se guarda: aparece en el nivel 4 hasta confirmar
  const showEstimateModal = nivelActual === 4 && !estimateDone;

  // Al cambiar de nivel se reinicia todo (forma recomendada por React, sin useEffect)
  if (prevNivel !== nivelActual) {
    setPrevNivel(nivelActual);
    setEstimateDone(false);
    setL4Comparison(null);
    setL4ShowReport(false);
    setL4Challenges([]);
    setL1EstimateOpen(false);
  }

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return undefined;

    let scenes = [Level1Scene];
    if (nivelActual === 2) {
      scenes = [Level2Scene];
    } else if (nivelActual === 4) {
      scenes = [Level4Scene];
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 960,
      height: 540,
      backgroundColor: "#0b2a4a",
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 900 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: scenes,
    });

    gameRef.current = game;

    const onMessage = (payload) => setMessage(payload);
    const onState = (payload) =>
      patchGame({
        perdidaDiaria: payload.perdidaDiaria,
        cargasDetector: payload.cargasDetector,
        detectorActive: payload.detectorActive,
        ...(payload.missionText ? { missionText: payload.missionText } : {}),
      });
    const onL1Estimate = () => setL1EstimateOpen(true);
    const onComplete = () => setScreen("LEVEL_SUMMARY");
    const onExit = () => setScreen("MAP");
    const onL4Summary = (payload) => {
      setL4Comparison(payload);
      setL4Challenges([]);
      // Si ganó va directo al reporte; si perdió, primero «¿Qué pasó?»
      setL4ShowReport(payload.won);
    };

    EventBus.on("game:message", onMessage);
    EventBus.on("game:state", onState);
    EventBus.on("game:complete", onComplete);
    EventBus.on("game:exit", onExit);
    EventBus.on("level4:summary", onL4Summary);
    EventBus.on("level1:estimate-request", onL1Estimate);

    return () => {
      EventBus.off("game:message", onMessage);
      EventBus.off("game:state", onState);
      EventBus.off("game:complete", onComplete);
      EventBus.off("game:exit", onExit);
      EventBus.off("level4:summary", onL4Summary);
      EventBus.off("level1:estimate-request", onL1Estimate);
      game.destroy(true);
      gameRef.current = null;
    };
  }, [patchGame, setScreen, nivelActual, runId]); // Si cambia el nivel, se reinicia el juego

  useEffect(() => {
    const unlock = () => SoundFX.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const handleL1Estimate = (liters) => {
    setEstimacionJugador(liters);
    setL1EstimateOpen(false);
    EventBus.emit("level1:estimate-submitted", { liters });
  };

  const handleConfirmEstimate = (e) => {
    e.preventDefault();
    const liters = Math.max(0, Number(estimateInput) || 0);
    setEstimateDone(true);
    EventBus.emit("level4:estimate-submitted", { liters });
  };

  const handleRetry = () => {
    setL4Comparison(null);
    setL4ShowReport(false);
    setL4Challenges([]);
    setEstimateInput("120");
    setEstimateDone(false);
    setRunId((r) => r + 1); // destruye y vuelve a crear el juego desde cero
  };

  const toggleChallenge = (i) =>
    setL4Challenges((prev) =>
      prev.includes(i)
        ? prev.filter((x) => x !== i)
        : prev.length < 2
          ? [...prev, i]
          : prev,
    );

  return (
    <div className="relative flex h-full w-full flex-col bg-[#0b2a4a]">
      <div className="flex shrink-0 items-start gap-2 px-3 pt-2 pb-1">
        <CharacterAvatar
          id={speakerIdFor(message.speaker)}
          name={message.speaker}
          size="sm"
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-av-yellow px-2 py-0.5 font-display text-[0.58rem] tracking-[0.06em] text-[#1557B0] uppercase">
            {message.speaker}
          </span>
          <p className="mt-1 mb-0 min-h-[2.1rem] rounded-xl rounded-tl-sm bg-white px-3 py-1.5 font-body text-[0.72rem] leading-snug text-av-blue-deep shadow-[0_6px_16px_rgba(0,20,60,0.28)]">
            {message.text}
          </p>
        </div>
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-hidden" />

      {showEstimateModal && nivelActual === 4 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <form
            onSubmit={handleConfirmEstimate}
            className="w-full max-w-sm rounded-2xl border-2 border-av-blue-deep bg-white p-4 text-av-blue-deep shadow-2xl"
          >
            <p className="m-0 font-display text-xs text-[#0E76A8] uppercase">
              Nivel 4 · Estimación inicial
            </p>
            <h2 className="mt-1 mb-2 font-display text-base">
              ¿Cuántos litros crees que se pierden hoy en la cuadra?
            </h2>
            <input
              type="number"
              min="0"
              step="1"
              value={estimateInput}
              onChange={(e) => setEstimateInput(e.target.value)}
              className="w-full rounded-xl border border-av-blue-deep/30 px-3 py-2 font-body text-sm font-bold text-av-blue-deep focus:outline-2 focus:outline-av-blue"
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="submit"
                className="cursor-pointer rounded-full bg-av-yellow px-4 py-2 font-body text-xs font-bold text-[#1557B0] shadow"
              >
                Confirmar e iniciar (10s)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ¿Qué pasó? — solo si el jugador pierde */}
      {l4Comparison && !l4ShowReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-av-blue-deep bg-white p-4 text-av-blue-deep shadow-2xl">
            <p className="m-0 font-display text-xs text-[#0E76A8] uppercase">
              Fin del nivel 4 · 12:00
            </p>
            <h2 className="mt-1 mb-2 font-display text-base">¿Qué pasó?</h2>
            <p className="m-0 font-body text-xs">
              El río pasó de <strong>{l4Comparison.riverInitial}%</strong> a{" "}
              <strong>{l4Comparison.riverFlow}%</strong>. Para ganar necesitabas
              más del 40 %.
            </p>

            <h3 className="mt-3 mb-1 font-display text-xs uppercase">
              Penalizaciones
            </h3>
            <ul className="m-0 list-disc pl-4 font-body text-xs">
              {l4Comparison.penalties.length === 0 ? (
                <li>Ninguna</li>
              ) : (
                l4Comparison.penalties.map((p, i) => (
                  <li key={i}>
                    {p.tipo}: -{p.puntos} puntos ({p.hora})
                  </li>
                ))
              )}
            </ul>

            <h3 className="mt-3 mb-1 font-display text-xs uppercase">
              Imprevisto de las 10:00
            </h3>
            <p className="m-0 font-body text-xs">
              {l4Comparison.incident
                ? `${l4Comparison.incident.houseName}: ${
                    l4Comparison.incident.kind === "leak"
                      ? "fuga nueva"
                      : "rebose nuevo"
                  } (${l4Comparison.incident.litros} L). ${
                    l4Comparison.incident.resolved
                      ? "Lo resolviste."
                      : "Quedó pendiente."
                  }`
                : "No alcanzó a ocurrir."}
            </p>

            <h3 className="mt-3 mb-1 font-display text-xs uppercase">
              Problemas pendientes
            </h3>
            <p className="m-0 font-body text-xs">
              {l4Comparison.pendingLabels.length
                ? `${l4Comparison.pendingLabels.join(", ")} (${l4Comparison.pendingLitros} L)`
                : "Ninguno"}
            </p>

            <h3 className="mt-3 mb-1 font-display text-xs uppercase">
              Recursos que se agotaron
            </h3>
            <p className="m-0 font-body text-xs">
              {l4Comparison.exhaustedResources.length
                ? l4Comparison.exhaustedResources.join(", ")
                : "Ninguno"}
            </p>

            <h3 className="mt-3 mb-1 font-display text-xs uppercase">
              Lo que más pesó
            </h3>
            <ul className="m-0 list-disc pl-4 font-body text-xs">
              {l4Comparison.keyDecisions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="cursor-pointer rounded-full border-2 border-[#1557B0] bg-white px-4 py-2 font-body text-xs font-bold text-[#1557B0]"
              >
                Jugar de nuevo
              </button>
              <button
                type="button"
                onClick={() => setL4ShowReport(true)}
                className="cursor-pointer rounded-full bg-av-yellow px-4 py-2 font-body text-xs font-bold text-[#1557B0] shadow"
              >
                Ver mi reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reporte final */}
      {l4Comparison && l4ShowReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-av-blue-deep bg-white p-4 text-av-blue-deep shadow-2xl">
            <p className="m-0 font-display text-xs text-[#0E76A8] uppercase">
              Reporte del nivel 4 · 12:00
            </p>
            <h2 className="mt-1 mb-1 font-display text-base">
              {l4Comparison.won ? "¡Río salvado!" : "El río no alcanzó el 40 %"}
            </h2>
            <p
              className="m-0 text-xl"
              aria-label={`${l4Comparison.stars} de 3 estrellas`}
            >
              {[0, 1, 2]
                .map((i) => (i < l4Comparison.stars ? "★" : "☆"))
                .join(" ")}
            </p>

            <h3 className="mt-3 mb-1 font-display text-xs uppercase">El río</h3>
            <p className="m-0 font-body text-xs">
              Empezó en <strong>{l4Comparison.riverInitial}%</strong> y terminó
              en <strong>{l4Comparison.riverFlow}%</strong>. Tus acciones lo
              subieron <strong>{l4Comparison.riverRecoveredPoints}</strong>{" "}
              puntos; el tiempo y las penalizaciones le quitaron{" "}
              <strong>
                {(
                  l4Comparison.riverLostByTime +
                  l4Comparison.riverLostByPenalties
                ).toFixed(1)}
              </strong>
              .
            </p>

            <h3 className="mt-3 mb-1 font-display text-xs uppercase">Litros</h3>
            <ul className="m-0 list-disc pl-4 font-body text-xs">
              <li>
                Tu estimación: <strong>{l4Comparison.estimatedLitros} L</strong>
                . En la cuadra se perdían{" "}
                <strong>{l4Comparison.totalLitros} L</strong>.
              </li>
              <li>
                Problemas que encontraste: {l4Comparison.identifiedLitros} L
              </li>
              <li>Problemas que solucionaste: {l4Comparison.solvedLitros} L</li>
              <li>
                Problemas que quedaron pendientes: {l4Comparison.pendingLitros}{" "}
                L
              </li>
              <li>
                Ahorro real: <strong>{l4Comparison.savedLitros} L</strong>{" "}
                (cuenta solo lo que se evitó hasta las 12:00)
              </li>
            </ul>

            <h3 className="mt-3 mb-1 font-display text-xs uppercase">
              Las viviendas
            </h3>
            <ul className="m-0 list-none space-y-1 p-0 font-body text-xs">
              {l4Comparison.housesStatus.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{h.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                      HOUSE_STATUS[h.status].cls
                    }`}
                  >
                    {HOUSE_STATUS[h.status].text}
                  </span>
                </li>
              ))}
            </ul>

            <h3 className="mt-3 mb-1 font-display text-xs uppercase">
              Recursos y tiempo
            </h3>
            <ul className="m-0 list-disc pl-4 font-body text-xs">
              <li>
                Detector: usaste {l4Comparison.usedDetectorCharges}, te quedaron{" "}
                {l4Comparison.remainingDetectorCharges}
              </li>
              <li>
                Piezas usadas:{" "}
                {Object.entries(l4Comparison.usedKit)
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => `${KIT_NAMES[k]} ${n}`)
                  .join(", ") || "ninguna"}
              </li>
              <li>
                Caminando: {l4Comparison.walkSecondsSpent}s · Escaneando:{" "}
                {l4Comparison.scanSecondsSpent}s
              </li>
              <li>Medidores revisados: {l4Comparison.metersChecked} de 3</li>
            </ul>

            {l4Comparison.keyDecisions.length > 0 && (
              <>
                <h3 className="mt-3 mb-1 font-display text-xs uppercase">
                  Decisiones importantes
                </h3>
                <ul className="m-0 list-disc pl-4 font-body text-xs">
                  {l4Comparison.keyDecisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="mt-4 mb-1 font-display text-xs uppercase">
              Reto de 7 días: elige dos compromisos
            </h3>
            <div className="space-y-1">
              {l4Comparison.challengeOptions.map((opt, i) => {
                const selected = l4Challenges.includes(i);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleChallenge(i)}
                    className={`w-full cursor-pointer rounded-xl border px-3 py-2 text-left font-body text-xs ${
                      selected
                        ? "border-[#1557B0] bg-av-yellow/40 font-bold"
                        : "border-av-blue-deep/25 bg-white"
                    }`}
                  >
                    {selected ? "✔ " : ""}
                    {opt}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 mb-0 font-body text-xs font-bold">
              {l4Comparison.finalMessage}
            </p>

            <div className="mt-3 flex justify-end gap-2">
              {!l4Comparison.won && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="cursor-pointer rounded-full border-2 border-[#1557B0] bg-white px-4 py-2 font-body text-xs font-bold text-[#1557B0]"
                >
                  Jugar de nuevo
                </button>
              )}
              <button
                type="button"
                disabled={l4Challenges.length < 2}
                onClick={() => setScreen("MAP")}
                className="cursor-pointer rounded-full bg-av-yellow px-4 py-2 font-body text-xs font-bold text-[#1557B0] shadow disabled:cursor-not-allowed disabled:opacity-50"
              >
                {l4Challenges.length < 2
                  ? `Elige ${2 - l4Challenges.length} más`
                  : "Volver al mapa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {l1EstimateOpen && nivelActual === 1 && (
        <EstimateModal
          initialValue={estimacionJugador}
          onConfirm={handleL1Estimate}
        />
      )}

      <RepairKitModal />
    </div>
  );
}
