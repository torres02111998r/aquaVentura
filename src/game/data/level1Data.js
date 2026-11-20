/**
 * Level 1 data: "La casa Ortiz" (GDD section 5.2).
 *
 * Layout: a doll-house cross-section seen from the side. The exterior holds the
 * water meter; then four rooms follow: kitchen, washbasin, toilet and shower.
 */

export const LEVEL1 = {
  id: 1,
  name: 'La casa Ortiz',
  missionText: 'Encuentra por qué la aguja no se detiene',
  world: { width: 960, height: 540, floorY: 470 },
  /** Total leak loss of the level, in L/day. */
  totalLeakPerDay: 80,
  /** Real daily loss the player has to guess in the briefing. */
  estimacionReal: 80,
  /** Second-star threshold: loss must end below this (GDD 5.2). */
  metaEstrella2: 10,
  /** Estimation error allowed for the third star (GDD 6.4). */
  margenEstimacion: 0.15,
  /** Detector charges and their duration. */
  detectorCharges: 3,
  detectorDurationMs: 10000,
  /** Visual acceleration the open taps add to the needle. */
  openTapMeterBoost: 8,
};

/** Rooms are laid out left to right and share the same floor line. */
export const ROOMS = [
  { id: 'exterior', name: 'Exterior', x: 0, width: 170, wall: 0x7fb2f5 },
  { id: 'cocina', name: 'Cocina', x: 170, width: 197, wall: 0xf7ead6 },
  { id: 'lavamanos', name: 'Lavamanos', x: 367, width: 197, wall: 0xeaf1fb },
  { id: 'inodoro', name: 'Inodoro', x: 564, width: 197, wall: 0xe6f0f7 },
  { id: 'ducha', name: 'Ducha', x: 761, width: 199, wall: 0xe8f4fb },
];

/**
 * Taps left open at the start. Closing them is mission 3 of the level; they do
 * not leak, they just keep the needle moving.
 */
export const TAPS = [
  {
    id: 'llave_lavaplatos',
    label: 'Llave del lavaplatos',
    room: 'cocina',
    x: 318,
    y: 404,
    open: true,
  },
  {
    id: 'llave_lavamanos',
    label: 'Llave del lavamanos',
    room: 'lavamanos',
    x: 432,
    y: 392,
    open: true,
  },
  {
    id: 'llave_ducha',
    label: 'Llave de la ducha',
    room: 'ducha',
    x: 828,
    y: 348,
    open: true,
  },
];

/** The three real leaks. Only these pulse in detector mode. */
export const LEAKS = [
  {
    id: 'llave_cocina',
    label: 'Llave de la cocina',
    room: 'cocina',
    x: 236,
    y: 396,
    perdidaDia: 15,
    piezaCorrecta: 'empaque',
    hint: 'El empaque sella la llave. Eso es lo que gotea.',
  },
  {
    id: 'sanitario',
    label: 'Sanitario',
    room: 'inodoro',
    x: 656,
    y: 414,
    perdidaDia: 40,
    piezaCorrecta: 'flotador',
    hint: 'El flotador es lo que corta el agua del sanitario.',
  },
  {
    id: 'ducha',
    label: 'Ducha, unión de la tubería',
    room: 'ducha',
    x: 902,
    y: 366,
    perdidaDia: 25,
    piezaCorrecta: 'cinta',
    hint: 'La unión de la ducha pide cinta sellante.',
  },
];

/**
 * False alarm: the washbasin is wet because Mateo just used it, but it does not
 * leak. Trying to repair it wastes a piece (GDD 5.2).
 */
export const FALSE_ALARM = {
  id: 'lavamanos_mojado',
  label: 'Lavamanos',
  room: 'lavamanos',
  x: 522,
  y: 418,
  hint: 'Ese lavamanos solo está mojado. Confirma antes de reparar.',
};

/** Repair kit (GDD 6.3). Order is the one shown in the modal. */
export const KIT_PIECES = [
  { id: 'empaque', name: 'Empaque' },
  { id: 'flotador', name: 'Flotador' },
  { id: 'cinta', name: 'Cinta sellante' },
  { id: 'abrazadera', name: 'Abrazadera' },
];

export const TATO_LINES = {
  intro: 'Cierra las tres llaves y mira el medidor.',
  tapsClosed: 'Bien. Ahora el medidor debería frenar.',
  meterStill: 'Con todo cerrado no debería moverse. Prueba el detector.',
  detectorEmpty: 'No quedan cargas del detector.',
  detectorOn: 'Las fugas laten en turquesa. Solo las reales.',
  wrongPiece: 'Esa pieza no va ahí. Mira otra vez el goteo.',
  noStock: 'No te quedan piezas de esas en el kit.',
  mateo: 'Mateo abrió la llave otra vez. ¡Vuelve!',
  allRepaired: 'Se detuvo. La aguja por fin se quedó quieta.',
};

export const LUZ_LINES = {
  intro: '¡Aquí no se desperdicia nada!',
  afterRepair: '¿Tanto se nos iba?',
  afterMateo: '¡Mateo! ¡Otra vez la llave!',
};

export const FUNDACION_AQUAE_DATO =
  'Un grifo que gotea puede perder hasta 15 litros al día (Fundación Aquae, 2021).';

/** Flat list used by the scene to build interactables. */
export const LEVEL1_OBJECTS = [
  ...TAPS.map((tap) => ({ ...tap, kind: 'tap' })),
  ...LEAKS.map((leak) => ({ ...leak, kind: 'leak', hasLeak: true })),
  { ...FALSE_ALARM, kind: 'false', hasLeak: false },
];
