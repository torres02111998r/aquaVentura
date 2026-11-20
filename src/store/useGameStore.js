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
  'LEVEL_SELECT',
  'PLAYING',
  'VICTORY',
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

      ...initialProgress,

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
      resetProgress: () => set({ ...initialProgress, estrellasPorNivel: [...initialProgress.estrellasPorNivel], nivelesAbiertos: [...initialProgress.nivelesAbiertos] }),
    }),
    {
      name: 'aquaventura-progress',
      version: 1,
      /**
       * Only aggregated progress is persisted. The in-progress match state
       * (tanque, factura, caudalRio, horaSimulada, cargasDetector, piezasKit,
       * objetos, tareas) lives outside persistence on purpose.
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
