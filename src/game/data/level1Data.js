/**
 * Level 1 data: "La casa Ortiz" (GDD section 5.2).
 *
 * Layout: a two-floor doll-house cross-section seen from the side.
 *   - Exterior (left): street, facade and the water meter.
 *   - Ground floor: lobby + kitchen.
 *   - Upper floor: washbasin, toilet and shower.
 * A functional staircase with a handrail joins both floors.
 */

export const LEVEL1 = {
  id: 1,
  name: 'La casa Ortiz',
  missionText: 'Entra a la casa Ortiz y saluda a Luz',
  world: { width: 960, height: 540, floorY: 476 },
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

/**
 * Geometry of the cross-section. Everything the scene draws is derived from
 * these numbers so the house stays coherent.
 */
export const LAYOUT = {
  world: { width: 960, height: 540 },
  roof: { x1: 248, x2: 968, ridgeX: 608, ridgeY: 8, eaveY: 116 },
  house: { x: 270, width: 690 },
  exterior: { x: 0, width: 270 },
  streetY: 476,
  upper: { wallTop: 116, floorY: 300, height: 184 },
  lower: { wallTop: 322, floorY: 476, height: 154 },
  slab: { y: 300, height: 22 },
  stairs: {
    x1: 318,
    x2: 452,
    baseX: 330,
    topX: 440,
    baseY: 476,
    topY: 300,
    steps: 9,
  },
  rooms: {
    recibidor: { x1: 270, x2: 470, floor: 'ground', label: 'Recibidor' },
    cocina: { x1: 470, x2: 960, floor: 'ground', label: 'Cocina' },
    lavamanos: { x1: 270, x2: 480, floor: 'upper', label: 'Lavamanos' },
    inodoro: { x1: 480, x2: 720, floor: 'upper', label: 'Inodoro' },
    ducha: { x1: 720, x2: 960, floor: 'upper', label: 'Ducha' },
  },
  meter: { x: 124, y: 430 },
  luz: { x: 318, y: 476 },
  door: { x: 270, y: 392, width: 26, height: 84 },
  playerStart: { x: 70, y: 476 },
};

/** Furniture images shipped in `public/assets/furniture`. */
export const FURNITURE = [
  {
    key: 'f_cocina',
    path: '/assets/furniture/cocina.png',
    room: 'cocina',
    x: 716,
    baseY: 476,
    height: 158,
  },
  {
    key: 'f_lavamanos',
    path: '/assets/furniture/lavamanos.png',
    room: 'lavamanos',
    x: 330,
    baseY: 300,
    height: 112,
  },
  {
    key: 'f_inodoro',
    path: '/assets/furniture/inodoro.png',
    room: 'inodoro',
    x: 590,
    baseY: 300,
    height: 104,
  },
  {
    key: 'f_ducha',
    path: '/assets/furniture/ducha.png',
    room: 'ducha',
    x: 846,
    baseY: 300,
    height: 132,
  },
];

/**
 * Interactable fixtures. A fixture can have an open tap and/or a hidden leak;
 * the scene resolves the action order (close the tap first, then repair).
 */
export const FIXTURES = [
  {
    id: 'cocina',
    objectId: 'llave_cocina',
    kind: 'leak',
    label: 'Llave de la cocina',
    room: 'cocina',
    floor: 'ground',
    x: 690,
    y: 392,
    floorY: 476,
    hasTap: true,
    hasLeak: true,
    perdidaDia: 15,
    piezaCorrecta: 'empaque',
    hint: 'El empaque sella la llave. Eso es lo que gotea.',
    puddle: { x: 690, y: 470, w: 104, h: 15 },
    drip: { x: 690, y: 402 },
    marker: { x: 690, y: 404 },
  },
  {
    id: 'lavamanos',
    objectId: 'lavamanos_mojado',
    kind: 'false',
    label: 'Lavamanos',
    room: 'lavamanos',
    floor: 'upper',
    x: 340,
    y: 250,
    floorY: 300,
    hasTap: true,
    hasLeak: false,
    falseAlarm: true,
    alwaysWet: true,
    hint: 'Ese lavamanos solo está mojado. Confirma antes de reparar.',
    puddle: { x: 340, y: 296, w: 86, h: 12 },
    drip: { x: 340, y: 262 },
  },
  {
    id: 'sanitario',
    objectId: 'sanitario',
    kind: 'leak',
    label: 'Sanitario',
    room: 'inodoro',
    floor: 'upper',
    x: 590,
    y: 252,
    floorY: 300,
    hasTap: false,
    hasLeak: true,
    silent: true,
    perdidaDia: 40,
    piezaCorrecta: 'flotador',
    hint: 'El flotador es lo que corta el agua del sanitario.',
    puddle: { x: 590, y: 296, w: 76, h: 12 },
    drip: { x: 590, y: 266 },
    marker: { x: 590, y: 258 },
  },
  {
    id: 'ducha',
    objectId: 'ducha',
    kind: 'leak',
    label: 'Ducha, unión de la tubería',
    room: 'ducha',
    floor: 'upper',
    x: 846,
    y: 246,
    floorY: 300,
    hasTap: true,
    hasLeak: true,
    perdidaDia: 25,
    piezaCorrecta: 'cinta',
    hint: 'La unión de la ducha pide cinta sellante.',
    puddle: { x: 846, y: 296, w: 96, h: 12 },
    drip: { x: 846, y: 256 },
    marker: { x: 846, y: 252 },
  },
];

/**
 * Real leaks, kept in the flat shape the repair modal already consumes.
 * Ids must match the `objectId` sent by the scene.
 */
export const LEAKS = FIXTURES.filter((fixture) => fixture.hasLeak).map(
  (fixture) => ({
    id: fixture.objectId,
    label: fixture.label,
    room: fixture.room,
    x: fixture.x,
    y: fixture.y,
    perdidaDia: fixture.perdidaDia,
    piezaCorrecta: fixture.piezaCorrecta,
    hint: fixture.hint,
  }),
);

/**
 * False alarm: the washbasin is wet because Mateo just used it, but it does not
 * leak. Trying to repair it wastes a piece (GDD 5.2).
 */
export const FALSE_ALARM = {
  id: 'lavamanos_mojado',
  label: 'Lavamanos',
  room: 'lavamanos',
  floor: 'upper',
  x: 340,
  y: 250,
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
  intro: 'Casa Ortiz, al final de la calle. Entra y saluda a Luz.',
  estimate: 'Antes de tocar nada, dime cuánta agua crees que se pierde acá.',
  afterEstimate: 'Cierra las tres llaves y mira el medidor.',
  tapsClosed: 'Bien. Ahora el medidor debería frenar.',
  meterStill: 'Con todo cerrado no debería moverse. Prueba el detector.',
  meterOutside: 'La aguja sigue girando. Algo se escapa adentro.',
  meterNeedsTaps: 'Cierra las tres llaves antes de probar el medidor.',
  needEstimate: 'Primero confirma la estimación con Luz.',
  detectorEmpty: 'No quedan cargas del detector.',
  detectorOn: 'Las fugas laten en turquesa. Solo las reales.',
  detectorClear: 'No quedan fugas por revelar.',
  wrongPiece: 'Esa pieza no va ahí. Mira otra vez el goteo.',
  noStock: 'No te quedan piezas de esas en el kit.',
  falseAlarm: 'Ese lavamanos solo está mojado. No hay fuga.',
  mateo: 'Mateo abrió la llave otra vez. ¡Vuelve!',
  allRepaired: 'Se detuvo. La aguja por fin se quedó quieta.',
  goMeter: 'Todo reparado. Vuelve al medidor de afuera.',
  failed: 'Se agotaron las herramientas y aún quedan fugas. Misión incompleta.',
};

export const LUZ_LINES = {
  intro: '¡Aquí no se desperdicia nada!',
  estimate: '¿Cuánta agua crees que se pierde en un día?',
  afterRepair: '¿Tanta agua se nos iba?',
  afterMateo: '¡Mateo! ¡Otra vez la llave!',
};

export const MATEO_LINES = {
  shower: 'Fui a lavarme las manos y dejé la llave de la ducha abierta.',
};

export const FUNDACION_AQUAE_DATO =
  'Un grifo que gotea puede perder hasta 15 litros al día (Fundación Aquae, 2021).';
