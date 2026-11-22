import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Screens that can be rendered by the React layer.
 * Phaser never drives navigation directly: it emits events on the EventBus and
 * the UI reacts by calling setScreen.
 */
export const SCREENS = [
  'HOME',
  'INTRO',
  'INSTRUCTIONS',
  'CAST',
  'MAP',
  'BRIEFING',
  'PLAYING',
  'LEVEL_SUMMARY',
  'GAME_OVER',
];

/** Number of levels in the game (GDD section 5). */
export const TOTAL_LEVELS = 4;

/** Progress defaults. Only these fields survive a reload (see partialize). */
const initialProgress = {
  /** Whether each level can be played. Level 1 is always open. */
  nivelesAbiertos: [true, false, false, false],
  /** Best star result per level, 0 to 3. */
  estrellasPorNivel: [0, 0, 0, 0],
  /** Accumulated awareness points. */
  puntos: 0,
  /** Badges earned, e.g. "Ojo de lince". */
  insignias: [],
  /** Ids of the two commitments chosen in the 7-day challenge. */
  reto7Dias: [],
};

/**
 * Level 1 opening state, straight from the GDD data dictionary:
 * tanque 560 L, fuga total 80 L/day, 3 detector charges.
 * This is match state: it is never persisted.
 */
export const LEVEL_1_STATE = {
  tanque: 560,
  factura: 45000,
  caudalRio: 50,
  perdidaDiaria: 80,
  cargasDetector: 3,
  piezasKit: { empaque: 2, flotador: 2, cinta: 2, abrazadera: 1 },
  /** Pieces wasted on wrong repairs. Blocks the third star. */
  piezasPerdidas: 0,
  estimacionJugador: 50,
  missionText: 'Encuentra por qué la aguja no se detiene',
  tatoMessage: '',
  detectorActive: false,
};

const cloneLevelState = () => ({
  ...LEVEL_1_STATE,
  piezasKit: { ...LEVEL_1_STATE.piezasKit },
});

const clampLevel = (nivel) => Math.min(Math.max(Math.trunc(nivel), 1), TOTAL_LEVELS);

export const useGameStore = create(
  persist(
    (set, get) => ({
      /** Navigation state. Not persisted: every session starts at the home screen. */
      currentScreen: 'HOME',

      setScreen: (screen) => {
        if (!SCREENS.includes(screen)) {
          console.warn(`[useGameStore] Unknown screen "${screen}".`);
          return;
        }
        set({ currentScreen: screen });
      },

      nivelActual: 1,

      setNivelActual: (nivel) => {
        set({ nivelActual: clampLevel(nivel) });
      },

      /** Inspector identity, captured in the cast screen. */
      inspectorName: '',
      setInspectorName: (name) => set({ inspectorName: String(name ?? '').trim() }),

      ...initialProgress,

      ...cloneLevelState(),

      /** Merges a partial update into the level state. */
      patchGame: (partial) => set(partial),

      /** Slider value from the briefing screen, 0 to 200 L/day. */
      setEstimacionJugador: (litros) => {
        const valor = Number(litros);
        if (!Number.isFinite(valor)) return;
        set({ estimacionJugador: Math.min(Math.max(Math.round(valor), 0), 200) });
      },

      /** Restores the level 1 opening state (used on retry). */
      resetLevel: () => set(cloneLevelState()),

      /**
       * Prepares a fresh run but keeps the estimation the player just chose in
       * the briefing screen.
       */
      startLevel: () =>
        set((state) => ({
          ...cloneLevelState(),
          estimacionJugador: state.estimacionJugador,
        })),

      /**
       * Removes one piece from the kit. `wrong` marks it as wasted, which is what
       * costs the third star.
       */
      consumePiece: (pieceId, wrong = false) => {
        const piezasKit = { ...get().piezasKit };
        if ((piezasKit[pieceId] ?? 0) <= 0) return false;
        piezasKit[pieceId] -= 1;
        set({
          piezasKit,
          piezasPerdidas: get().piezasPerdidas + (wrong ? 1 : 0),
        });
        return true;
      },

      /** Opens a level (1-based) so it can be picked from the level map. */
      unlockLevel: (nivel) => {
        const index = clampLevel(nivel) - 1;
        const nivelesAbiertos = [...get().nivelesAbiertos];
        nivelesAbiertos[index] = true;
        set({ nivelesAbiertos });
      },

      /** Stores the best star result for a level, never downgrading it. */
      setEstrellas: (nivel, estrellas) => {
        const index = clampLevel(nivel) - 1;
        const mejor = Math.min(Math.max(Math.trunc(estrellas), 0), 3);
        const estrellasPorNivel = [...get().estrellasPorNivel];
        estrellasPorNivel[index] = Math.max(estrellasPorNivel[index] ?? 0, mejor);
        set({ estrellasPorNivel });
      },

      /** Adds awareness points (+10 detect, +20 repair, +15 estimate, +5 decision). */
      addPuntos: (cantidad) => {
        const delta = Number.isFinite(cantidad) ? Math.trunc(cantidad) : 0;
        set({ puntos: Math.max(0, get().puntos + delta) });
      },

      /** Grants a badge once. Repeated calls with the same name are ignored. */
      addInsignia: (nombre) => {
        if (!nombre || get().insignias.includes(nombre)) return;
        set({ insignias: [...get().insignias, nombre] });
      },

      /** Saves the 7-day challenge commitments (at most two). */
      setReto7Dias: (compromisos) => {
        set({ reto7Dias: [...compromisos].slice(0, 2) });
      },

      /** Clears persisted progress but keeps the current screen. */
      resetProgress: () =>
        set({
          ...initialProgress,
          estrellasPorNivel: [...initialProgress.estrellasPorNivel],
          nivelesAbiertos: [...initialProgress.nivelesAbiertos],
        }),
    }),
    {
      name: 'aquaventura-progress',
      version: 1,
      /**
       * Only aggregated progress is persisted. The in-progress match state
       * (tanque, factura, caudalRio, perdidaDiaria, cargasDetector, piezasKit,
       * estimacionJugador, missionText) lives outside persistence on purpose.
       */
      partialize: (state) => ({
        nivelesAbiertos: state.nivelesAbiertos,
        estrellasPorNivel: state.estrellasPorNivel,
        puntos: state.puntos,
        insignias: state.insignias,
        reto7Dias: state.reto7Dias,
      }),
      /** Tolerates shape changes between iterations. */
      migrate: (persistedState, version) => {
        if (version === 0) {
          return { ...initialProgress, ...persistedState };
        }
        return persistedState ?? {};
      },
    },
  ),
);
