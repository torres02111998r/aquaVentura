export const LEVEL4 = {
  id: 4,
  name: "La cuadra",
  missionText: "Salva el río antes del mediodía",
  world: { width: 960, height: 540, floorY: 455 },

  // Tiempo simulado (minutos desde las 00:00)
  horaInicioMin: 8 * 60, // 08:00 (480)
  horaAlertaRojaMin: 11 * 60 + 30, // 11:30 (690)
  horaImprevistoMin: 10 * 60, // 10:00 (600)
  horaCorteMin: 12 * 60, // 12:00 (720)
  msPorHoraSimulada: 60000, // 1 minuto real por hora simulada (4 min total)

  // Tiempos reales (segundos)
  decisionWindowSeconds: 10,
  walkSecondsBetweenHouses: 3, // Tiempo que tarda el jugador en caminar entre casas (para que no pueda entrar y salir de una casa sin esperar)
  scanSeconds: 10,

  // Río
  rioInicial: 50,
  umbralDerrota: 40, // 40 o menos = derrota
  umbralDosEstrellas: 70, // más de 70 = 2 estrellas
  umbralTresEstrellas: 85, // más de 85 = 3 estrellas

  // Pérdidas (puntos por minuto simulado). El crítico REEMPLAZA al normal.
  drainNormalPerMin: 0.05, // 5% por minuto simulado
  drainCriticoPerMin: 0.09, // 9% por minuto simulado
  penaltyNoDecision: 4,
  penaltyIncident: 5,

  // Recuperaciones
  gainRepair: 9,
  gainHabit: 5,
  gainTap: 8,

  // Recursos
  cargasDetector: 2,
  piezasKit: {
    empaque: 2,
    flotador: 2,
    cinta: 1,
    abrazadera: 0,
  },

  // Litros del imprevisto de las 10:00 (fuga nueva o rebose nuevo)
  incidentLitros: 20,

  // Ya no lo usa la escena (el ahorro ahora depende del tiempo restante)
  referenciaCasaOrtizLitros: 80,

  retoSieteDiasOpciones: [
    "Probar con el medidor, con todas las llaves cerradas, que la casa no tiene fugas.",
    "Usar cubeta en lugar de manguera para lavar el carro, la moto o el piso.",
    "Reutilizar el agua de la lavadora.",
    "Acortar la ducha un minuto.",
  ],
  mensajeFinal:
    "Cada gota cuenta. Lo que ahorras en casa también ayuda al río.",
};

// Nombres para mostrar en el reporte (recursos agotados)
export const PIEZA_NOMBRES = {
  empaque: "Empaques",
  flotador: "Flotadores",
  cinta: "Cinta sellante",
  abrazadera: "Abrazaderas",
};

/*
  kind:
    "leak" | "overflow" -> reparación, consume la pieza de piezaCorrecta
    "tap"               -> cierre de llave o manguera, no consume piezas
    "habit"             -> cambio de hábito, no consume piezas
  requiereEscaneo: true -> aparece como "Punto sospechoso" hasta escanearlo
  accion: texto que sale en el prompt de la tecla E
  incidentX / incidentY: dónde aparece el imprevisto de las 10:00 en esa casa
*/
export const LEVEL4_HOUSES = [
  {
    id: "valentina",
    name: "Apartamento de Valentina",
    subtitle: "Ducha larga y sanitario con goteo",
    style: "apartment",
    x: 195,
    width: 210,
    wallColor: 0xeaf1fb,
    trimColor: 0x1e3a8a,
    roofColor: 0x2f6fb5,
    needleSpeed: "media",
    needleIntensity: 0.55,
    incidentX: 500,
    incidentY: 402,
    objects: [
      {
        id: "val_sanitario",
        label: "Sanitario con goteo",
        accion: "Instalar empaque",
        x: 340,
        y: 405,
        kind: "leak",
        litros: 25,
        piezaCorrecta: "empaque",
        requiereEscaneo: true,
      },
      {
        id: "val_ducha",
        label: "Temporizador de ducha",
        accion: "Activar temporizador",
        x: 640,
        y: 365,
        kind: "habit",
        litros: 20,
      },
    ],
  },
  {
    id: "efrain",
    name: "Casa de Don Efraín",
    subtitle: "Manguera abierta, lavado de moto y tanque elevado",
    style: "patio",
    x: 480,
    width: 210,
    wallColor: 0xf7ead6,
    trimColor: 0x5a3b22,
    roofColor: 0xc97b4a,
    needleSpeed: "rapida",
    needleIntensity: 0.9,
    incidentX: 595,
    incidentY: 402,
    objects: [
      {
        id: "efr_manguera",
        label: "Llave de manguera abierta",
        accion: "Cerrar la manguera",
        x: 300,
        y: 400,
        kind: "tap",
        litros: 35,
      },
      {
        id: "efr_moto",
        label: "Lavar moto con cubeta",
        accion: "Usar la cubeta",
        x: 495,
        y: 402,
        kind: "habit",
        litros: 15,
      },
      {
        id: "efr_tanque",
        label: "Rebose de tanque elevado",
        accion: "Instalar flotador",
        x: 690,
        y: 380,
        kind: "overflow",
        litros: 30,
        piezaCorrecta: "flotador",
        requiereEscaneo: true,
      },
    ],
  },
  {
    id: "ortiz",
    name: "Casa Ortiz",
    subtitle: "Mateo reabrió una llave",
    style: "cottage",
    x: 765,
    width: 210,
    wallColor: 0xe6f0f7,
    trimColor: 0x1557b0,
    roofColor: 0x1d70b8,
    needleSpeed: "lenta",
    needleIntensity: 0.25,
    incidentX: 700,
    incidentY: 402,
    objects: [
      {
        id: "ort_llave",
        label: "Llave reabierta por Mateo",
        accion: "Instalar empaque",
        x: 480,
        y: 398,
        kind: "leak", // el diseño lo pide como reparación con empaque
        litros: 15,
        piezaCorrecta: "empaque",
      },
    ],
  },
];

export const LEVEL4_LINES = {
  estimatePrompt: "¿Cuántos litros se pierden hoy en la cuadra?",
  afterEstimate:
    "Revisa los medidores antes de que se acabe el tiempo del ritmo (pulsa E frente a cada uno) y entra a la casa que más pierde. ¡Tú puedes!",
  checkMeters: "Mira antes de entrar.",
  actOnHouse: "El río baja si no actúas",
  meterChecked: (name, speed, litros, puntos) =>
    `Medidor de ${name}: aguja ${String(speed).toLowerCase()}. Aquí se pierden ${litros} L en ${puntos} ${puntos === 1 ? "punto" : "puntos"}.`,
  allMetersChecked: (total, top) =>
    `Revisaste los tres medidores: en la cuadra se pierden unos ${total} L. La que más pierde es ${top}. ¡Entra ahí!`,
  decisionCritical:
    "¡Se acabaron los 10 segundos! El ritmo ahora es crítico (-6% río).",
  enterHouse: (name) =>
    `Entraste a ${name}. Acércate a cada objeto y pulsa E. Si ves un punto sospechoso, pulsa X para escanearlo.`,
  scanDone: (obj) =>
    obj.piezaCorrecta
      ? `Encontraste "${obj.label}". Acércate, pulsa E y repáralo. Necesitas: ${obj.piezaCorrecta}.`
      : `Encontraste "${obj.label}". Acércate y pulsa E para atenderlo.`,
  houseDone: (name, next) =>
    next
      ? `¡${name} lista! Sal por la puerta con E y ve a ${next}. Ojo: caminar cuesta tiempo.`
      : `¡${name} lista! Sal por la puerta con E. Si aparece algo nuevo, vuelve a arreglarlo antes de las 12:00.`,
  exitHouse:
    "Volviste a la calle. Mira el objetivo de arriba para saber a dónde ir.",
  incidentAtTen:
    "¡Son las 10:00! Algo cambió en una casa que parecía resuelta.",
  incidentHelp: (name, pieza) =>
    `¡Son las 10:00! Algo cambió en ${name}. Vuelve y repáralo con ${pieza === "cinta" ? "cinta sellante" : "un flotador"}.`,
  lastThirty:
    "Quedan 30 minutos simulados. Arregla primero lo que más litros pierde.",
  noonEnd: "Llegó el corte.",
};
