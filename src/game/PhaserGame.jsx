import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import Level1Scene from '../game/scenes/Level1Scene';
import Level2Scene from '../game/scenes/Level2Scene';
import { EventBus } from '../game/EventBus';
import { TATO_LINES } from '../game/data/level1Data';
import { useGameStore } from '../store/useGameStore';
import RepairKitModal from '../components/modals/RepairKitModal';

/**
 * Mounts the Phaser canvas inside the game frame and mirrors the scene state
 * into the store. The comic strip on top carries the short Tato / Luz lines.
 */
export default function PhaserGame() {
  const parentRef = useRef(null);
  const gameRef = useRef(null);
  const patchGame = useGameStore((state) => state.patchGame);
  const setScreen = useGameStore((state) => state.setScreen);
  const nivelActual = useGameStore((state) => state.nivelActual);

  const [message, setMessage] = useState({ speaker: 'Tato', text: TATO_LINES.intro });

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return undefined;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 960,
      height: 540,
      backgroundColor: '#0b2a4a',
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 900 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: nivelActual === 2
    ? [Level2Scene]
    : [Level1Scene],
    });

    gameRef.current = game;

    const onMessage = (payload) => setMessage(payload);
    const onState = (payload) =>
      patchGame({
        perdidaDiaria: payload.perdidaDiaria,
        cargasDetector: payload.cargasDetector,
        detectorActive: payload.detectorActive,
      });
    const onComplete = () => setScreen('LEVEL_SUMMARY');
    const onExit = () => setScreen('MAP');

    EventBus.on('game:message', onMessage);
    EventBus.on('game:state', onState);
    EventBus.on('game:complete', onComplete);
    EventBus.on('game:exit', onExit);

    return () => {
      EventBus.off('game:message', onMessage);
      EventBus.off('game:state', onState);
      EventBus.off('game:complete', onComplete);
      EventBus.off('game:exit', onExit);
      game.destroy(true);
      gameRef.current = null;
    };
  }, [patchGame, setScreen]);

  return (
    <div className="flex h-full w-full flex-col bg-[#0b2a4a]">
      <div className="flex shrink-0 items-start gap-2 px-3 pt-2 pb-1">
        <span className="mt-1 shrink-0 rounded-full bg-av-yellow px-2 py-0.5 font-display text-[0.58rem] tracking-[0.06em] text-[#1557B0] uppercase">
          {message.speaker}
        </span>
        <p className="m-0 min-h-[2.1rem] flex-1 rounded-xl rounded-tl-sm bg-white px-3 py-1.5 font-body text-[0.72rem] leading-snug text-av-blue-deep shadow-[0_6px_16px_rgba(0,20,60,0.28)]">
          {message.text}
        </p>
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-hidden" />

      <RepairKitModal />
    </div>
  );
}
