import { useEffect, useState } from 'react';
import { Wrench, X } from 'lucide-react';
import { EventBus } from '../../game/EventBus';
import { FALSE_ALARM, KIT_PIECES, LEAKS, TATO_LINES } from '../../game/data/level1Data';
import { useGameStore } from '../../store/useGameStore';

/**
 * Repair kit. React decides whether the chosen piece is right, updates the
 * inventory and tells the scene the outcome. The scene only plays the result.
 */
export default function RepairKitModal() {
  const [request, setRequest] = useState(null);
  const [hint, setHint] = useState('');

  const piezasKit = useGameStore((state) => state.piezasKit);
  const consumePiece = useGameStore((state) => state.consumePiece);
  const addPuntos = useGameStore((state) => state.addPuntos);

  useEffect(() => {
    const onRequest = (payload) => {
      setRequest(payload);
      setHint('');
    };

    EventBus.on('game:request-repair', onRequest);
    return () => EventBus.off('game:request-repair', onRequest);
  }, []);

  useEffect(() => {
    if (!request) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      EventBus.emit('game:repair-result', {
        objectId: request.objectId,
        success: false,
        cancel: true,
      });
      setRequest(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [request]);

  if (!request) return null;

  const closeModal = () => {
    EventBus.emit('game:repair-result', {
      objectId: request.objectId,
      success: false,
      cancel: true,
    });
    setRequest(null);
  };

  const handlePick = (pieceId) => {
    if ((piezasKit[pieceId] ?? 0) <= 0) {
      setHint(TATO_LINES.noStock);
      return;
    }

    const leak = LEAKS.find((item) => item.id === request.objectId) ?? null;
    const isRealLeak = request.kind === 'leak' && Boolean(leak);
    const isCorrect = isRealLeak && leak.piezaCorrecta === pieceId;

    if (isCorrect) {
      consumePiece(pieceId, false);
      addPuntos(20);
      EventBus.emit('game:repair-result', {
        objectId: request.objectId,
        success: true,
        pieceId,
      });
      EventBus.emit('game:message', {
        speaker: 'Tato',
        text: 'Bien. Esa fuga quedó sellada.',
      });
      setRequest(null);
      return;
    }

    consumePiece(pieceId, true);
    EventBus.emit('game:repair-result', {
      objectId: request.objectId,
      success: false,
      pieceId,
    });

    if (isRealLeak) setHint(leak.hint);
    else if (request.kind === 'false') setHint(FALSE_ALARM.hint);
    else setHint(TATO_LINES.wrongPiece);
  };

  const handleExit = () => {
    EventBus.emit('game:repair-result', {
      objectId: request.objectId,
      success: false,
      cancel: true,
    });
    EventBus.emit('game:exit');
    setRequest(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#03142b]/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repair-kit-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#0E76A8] text-white">
              <Wrench className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="repair-kit-title"
                className="m-0 font-display text-[0.95rem] text-av-blue-deep uppercase"
              >
                Kit de reparación
              </h2>
              <p className="m-0 font-body text-[0.65rem] tracking-[0.08em] text-av-blue-deep/60 uppercase">
                {request.label}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="grid size-7 cursor-pointer place-items-center rounded-full text-av-blue-deep/50 transition-colors hover:bg-av-blue-deep/10 hover:text-av-blue-deep focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow"
            onClick={closeModal}
            aria-label="Cerrar el kit"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {KIT_PIECES.map((piece) => {
            const stock = piezasKit[piece.id] ?? 0;
            const empty = stock <= 0;

            return (
              <button
                key={piece.id}
                type="button"
                disabled={empty}
                onClick={() => handlePick(piece.id)}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow ${
                  empty
                    ? 'cursor-not-allowed bg-av-blue/5 text-av-blue-deep/35'
                    : 'cursor-pointer bg-av-blue/10 text-av-blue-deep hover:bg-av-blue/20'
                }`}
              >
                <span className="font-body text-[0.75rem] font-semibold">{piece.name}</span>
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full font-body text-[0.65rem] font-bold ${
                    empty ? 'bg-av-blue-deep/10' : 'bg-av-blue-deep text-av-yellow'
                  }`}
                >
                  {stock}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 min-h-[3.2rem] rounded-xl bg-av-blue/10 px-3 py-2">
          <p className="m-0 font-body text-[0.58rem] font-bold tracking-[0.14em] text-[#0E76A8] uppercase">
            Tato
          </p>
          <p className="mt-0.5 mb-0 font-body text-[0.72rem] leading-snug text-av-blue-deep">
            {hint || 'Elige la pieza correcta. Una pieza mal puesta se pierde.'}
          </p>
        </div>

        <button
          type="button"
          className="mt-3 cursor-pointer font-body text-[0.66rem] font-semibold text-av-blue-deep/50 underline underline-offset-2 transition-colors hover:text-av-blue-deep focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-av-yellow"
          onClick={handleExit}
        >
          Salir al mapa
        </button>
      </div>
    </div>
  );
}
