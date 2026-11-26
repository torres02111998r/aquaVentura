import Phaser from "phaser";
import { EventBus } from "../EventBus";
import {
  LEVEL4,
  LEVEL4_HOUSES,
  LEVEL4_LINES,
  PIEZA_NOMBRES,
} from "../data/level4Data";

const DOOR_RANGE = 30;
const METER_RANGE = 28;
const OBJ_RANGE = 70;
const EXIT_X = 85;
const BASE_SPEED = 185;
const CRITICAL_SPEED = 215;

const STATUS_STYLE = {
  pending: { label: "PENDIENTE", bg: "#dc2626" },
  partial: { label: "PARCIAL", bg: "#d97706" },
  attended: { label: "ATENDIDA", bg: "#16a34a" },
};

const pad = (n) => String(n).padStart(2, "0");

export default class Level4Scene extends Phaser.Scene {
  constructor() {
    super("Level4Scene");
  }

  create() {
    this.viewMode = "street"; // 'street' | 'house'
    this.activeHouse = null;
    this.lastHouseId = null;

    // Copia de las viviendas: el imprevisto agrega objetos y no debe
    // contaminar los datos originales (ni al reiniciar el nivel).
    this.houses = LEVEL4_HOUSES.map((h) => ({
      ...h,
      objects: h.objects.map((o) => ({ ...o })),
    }));

    this.awaitingEstimate = true;
    this.estimatedLitros = 0;
    this.busy = false; // true mientras se escanea o se recorre la calle
    this.muted = false; //

    // Ventana de decisión inicial
    this.decisionSecondsLeft = LEVEL4.decisionWindowSeconds;
    this.decisionResolved = false;
    this.decisionCritical = false;
    this.decisionEvent = null;

    // Reloj
    this.simMinutes = LEVEL4.horaInicioMin;
    this.clockEvent = null;
    this.alertShown = false;
    this.incidentTriggered = false;
    this.incident = null;
    this.levelEnded = false;

    // Río
    this.riverInitial = LEVEL4.rioInicial;
    this.riverFlow = LEVEL4.rioInicial;
    this.riverGained = 0;
    this.riverLostTime = 0;
    this.riverLostPenalty = 0;
    this.penalties = [];

    // Recursos
    this.detectorCharges = LEVEL4.cargasDetector;
    this.kit = { ...LEVEL4.piezasKit };
    this.initialKit = { ...LEVEL4.piezasKit };
    this.usedKit = { empaque: 0, flotador: 0, cinta: 0, abrazadera: 0 };
    this.usedDetectorCharges = 0;
    this.walkSecondsSpent = 0;
    this.scanSecondsSpent = 0;

    // Registro
    this.attendedIds = new Set();
    this.identifiedIds = new Set();
    this.scannedIds = new Set();
    this.metersChecked = new Set();
    this.intervenedHouses = new Set();
    this.solvedLitros = 0;
    this.savedLitros = 0;
    this.repairs = 0;
    this.habits = 0;
    this.taps = 0;
    this.logEvents = [];

    this.streetGroup = this.add.group();
    this.houseGroup = this.add.group();
    this.streetNeedles = [];
    this.houseInteractables = [];
    this.houseBadges = {};
    this.meterMarks = {};
    this.meterTags = {};

    this.cameras.main.setBackgroundColor("#0b2a4a");
    this.physics.world.setBounds(0, 0, LEVEL4.world.width, LEVEL4.world.height);

    this.buildInspectorTexture();
    this.buildHudStrip();
    this.buildStreetScene();
    this.buildPlayer();
    this.buildInput();
    this.bindEvents();
    this.emitHud(); // Actualiza el hud del nivel 4.

    EventBus.emit("game:message", {
      speaker: "Tato",
      text: LEVEL4_LINES.estimatePrompt,
    });
  }

  /* ---------------------------------------------------------------- eventos */
  bindEvents() {
    this.onEstimateSubmitted = ({ liters = 0 }) => {
      // Si esta escena ya no está viva, ignora el evento
      if (!this.sys || !this.sys.isActive()) return;
      if (!this.awaitingEstimate) return;

      this.estimatedLitros = Math.max(0, Number(liters) || 0);
      this.awaitingEstimate = false;
      this.log(`Estimación inicial: ${this.estimatedLitros} L`);
      this.startDecisionCountdown();
      this.startSimClock();

      this.emitHud(); //Actualiza el hud del nivel 4.

      EventBus.emit("game:message", {
        speaker: "Tato",
        text: LEVEL4_LINES.afterEstimate,
      });
    };

    this.onDetectorRequest = () => {
      if (!this.sys || !this.sys.isActive()) return;
      this.startHouseScan();
    };

    EventBus.on("level4:estimate-submitted", this.onEstimateSubmitted);
    EventBus.on("game:detector-request", this.onDetectorRequest);
    this.onHudRequest = () => this.emitHud();
    EventBus.on("level4:hud-request", this.onHudRequest);

    const cleanup = () => {
      EventBus.off("level4:estimate-submitted", this.onEstimateSubmitted); //
      EventBus.off("game:detector-request", this.onDetectorRequest);
      EventBus.off("level4:hud-request", this.onHudRequest);

      EventBus.emit("level4:hud-end"); //Indica al HUD que ya no se esta en el nivel 4.
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  msg(text) {
    EventBus.emit("game:message", { speaker: "Tato", text });
  }

  updateGuideArrow() {
    // Actualiza la posición de la flecha guía según el estado actual del nivel 4.
    if (!this.guideArrow) return;
    const { floorY } = LEVEL4.world;
    let target = null;

    if (
      this.viewMode === "street" &&
      !this.levelEnded &&
      !this.awaitingEstimate
    ) {
      const nextMeter = this.houses.find((h) => !this.metersChecked.has(h.id));
      if (nextMeter) {
        target = { x: nextMeter.meterX, y: floorY - 108 };
      } else {
        const house =
          this.incident && !this.incident.resolved
            ? this.houses.find((h) => h.id === this.incident.houseId)
            : this.nextPendingHouse();
        if (house) target = { x: house.doorX, y: floorY - 112 };
      }
    }

    if (!target) {
      this.guideArrow.setVisible(false);
      return;
    }
    this.guideArrow.setPosition(target.x, target.y).setVisible(true);
    this.guideBaseY = target.y;
  }

  floatText(x, y, text, color = "#16a34a") {
    // Muestra un texto flotante en la escena, que asciende y desaparece después de un tiempo.
    const t = this.add
      .text(x, y, text, {
        fontFamily: '"Inter", sans-serif',
        fontSize: "18px",
        fontStyle: "bold",
        color,
        stroke: "#ffffff",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(55);
    this.tweens.add({
      targets: t,
      y: y - 50,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  playTone(
    freq,
    dur = 0.12,
    type = "sine",
    vol = 0.1,
    delay = 0,
    slideTo = null,
  ) {
    if (this.muted) return;
    const ctx = this.sound && this.sound.context;
    if (!ctx || this.sound.locked) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  sfx(name) {
    // Sonidos cortos de efectos
    switch (name) {
      case "meter":
        this.playTone(660, 0.08, "square", 0.06);
        this.playTone(880, 0.1, "square", 0.06, 0.08);
        break;
      case "door":
        this.playTone(240, 0.18, "triangle", 0.14, 0, 110);
        break;
      case "scanStart":
        this.playTone(250, 0.6, "sawtooth", 0.05, 0, 900);
        break;
      case "scanEnd":
        this.playTone(880, 0.12, "triangle", 0.12);
        this.playTone(1320, 0.2, "triangle", 0.12, 0.12);
        break;
      case "ok":
        [523, 659, 784].forEach((f, i) =>
          this.playTone(f, 0.14, "triangle", 0.14, i * 0.09),
        );
        break;
      case "error":
        this.playTone(160, 0.25, "sawtooth", 0.1, 0, 90);
        break;
      case "alarm":
        for (let i = 0; i < 4; i++)
          this.playTone(i % 2 ? 600 : 850, 0.15, "square", 0.08, i * 0.17);
        break;
      case "win":
        [523, 659, 784, 1047].forEach((f, i) =>
          this.playTone(f, 0.2, "triangle", 0.16, i * 0.14),
        );
        break;
      case "lose":
        [440, 370, 311, 247].forEach((f, i) =>
          this.playTone(f, 0.28, "sawtooth", 0.1, i * 0.2),
        );
        break;
    }
  }

  housePendingLitros(h) {
    return h.objects
      .filter((o) => !this.attendedIds.has(o.id))
      .reduce((acc, o) => acc + o.litros, 0);
  }

  // Casa con más litros sin atender (opcionalmente excluyendo una)
  nextPendingHouse(excludeId = null) {
    return (
      this.houses
        .filter((h) => h.id !== excludeId && this.housePendingLitros(h) > 0)
        .sort(
          (a, b) => this.housePendingLitros(b) - this.housePendingLitros(a),
        )[0] ?? null
    );
  }

  // Misión actual y su texto para el cajón "Objetivo" de la barra
  getObjective() {
    if (this.levelEnded) {
      return {
        missionIndex: 5,
        objective: "Llegó el corte: mira cómo quedó el río",
      };
    }
    if (this.awaitingEstimate) {
      return {
        missionIndex: 1,
        objective: "Estima cuántos litros se pierden en la cuadra",
      };
    }

    const incidentPending = this.incident && !this.incident.resolved;
    const insideIncidentHouse =
      this.viewMode === "house" &&
      this.activeHouse?.id === this.incident?.houseId;

    if (incidentPending && !insideIncidentHouse) {
      const pieza =
        this.incident.pieza === "cinta" ? "cinta sellante" : "flotador";
      return {
        missionIndex: 4,
        objective: `Imprevisto: vuelve a ${this.incident.houseName} y repara con ${pieza}`,
      };
    }

    if (this.viewMode === "house" && this.activeHouse) {
      const objs = this.activeHouse.objects;
      const done = objs.filter((o) => this.attendedIds.has(o.id)).length;
      const missionIndex = incidentPending ? 4 : 3;
      if (done === objs.length) {
        return {
          missionIndex,
          objective: "Casa lista: sal por la puerta con E",
        };
      }
      return {
        missionIndex,
        objective: `Arregla los problemas de ${this.activeHouse.name} (${done} de ${objs.length})`,
      };
    }

    // En la calle
    if (this.metersChecked.size < this.houses.length) {
      return {
        missionIndex: 2,
        objective: `Revisa los medidores (${this.metersChecked.size} de ${this.houses.length}): párate frente a cada uno y pulsa E`,
      };
    }

    const top = this.nextPendingHouse();
    if (!top) {
      return {
        missionIndex: 3,
        objective: "Todo atendido: espera el corte de las 12:00",
      };
    }
    return {
      missionIndex: 3,
      objective: !this.decisionResolved
        ? `Entra a ${top.name}: es la que más pierde`
        : `Ve a ${top.name} (${this.housePendingLitros(top)} L sin atender)`,
    };
  }

  emitHud() {
    const status = this.sys && this.sys.settings && this.sys.settings.status;
    if (
      status === undefined ||
      status < Phaser.Scenes.CREATING ||
      status >= Phaser.Scenes.SHUTDOWN
    )
      return;
    this.updateGuideArrow(); // Actualiza la flecha guía antes de emitir el hud
    EventBus.emit("level4:hud", {
      river: Math.round(this.riverFlow * 10) / 10,
      detectorCharges: this.detectorCharges,
      kit: { ...this.kit },
      kitTotal: Object.values(this.kit).reduce((a, b) => a + b, 0),
      missionText: LEVEL4.missionText,
      ...this.getObjective(), // missionIndex y objective
      clock: this.clockStr(),
      alert: this.simMinutes >= LEVEL4.horaAlertaRojaMin,
      pace: this.awaitingEstimate
        ? "waiting"
        : this.decisionCritical
          ? "critical"
          : !this.decisionResolved
            ? "deciding"
            : "normal",
      decisionSecondsLeft: this.decisionSecondsLeft,
      activeHouseId: this.activeHouse ? this.activeHouse.id : null,
    });
  }
  clockStr() {
    const h = Math.floor(this.simMinutes / 60);
    const m = this.simMinutes % 60;
    return `${pad(h)}:${pad(m)}`;
  }

  formatClock() {
    return `HORA: ${this.clockStr()} / 12:00`;
  }

  log(text) {
    this.logEvents.push(`${this.clockStr()} · ${text}`);
  }

  /* --------------------------------------------------- decisión inicial (10 s) */

  startDecisionCountdown() {
    this.decisionSecondsLeft = LEVEL4.decisionWindowSeconds;
    this.updateDecisionText();

    this.decisionEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.levelEnded || this.decisionResolved) return;

        this.decisionSecondsLeft -= 1;
        if (this.decisionSecondsLeft > 0) {
          this.updateDecisionText();
          return;
        }

        // Se acabó la ventana sin entrar a ninguna vivienda
        this.decisionSecondsLeft = 0;
        this.decisionResolved = true;
        this.decisionCritical = true;
        this.decisionEvent.remove(false);

        this.adjustRiver(-LEVEL4.penaltyNoDecision, "penalty");
        this.penalties.push({
          tipo: "sin decisión inicial",
          puntos: LEVEL4.penaltyNoDecision,
          hora: this.clockStr(),
        });
        this.log(
          `No entraste a ninguna casa en ${LEVEL4.decisionWindowSeconds}s (-${LEVEL4.penaltyNoDecision} pts, estado crítico)`,
        );
        this.updateDecisionText();
        this.showBanner("ESTADO CRÍTICO", "#b91c1c");
        this.sfx("alarm");
        this.cameras.main.shake(300, 0.005);
        this.msg(LEVEL4_LINES.decisionCritical);
      },
    });
  }

  // El jugador ya eligió su primera vivienda: la ventana deja de correr.
  resolveDecision() {
    if (this.decisionResolved) return;
    this.decisionResolved = true;
    if (this.decisionEvent) this.decisionEvent.remove(false);
    this.updateDecisionText();
  }

  updateDecisionText() {
    if (!this.decisionText || !this.decisionText.active) return;
    if (this.decisionCritical) {
      this.decisionText.setText("RITMO: CRÍTICO").setColor("#ef4444");
    } else if (!this.decisionResolved) {
      this.decisionText
        .setText(`DECIDIR: ${this.decisionSecondsLeft}s`)
        .setColor("#fca5a5");
    } else if (this.viewMode === "house") {
      this.decisionText.setText("ESTADO: En vivienda").setColor("#86efac");
    } else {
      this.decisionText.setText("RITMO: Normal").setColor("#86efac");
    }
    this.emitHud(); // Actualiza el hud del nivel 4 para que ToolsSidebar.jsx pueda mostrar el estado de la decision.
  }

  /* ------------------------------------------------------------------ reloj */

  startSimClock() {
    const msPerSimMinute = LEVEL4.msPorHoraSimulada / 60;
    this.clockEvent = this.time.addEvent({
      delay: msPerSimMinute,
      loop: true,
      callback: () => this.tickSimMinute(),
    });
  }

  tickSimMinute() {
    if (this.levelEnded || this.awaitingEstimate) return;

    this.simMinutes += 1;
    this.updateClockHud();

    if (this.simMinutes >= LEVEL4.horaAlertaRojaMin)
      this.playTone(1100, 0.04, "square", 0.04);

    // En estado crítico el ritmo REEMPLAZA al normal (-0,14), no se suma.
    const drain = this.decisionCritical
      ? LEVEL4.drainCriticoPerMin
      : LEVEL4.drainNormalPerMin;
    this.adjustRiver(-drain, "time");

    if (
      !this.incidentTriggered &&
      this.simMinutes >= LEVEL4.horaImprevistoMin
    ) {
      this.incidentTriggered = true;
      this.triggerTenAmIncident();
    }

    if (this.simMinutes >= LEVEL4.horaCorteMin) {
      this.finishAtNoon();
    }
  }

  updateClockHud() {
    //Actualiza el hud del nivel 4 para que ToolsSidebar.jsx pueda mostrar la hora actual.
    if (!this.clockText || !this.clockText.active) return;
    this.clockText.setText(this.formatClock());

    const isRedZone = this.simMinutes >= LEVEL4.horaAlertaRojaMin;
    this.clockText.setColor(isRedZone ? "#ef4444" : "#f4ce0f");

    if (isRedZone && !this.alertShown) {
      this.sfx("alarm");
      this.alertShown = true;
      // Marco rojo que pulsa + reloj parpadeando durante los últimos 30 min simulados
      this.alertFrame = this.add
        .rectangle(480, 270, 950, 530) // son las medidas del rectángulo que rodea la escena del nivel 4
        .setFillStyle(0xef4444, 0)
        .setStrokeStyle(6, 0xef4444)
        .setDepth(50);
      this.tweens.add({
        targets: this.alertFrame,
        alpha: { from: 1, to: 0.15 },
        duration: 450,
        yoyo: true,
        repeat: -1,
      });
      this.tweens.add({
        targets: this.clockText,
        alpha: { from: 1, to: 0.35 },
        duration: 450,
        yoyo: true,
        repeat: -1,
      });
      this.log("Alerta: faltan 30 minutos simulados para el corte");
      this.msg(LEVEL4_LINES.lastThirty);
      this.showBanner("¡Faltan 30 minutos!", "#b91c1c");
    }
    this.emitHud(); //Actualiza el hud del nivel 4 para que ToolsSidebar.jsx pueda mostrar la hora actual.
  }

  /* ------------------------------------------------------------------- río */

  adjustRiver(delta, bucket = "gain") {
    const before = this.riverFlow;
    this.riverFlow = Math.max(0, Math.min(100, before + delta));
    const real = this.riverFlow - before;

    if (bucket === "gain") this.riverGained += real;
    else if (bucket === "time") this.riverLostTime += -real;
    else this.riverLostPenalty += -real;

    if (this.riverText && this.riverText.active) {
      this.riverText.setText(`RÍO: ${this.riverFlow.toFixed(1)}%`);
      this.riverText.setColor(
        this.riverFlow <= LEVEL4.umbralDerrota ? "#f87171" : "#38bdf8",
      );
      this.emitHud(); //Actualiza el hud del nivel 4
    }
  }

  /* -------------------------------------------------------------- imprevisto */

  getHouseStatus(house) {
    const total = house.objects.length;
    const done = house.objects.filter((o) => this.attendedIds.has(o.id)).length;
    if (done === 0) return "pending";
    if (done === total) return "attended";
    return "partial";
  }

  triggerTenAmIncident() {
    const kind = Phaser.Math.RND.pick(["leak", "overflow"]);
    const isOverflow = kind === "overflow";
    const pieza = isOverflow ? "flotador" : "cinta";

    // Debe aparecer en una vivienda que "parecía resuelta":
    // primero las atendidas, luego las parciales, y si no hay, cualquiera.
    const attended = this.houses.filter(
      (h) => this.getHouseStatus(h) === "attended",
    );
    const partial = this.houses.filter(
      (h) => this.getHouseStatus(h) === "partial",
    );
    const pool = attended.length
      ? attended
      : partial.length
        ? partial
        : this.houses;
    const house = Phaser.Math.RND.pick(pool);

    const obj = {
      id: `inc_${house.id}_${kind}`,
      label: isOverflow ? "Rebose nuevo" : "Fuga nueva",
      accion: isOverflow ? "Instalar flotador" : "Sellar con cinta",
      x: house.incidentX ?? 560,
      y: 398,
      kind,
      litros: LEVEL4.incidentLitros,
      piezaCorrecta: pieza,
      esImprevisto: true,
    };
    house.objects.push(obj);

    this.incident = {
      kind,
      houseId: house.id,
      houseName: house.name,
      hora: this.clockStr(),
      litros: obj.litros,
      pieza,
      resolved: false,
    };

    this.adjustRiver(-LEVEL4.penaltyIncident, "penalty");
    this.penalties.push({
      tipo: "imprevisto de las 10:00",
      puntos: LEVEL4.penaltyIncident,
      hora: this.clockStr(),
    });
    this.log(
      `Imprevisto en ${house.name}: ${obj.label} (-${LEVEL4.penaltyIncident} pts, requiere ${pieza})`,
    );

    this.updateHouseBadges();

    // Si el jugador está justo en esa casa, se redibuja sin moverlo
    if (this.viewMode === "house" && this.activeHouse?.id === house.id) {
      this.renderHouse(house, false);
    }

    this.showBanner(LEVEL4_LINES.incidentAtTen, "#1557b0", 4500);
    this.sfx("alarm"); // Suena alarma de imprevisto
    this.cameras.main.shake(450, 0.007);
    this.msg(LEVEL4_LINES.incidentHelp(house.name, pieza));
    EventBus.emit("level4:incident", { ...this.incident });
  }

  /* ----------------------------------------------------------------- escaneo */

  isHidden(obj) {
    return !!obj.requiereEscaneo && !this.scannedIds.has(obj.id);
  }

  findScanTarget() {
    let best = null;
    let bestDist = Infinity;
    this.houseInteractables.forEach((item) => {
      if (!this.isHidden(item)) return;
      const d = Math.abs(this.player.x - item.x);
      if (d <= OBJ_RANGE && d < bestDist) {
        best = item;
        bestDist = d;
      }
    });
    return best;
  }

  startHouseScan() {
    if (
      this.viewMode !== "house" ||
      this.levelEnded ||
      this.awaitingEstimate ||
      this.busy
    ) {
      return;
    }

    // El detector solo funciona cerca de un punto que requiera escaneo.
    // Si no hay uno cerca, NO se gasta la carga.
    const target = this.findScanTarget();
    if (!target) {
      this.msg(
        "El detector solo sirve cerca de un punto sospechoso. Acércate a uno.",
      );
      return;
    }

    if (this.detectorCharges <= 0) {
      this.msg("No quedan cargas del detector.");
      return;
    }

    this.detectorCharges -= 1;
    this.usedDetectorCharges += 1;
    this.scanSecondsSpent += LEVEL4.scanSeconds;
    this.updateInventoryHud();
    this.log(
      `Escaneo en ${this.activeHouse.name} (${LEVEL4.scanSeconds}s, 1 carga)`,
    );

    const ring = this.add
      .rectangle(target.x, target.y, 52, 52)
      .setStrokeStyle(3, 0x00e5ff)
      .setDepth(6);
    this.houseGroup.add(ring);

    this.msg(`Escaneando (${LEVEL4.scanSeconds}s)...`);
    this.sfx("scanStart"); // Sonido de escaneo iniciado

    this.startBusy("Escaneando...", LEVEL4.scanSeconds, () => {
      if (ring.active) ring.destroy();
      this.scannedIds.add(target.id);
      this.identifiedIds.add(target.id);

      const item = this.houseInteractables.find((i) => i.id === target.id);
      if (item) this.paintObject(item);

      this.log(
        `Identificado con el detector: ${target.label} (${target.litros} L)`,
      );
      this.msg(LEVEL4_LINES.scanDone(target));
      this.sfx("scanEnd");
    });
  }

  // Bloquea al jugador mientras el reloj sigue corriendo (escaneo, recorrido).
  startBusy(label, seconds, onDone) {
    this.busy = true;
    let left = Math.ceil(seconds);
    const paint = () =>
      this.busyText.setText(`${label} ${left}s`).setVisible(true);
    paint();

    const ticker = this.time.addEvent({
      delay: 1000,
      repeat: Math.max(0, left - 1),
      callback: () => {
        left -= 1;
        if (left > 0) paint();
      },
    });

    this.time.delayedCall(seconds * 1000, () => {
      ticker.remove(false);
      this.busyText.setVisible(false);
      this.busy = false;
      if (!this.levelEnded) onDone();
    });
  }

  /* ------------------------------------------------------------- intervenir */

  computeSaved(litros) {
    // Ahorro real = litros del problema × (tiempo restante hasta las 12:00 / tiempo total).
    // Resolver temprano ahorra más que resolver sobre la hora.
    const total = LEVEL4.horaCorteMin - LEVEL4.horaInicioMin;
    const remaining = Math.max(0, LEVEL4.horaCorteMin - this.simMinutes);
    return (litros * remaining) / total;
  }

  tryAttendObject(obj) {
    if (this.busy || this.levelEnded) return;
    if (this.attendedIds.has(obj.id)) return; // nunca contar dos veces

    if (this.isHidden(obj)) {
      this.sfx("error");
      this.msg("Primero escanea este punto con el detector (tecla X).");
      return;
    }

    let gain;
    let text;

    if (obj.kind === "tap") {
      gain = LEVEL4.gainTap;
      this.taps += 1;
      text = `Cerraste "${obj.label}"`;
      this.log(`Cierre: "${obj.label}" (+${gain} pts)`);
    } else if (obj.kind === "habit") {
      gain = LEVEL4.gainHabit;
      this.habits += 1;
      text = `Cambio de hábito: "${obj.label}"`;
      this.log(`Cambio de hábito: "${obj.label}" (+${gain} pts)`);
    } else {
      // Reparación: exige la pieza correcta
      const needed = obj.piezaCorrecta;
      if (!needed || (this.kit[needed] ?? 0) <= 0) {
        this.sfx("error");
        this.log(
          `Sin pieza "${needed}" para "${obj.label}" en ${this.activeHouse.name}`,
        );
        this.msg(`No tienes "${needed}" disponible para "${obj.label}".`);
        return;
      }
      this.kit[needed] -= 1;
      this.usedKit[needed] = (this.usedKit[needed] || 0) + 1;
      this.repairs += 1;
      gain = LEVEL4.gainRepair;
      text = `Reparaste "${obj.label}" con ${needed}`;
      this.log(`Reparación: "${obj.label}" con ${needed} (+${gain} pts)`);
      this.updateInventoryHud();
    }

    const saved = this.computeSaved(obj.litros);
    this.attendedIds.add(obj.id);
    this.identifiedIds.add(obj.id);
    this.intervenedHouses.add(this.activeHouse.id);
    this.solvedLitros += obj.litros;
    this.savedLitros += saved;
    if (obj.esImprevisto && this.incident) this.incident.resolved = true;

    this.adjustRiver(gain, "gain");
    this.sfx("ok");
    this.floatText(obj.x, obj.y - 50, `+${gain}%`);

    const item = this.houseInteractables.find((i) => i.id === obj.id);
    if (item) this.paintObject(item);
    this.updateHouseBadges();

    let message = `${text} (+${gain}% río, ahorras ~${Math.round(saved)} L).`;
    if (this.getHouseStatus(this.activeHouse) === "attended") {
      const next = this.nextPendingHouse(this.activeHouse.id);
      message +=
        " " +
        LEVEL4_LINES.houseDone(this.activeHouse.name, next ? next.name : null);
    }
    this.msg(message);
  }

  /* --------------------------------------------------------- fin del nivel */

  finishAtNoon() {
    if (this.levelEnded) return;
    this.levelEnded = true;
    this.simMinutes = LEVEL4.horaCorteMin;
    this.updateClockHud();
    this.emitHud();

    if (this.clockEvent) this.clockEvent.remove(false);
    if (this.decisionEvent) this.decisionEvent.remove(false);
    this.busyText.setVisible(false);
    this.prompt.setVisible(false);

    const finalRiver = Math.round(this.riverFlow * 10) / 10;
    const won = finalRiver > LEVEL4.umbralDerrota;
    this.sfx(won ? "win" : "lose");

    let stars = 0;
    if (finalRiver > LEVEL4.umbralTresEstrellas) stars = 3;
    else if (finalRiver > LEVEL4.umbralDosEstrellas) stars = 2;
    else if (finalRiver > LEVEL4.umbralDerrota) stars = 1;

    const allObjects = this.houses.flatMap((h) => h.objects);
    const solved = allObjects.filter((o) => this.attendedIds.has(o.id));
    const pending = allObjects.filter((o) => !this.attendedIds.has(o.id));
    const identified = allObjects.filter((o) => this.identifiedIds.has(o.id));
    const sum = (list) => list.reduce((acc, o) => acc + o.litros, 0);

    const exhausted = [];
    if (this.detectorCharges === 0) exhausted.push("Cargas del detector");
    Object.keys(this.initialKit).forEach((k) => {
      if (this.initialKit[k] > 0 && this.kit[k] === 0)
        exhausted.push(PIEZA_NOMBRES[k] ?? k);
    });

    const keyDecisions = [];
    if (this.decisionCritical) {
      keyDecisions.push(
        `No entraste a una vivienda en ${LEVEL4.decisionWindowSeconds}s: -${LEVEL4.penaltyNoDecision} pts y el río bajó a ritmo crítico.`,
      );
    }
    if (this.incident) {
      keyDecisions.push(
        this.incident.resolved
          ? `Volviste a ${this.incident.houseName} y resolviste el imprevisto de las 10:00.`
          : `El imprevisto de las 10:00 en ${this.incident.houseName} quedó sin resolver.`,
      );
    }
    [...pending]
      .sort((a, b) => b.litros - a.litros)
      .slice(0, 2)
      .forEach((p) =>
        keyDecisions.push(`Quedó pendiente "${p.label}" (${p.litros} L).`),
      );
    if (exhausted.length) {
      keyDecisions.push(`Se agotaron: ${exhausted.join(", ")}.`);
    }

    this.showBanner(LEVEL4_LINES.noonEnd, "#0b2740", 3000);
    this.msg(LEVEL4_LINES.noonEnd);
    this.log(`Corte. Río final: ${finalRiver}%`);

    EventBus.emit("level4:summary", {
      won,
      showWhyFailed: !won,
      stars,

      // Río
      riverInitial: this.riverInitial,
      riverFlow: finalRiver,
      riverRecoveredPoints: Number(this.riverGained.toFixed(1)),
      riverLostByTime: Number(this.riverLostTime.toFixed(1)),
      riverLostByPenalties: Number(this.riverLostPenalty.toFixed(1)),
      riverChange: Number((finalRiver - this.riverInitial).toFixed(1)),

      // Litros (tres cifras distintas, como pide el diseño)
      // Litros
      estimatedLitros: this.estimatedLitros, //esto viene del archivo Level4Scene.jsx
      totalLitros: sum(allObjects), // <-- nueva: todo lo que se perdía en la cuadra
      identifiedLitros: sum(identified),
      solvedLitros: sum(solved),
      pendingLitros: sum(pending),
      savedLitros: Math.round(this.savedLitros),

      // Problemas
      identifiedCount: identified.length,
      solvedCount: solved.length,
      pendingCount: pending.length,
      pendingLabels: pending.map((p) => p.label),
      solvedLabels: solved.map((p) => p.label),

      // Viviendas
      housesStatus: this.houses.map((h) => ({
        id: h.id,
        name: h.name,
        status: this.getHouseStatus(h),
        pending: h.objects
          .filter((o) => !this.attendedIds.has(o.id))
          .map((o) => o.label),
      })),
      intervenedHouses: this.houses
        .filter((h) => this.intervenedHouses.has(h.id))
        .map((h) => h.name),
      metersChecked: this.metersChecked.size,

      // Acciones
      repairs: this.repairs,
      habits: this.habits,
      taps: this.taps,

      // Recursos
      usedDetectorCharges: this.usedDetectorCharges,
      remainingDetectorCharges: this.detectorCharges,
      usedKit: { ...this.usedKit },
      remainingKit: { ...this.kit },
      exhaustedResources: exhausted,

      // Tiempo
      walkSecondsSpent: Number(this.walkSecondsSpent.toFixed(1)),
      scanSecondsSpent: this.scanSecondsSpent,

      // Para «¿Qué pasó?»
      penalties: [...this.penalties],
      incident: this.incident ? { ...this.incident } : null,
      keyDecisions,

      logEvents: [...this.logEvents],
      challengeOptions: LEVEL4.retoSieteDiasOpciones,
      finalMessage: LEVEL4.mensajeFinal,
    });
  }

  /* ---------------------------------------------------------------- visual */

  buildInspectorTexture() {
    // Un cuadro por pose: reposo, 4 de caminata y salto.
    // s = separación de piernas, lift = pierna levantada, arm = vaivén de brazos, bob = rebote del cuerpo
    const poses = {
      l4_inspector: { s: 0, liftL: 0, liftR: 0, armL: 0, armR: 0, bob: 0 },
      l4_walk_0: { s: -3, liftL: 0, liftR: 0, armL: -3, armR: 3, bob: 0 },
      l4_walk_1: { s: 0, liftL: 3, liftR: 0, armL: 0, armR: 0, bob: -1 },
      l4_walk_2: { s: 3, liftL: 0, liftR: 0, armL: 3, armR: -3, bob: 0 },
      l4_walk_3: { s: 0, liftL: 0, liftR: 3, armL: 0, armR: 0, bob: -1 },
      l4_jump: { s: -4, liftL: 3, liftR: 1, armL: -10, armR: -10, bob: 0 },
    };

    Object.entries(poses).forEach(([key, p]) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      const b = p.bob;

      // Brazos (detrás del cuerpo)
      g.fillStyle(0x2461b1, 1);
      g.fillRoundedRect(3, 22 + b + p.armL, 5, 14, 2);
      g.fillRoundedRect(28, 22 + b + p.armR, 5, 14, 2);
      g.fillStyle(0xf3c9a2, 1);
      g.fillCircle(5.5, 36 + b + p.armL, 2.5);
      g.fillCircle(30.5, 36 + b + p.armR, 2.5);

      // Piernas
      g.fillStyle(0x123c66, 1);
      g.fillRoundedRect(8 + p.s, 42, 8, 18 - p.liftL, 3);
      g.fillRoundedRect(20 - p.s, 42, 8, 18 - p.liftR, 3);

      // Cuerpo y chaleco
      g.fillStyle(0x2461b1, 1);
      g.fillRoundedRect(7, 20 + b, 22, 26, 5);
      g.fillStyle(0x619bf2, 1);
      g.fillRoundedRect(11, 24 + b, 14, 15, 4);

      // Cabeza y casco
      g.fillStyle(0xf3c9a2, 1);
      g.fillRoundedRect(11, 8 + b, 14, 14, 5);
      g.fillStyle(0xf4ce0f, 1);
      g.fillRoundedRect(8, 2 + b, 20, 10, 5);
      g.fillStyle(0xd9b40a, 1);
      g.fillRoundedRect(5, 9 + b, 26, 3, 2);

      g.generateTexture(key, 36, 64);
      g.destroy();
    });

    if (!this.anims.exists("l4_walk")) {
      this.anims.create({
        key: "l4_walk",
        frames: ["l4_walk_0", "l4_walk_1", "l4_walk_2", "l4_walk_3"].map(
          (key) => ({ key }),
        ),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  buildHudStrip() {
    // Barra superior con reloj, estado de decisión y río
    this.add
      .rectangle(480, 18, 960, 36, 0x0b2740)
      .setDepth(30)
      .setVisible(false);

    this.clockText = this.add
      .text(16, 18, this.formatClock(), {
        fontFamily: '"Inter", sans-serif',
        fontSize: "12px",
        fontStyle: "bold",
        color: "#f4ce0f",
      })
      .setOrigin(0, 0.5)
      .setDepth(31);

    this.decisionText = this.add
      .text(220, 18, `DECIDIR: ${this.decisionSecondsLeft}s`, {
        fontFamily: '"Inter", sans-serif',
        fontSize: "12px",
        fontStyle: "bold",
        color: "#fca5a5",
      })
      .setOrigin(0, 0.5)
      .setDepth(31);

    this.riverText = this.add
      .text(500, 18, `RÍO: ${this.riverFlow.toFixed(1)}%`, {
        fontFamily: '"Inter", sans-serif',
        fontSize: "12px",
        fontStyle: "bold",
        color: "#38bdf8",
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.chargesText = this.add
      .text(944, 18, "", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(1, 0.5)
      .setDepth(31);
    this.updateInventoryHud();
    [
      this.clockText,
      this.decisionText,
      this.riverText,
      this.chargesText,
    ].forEach((t) => t.setVisible(false)); // Se muestran en ToolsSidebar.jsx
  }

  updateInventoryHud() {
    if (!this.chargesText) return;
    this.chargesText.setText(
      `DET:${this.detectorCharges} · EMP:${this.kit.empaque} FLO:${this.kit.flotador} CIN:${this.kit.cinta} ABR:${this.kit.abrazadera}`,
    );
    this.emitHud(); //Actualiza el hud del nivel 4
  }

  showBanner(text, bg = "#1557b0", duration = 3000) {
    const banner = this.add
      .text(480, 80, text, {
        fontFamily: '"Inter", sans-serif',
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: bg,
        padding: { x: 14, y: 8 },
        align: "center",
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5, 0)
      .setDepth(60)
      .setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 250,
      onComplete: () => {
        this.time.delayedCall(duration, () => {
          this.tweens.add({
            targets: banner,
            alpha: 0,
            duration: 300,
            onComplete: () => banner.destroy(),
          });
        });
      },
    });
  }

  buildStreetScene() {
    this.clearHouseScene();
    this.viewMode = "street";
    this.activeHouse = null;
    this.streetNeedles = [];
    this.updateDecisionText();

    const { width, floorY } = LEVEL4.world;
    const sky = this.add.graphics().setDepth(1);

    sky.fillGradientStyle(0x7fb2f5, 0x7fb2f5, 0xcbe3ff, 0xcbe3ff, 1);
    sky.fillRect(0, 0, width, floorY); // cielo azul
    sky.fillStyle(0x1d70b8, 0.45);
    sky.fillRect(0, 125, width, 24);
    sky.lineStyle(2, 0x38bdf8, 0.7);
    sky.lineBetween(0, 125, width, 125);

    const ground = this.add.graphics().setDepth(2);
    ground.fillStyle(0xcbd5e1, 1);
    ground.fillRect(0, floorY, width, 26);
    ground.lineStyle(2, 0x64748b, 1);
    ground.lineBetween(0, floorY, width, floorY);
    ground.lineBetween(0, floorY + 26, width, floorY + 26);

    ground.fillStyle(0x334155, 1);
    ground.fillRect(0, floorY + 26, width, Math.max(0, 540 - (floorY + 26)));

    ground.lineStyle(3, 0xf4ce0f, 0.85);
    for (let x = 24; x < width; x += 68) {
      ground.lineBetween(x, floorY + 54, x + 34, floorY + 54);
    }

    this.streetGroup.addMultiple([sky, ground]);

    this.houses.forEach((house) => {
      this.drawHouseFacade(house, floorY);
    });
    this.updateHouseBadges();

    if (this.player) {
      this.player.setPosition(70, floorY - 34);
    }
  }

  drawHouseFacade(house, floorY) {
    const houseW = 196;
    const bodyH = 132;
    const bodyTop = floorY - bodyH;
    const trimColor = house.trimColor ?? 0x475569;
    const roofColor = house.roofColor ?? 0xc97b4a;

    const g = this.add.graphics().setDepth(3);

    g.fillStyle(0x0f172a, 0.16);
    g.fillRoundedRect(house.x - houseW / 2 + 4, bodyTop + 4, houseW, bodyH, 6);

    g.fillStyle(house.wallColor, 1);
    g.fillRoundedRect(house.x - houseW / 2, bodyTop, houseW, bodyH, 6);
    g.lineStyle(2.5, trimColor, 1);
    g.strokeRoundedRect(house.x - houseW / 2, bodyTop, houseW, bodyH, 6);

    g.fillStyle(trimColor, 0.2);
    g.fillRect(house.x - houseW / 2 + 2, floorY - 12, houseW - 4, 12);

    if (house.style === "apartment") {
      g.fillStyle(roofColor, 1);
      g.fillRoundedRect(
        house.x - houseW / 2 - 6,
        bodyTop - 22,
        houseW + 12,
        22,
        4,
      );
      g.lineStyle(2, trimColor, 1);
      g.strokeRoundedRect(
        house.x - houseW / 2 - 6,
        bodyTop - 22,
        houseW + 12,
        22,
        4,
      );
    } else {
      const roofH = house.style === "patio" ? 34 : 42;
      g.fillStyle(roofColor, 1);
      g.beginPath();
      g.moveTo(house.x - houseW / 2 - 10, bodyTop);
      g.lineTo(house.x, bodyTop - roofH);
      g.lineTo(house.x + houseW / 2 + 10, bodyTop);
      g.closePath();
      g.fillPath();
      g.lineStyle(2.5, trimColor, 1);
      g.strokePath();
    }

    const winX = house.x - 46;
    const winY = bodyTop + 42;
    g.fillStyle(0xbae6fd, 1);
    g.fillRoundedRect(winX - 18, winY - 15, 36, 30, 3);
    g.lineStyle(2, trimColor, 1);
    g.strokeRoundedRect(winX - 18, winY - 15, 36, 30, 3);
    g.lineBetween(winX, winY - 15, winX, winY + 15);
    g.lineBetween(winX - 18, winY, winX + 18, winY);

    const doorX = house.x + 18;
    const doorW = 34;
    const doorH = 58;
    const doorTop = floorY - doorH;
    g.fillStyle(0x8b5a2b, 1);
    g.fillRoundedRect(doorX - doorW / 2, doorTop, doorW, doorH, {
      tl: 4,
      tr: 4,
      bl: 0,
      br: 0,
    });
    g.lineStyle(2, trimColor, 1);
    g.strokeRoundedRect(doorX - doorW / 2, doorTop, doorW, doorH, {
      tl: 4,
      tr: 4,
      bl: 0,
      br: 0,
    });
    g.fillStyle(0xf4ce0f, 1);
    g.fillCircle(doorX + 10, doorTop + doorH / 2 + 2, 2.5);

    const meterX = house.x + 66;
    const meterY = floorY - 34;
    g.fillStyle(0xf8fafc, 1);
    g.fillCircle(meterX, meterY, 18);
    g.lineStyle(2.5, 0x1557b0, 1);
    g.strokeCircle(meterX, meterY, 18);

    const needle = this.add
      .rectangle(meterX, meterY, 2.5, 13, 0xd93b3b)
      .setOrigin(0.5, 1)
      .setDepth(5);
    g.fillStyle(0x1557b0, 1);
    g.fillCircle(meterX, meterY, 2.5);

    const labelY = house.style === "apartment" ? bodyTop - 36 : bodyTop - 50;
    const title = this.add
      .text(house.x, labelY, house.name.toUpperCase(), {
        fontFamily: '"Inter", sans-serif',
        fontSize: "10px",
        fontStyle: "bold",
        color: "#0f172a",
        backgroundColor: "#ffffff",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(6);

    // Estado visual de la vivienda: pendiente / parcial / atendida
    const badge = this.add
      .text(house.x, labelY - 18, STATUS_STYLE.pending.label, {
        fontFamily: '"Inter", sans-serif',
        fontSize: "10px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: STATUS_STYLE.pending.bg,
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(6);
    this.houseBadges[house.id] = badge;

    // La velocidad solo se anota cuando el jugador revisa el medidor (Misión 2)
    const speedTag = this.add
      .text(meterX, meterY + 24, house.needleSpeed, {
        fontFamily: '"Inter", sans-serif',
        fontSize: "9px",
        fontStyle: "bold",
        color: "#1e293b",
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false);
    this.meterTags[house.id] = speedTag;

    const mark = this.add
      .text(meterX, meterY - 30, "✔", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "14px",
        fontStyle: "bold",
        color: "#16a34a",
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false);
    this.meterMarks[house.id] = mark;

    this.streetGroup.addMultiple([g, needle, title, badge, speedTag, mark]);
    this.streetNeedles.push({ needle, intensity: house.needleIntensity });

    house.doorX = doorX;
    house.meterX = meterX;
  }

  updateHouseBadges() {
    this.houses.forEach((house) => {
      const badge = this.houseBadges[house.id];
      if (!badge) return;
      const style = STATUS_STYLE[this.getHouseStatus(house)];
      badge.setText(style.label);
      badge.setBackgroundColor(style.bg);
    });
  }

  /* ----------------------------------------------------- calle ⇄ vivienda */

  // Punto de entrada desde la calle. Aplica el tiempo de recorrido (3 s)
  // cuando se pasa de una vivienda a otra distinta.
  requestEnterHouse(house) {
    if (this.busy || this.levelEnded) return;
    if (this.metersChecked.size < this.houses.length) {
      this.sfx("error");
      this.msg(
        `Primero revisa los tres medidores (${this.metersChecked.size} de ${this.houses.length}). Párate frente a cada uno y pulsa E.`,
      );
      return;
    }

    this.resolveDecision();

    const needsTravel = this.lastHouseId && this.lastHouseId !== house.id;
    if (!needsTravel) {
      this.enterHouseScene(house);
      return;
    }

    // En estado crítico el personaje se mueve más rápido, así que el trayecto dura menos.
    const secs = this.decisionCritical
      ? Math.round(
          ((LEVEL4.walkSecondsBetweenHouses * BASE_SPEED) / CRITICAL_SPEED) *
            10,
        ) / 10
      : LEVEL4.walkSecondsBetweenHouses;

    this.walkSecondsSpent += secs; // Se contabiliza el tiempo de recorrido aunque el jugador no pueda hacer nada mientras camina.
    this.log(`Recorrido hacia ${house.name} (${secs}s)`); //
    this.msg(`Recorriendo la calle hacia ${house.name}...`); //

    this.startBusy("Entrando a la casa...", secs, () => {
      this.enterHouseScene(house);
    });
  }

  enterHouseScene(house) {
    this.sfx("door");
    // Funcion que dibuja la vivienda y sus objetos, y oculta la calle.
    this.streetGroup.setVisible(false);
    this.viewMode = "house";
    this.activeHouse = house;
    this.lastHouseId = house.id;
    this.updateDecisionText();

    this.renderHouse(house, true); // Dibuja la vivienda y sus objetos, y coloca al jugador en la puerta, viene de requestEnterHouse
    this.emitHud(); // Actualiza el hud del nivel 4
    this.msg(LEVEL4_LINES.enterHouse(house.name));
  }

  renderHouse(house, resetPlayer) {
    this.houseGroup.clear(true, true);
    this.houseInteractables = [];

    const { width, floorY } = LEVEL4.world;
    const g = this.add.graphics().setDepth(1);

    g.fillStyle(house.wallColor, 1);
    g.fillRect(0, 0, width, floorY); //esto sirve para que el fondo de la vivienda sea del color de la pared, y no se vea el cielo ni la calle
    g.fillStyle(0x8a6a46, 1);
    g.fillRect(0, floorY, width, 540 - floorY);
    g.lineStyle(3, 0x5a3b22, 1);
    g.lineBetween(0, floorY, width, floorY);

    g.fillStyle(0x7c4d25, 1);
    g.fillRoundedRect(EXIT_X - 20, floorY - 64, 40, 64, 4);
    g.lineStyle(2, 0x3f240e, 1);
    g.strokeRoundedRect(EXIT_X - 20, floorY - 64, 40, 64, 4);

    const title = this.add
      .text(width / 2, 62, `${house.name.toUpperCase()} · INTERIOR`, {
        fontFamily: '"Inter", sans-serif',
        fontSize: "12px",
        fontStyle: "bold",
        color: "#0f172a",
        backgroundColor: "#ffffffe6",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(4);

    const exitLabel = this.add
      .text(EXIT_X, floorY - 78, "SALIR", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "10px",
        fontStyle: "bold",
        color: "#0f172a",
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.houseGroup.addMultiple([g, title, exitLabel]);

    house.objects.forEach((obj) => {
      const box = this.add
        .rectangle(obj.x, obj.y, 36, 36, 0x0ea5e9)
        .setStrokeStyle(2, 0x0f172a)
        .setDepth(4);
      const tag = this.add
        .text(obj.x, obj.y - 26, "", {
          fontFamily: '"Inter", sans-serif',
          fontSize: "10px",
          fontStyle: "bold",
          color: "#0f172a",
          backgroundColor: "#ffffffe6",
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(5);

      this.houseGroup.addMultiple([box, tag]);
      const item = { ...obj, box, tag };
      this.houseInteractables.push(item);
      this.paintObject(item);

      // Lo que se ve a simple vista queda identificado al entrar
      if (!this.isHidden(obj) && !this.identifiedIds.has(obj.id)) {
        this.identifiedIds.add(obj.id);
        this.log(`Identificado: ${obj.label} (${obj.litros} L)`);
      }
    });

    if (resetPlayer) {
      this.player.setPosition(135, floorY - 34);
    }
  }

  // Color y texto de un objeto según su estado: oculto / pendiente / atendido
  paintObject(item) {
    const done = this.attendedIds.has(item.id);
    const hidden = this.isHidden(item);

    let color = 0x0ea5e9;
    if (done) color = 0x16a34a;
    else if (hidden) color = 0x64748b;
    else if (item.kind === "leak" || item.kind === "overflow") color = 0x0284c7;

    item.box.setFillStyle(color);

    const hint =
      !hidden && !done && item.piezaCorrecta ? ` [${item.piezaCorrecta}]` : "";
    item.tag.setText(hidden ? "Punto sospechoso" : `${item.label}${hint}`);
  }

  returnToStreet() {
    this.sfx("door");
    // vuelve a la calle desde la vivienda, colocando al jugador frente a la puerta de la casa de la que salio.
    if (this.busy || this.levelEnded) return;
    const left = this.activeHouse;

    this.houseGroup.clear(true, true);
    this.houseInteractables = [];
    this.streetGroup.setVisible(true);
    this.viewMode = "street";
    this.activeHouse = null;
    this.updateDecisionText();
    this.updateHouseBadges();
    this.emitHud(); // Actualiza el hud del nivel 4
    // El jugador reaparece frente a la puerta de la casa de la que salió
    this.player.setPosition(left?.doorX ?? 110, LEVEL4.world.floorY - 34);
    this.msg(LEVEL4_LINES.exitHouse);
  }

  clearHouseScene() {
    this.houseGroup.clear(true, true);
    this.houseInteractables = [];
  }

  /* ------------------------------------------------------------- medidores */

  checkMeter(house) {
    this.sfx("meter"); // Sonido de medidor revisado
    const first = !this.metersChecked.has(house.id);
    this.metersChecked.add(house.id);
    this.meterMarks[house.id]?.setVisible(true);

    const pendientes = house.objects.filter((o) => !this.attendedIds.has(o.id));
    const litros = this.housePendingLitros(house);

    this.meterTags[house.id]
      ?.setText(`${house.needleSpeed} · ${litros} L`)
      .setVisible(true);

    if (first) {
      this.log(
        `Medidor revisado: ${house.name} (${house.needleSpeed}, ${litros} L en ${pendientes.length} puntos)`,
      );
    }
    this.msg(
      LEVEL4_LINES.meterChecked(
        house.name,
        house.needleSpeed,
        litros,
        pendientes.length,
      ),
    );

    if (first && this.metersChecked.size === this.houses.length) {
      const total = this.houses.reduce(
        (acc, h) => acc + this.housePendingLitros(h),
        0,
      );
      const top = this.nextPendingHouse();
      this.msg(
        LEVEL4_LINES.allMetersChecked(
          total,
          top ? top.name : "la que más pierde",
        ),
      );
    }

    this.emitHud();
  }
  /* ----------------------------------------------------------- jugador/input */

  buildGround() {
    this.ground = this.add
      .rectangle(
        LEVEL4.world.width / 2,
        LEVEL4.world.floorY + 3,
        LEVEL4.world.width,
        8,
      )
      .setVisible(false);
    this.physics.add.existing(this.ground, true);
  }

  buildPlayer() {
    this.buildGround();
    this.player = this.physics.add
      .sprite(70, LEVEL4.world.floorY - 34, "l4_inspector")
      .setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 60);
    this.player.body.setOffset(8, 4);
    this.physics.add.collider(this.player, this.ground);
  }

  buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      x: Phaser.Input.Keyboard.KeyCodes.X,
      m: Phaser.Input.Keyboard.KeyCodes.M,
    });

    this.prompt = this.add
      .text(0, 0, "", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#1557b0",
        padding: { x: 7, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(40)
      .setVisible(false);

    // Texto de "escaneando" / "recorriendo la calle" con cuenta regresiva
    this.busyText = this.add
      .text(480, 500, "", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#0b2740",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(45)
      .setVisible(false);

    this.guideArrow = this.add // flecha amarilla que indica al jugador que se acerque a un medidor o puerta
      .text(0, 0, "▼", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "28px",
        color: "#f4ce0f",
        stroke: "#0f172a",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(35)
      .setVisible(false);
    this.guideBaseY = 0;
  }

  animateNeedles(time) {
    if (this.viewMode !== "street") return;
    this.streetNeedles.forEach(({ needle, intensity }) => {
      needle.rotation =
        Math.sin(time * (0.004 + intensity * 0.012)) * (0.2 + intensity * 0.55);
    });
  }

  updatePlayerAnim() {
    const p = this.player;
    const onGround = p.body.blocked.down;
    const moving = Math.abs(p.body.velocity.x) > 10;

    if (!onGround) {
      if (p.texture.key !== "l4_jump") {
        p.anims.stop();
        p.setTexture("l4_jump");
      }
    } else if (moving) {
      p.anims.timeScale = this.decisionCritical ? 1.3 : 1; // en estado crítico, pasos más rápidos
      p.anims.play("l4_walk", true);
    } else if (p.texture.key !== "l4_inspector") {
      p.anims.stop();
      p.setTexture("l4_inspector");
    }
  }

  update(time) {
    if (!this.player) return;

    this.animateNeedles(time);

    if (this.guideArrow && this.guideArrow.visible) {
      this.guideArrow.y = this.guideBaseY + Math.sin(time * 0.008) * 6;
    } // animación de la flecha amarilla

    if (Phaser.Input.Keyboard.JustDown(this.keys.m)) {
      this.muted = !this.muted;
      this.msg(
        this.muted
          ? "Sonido apagado (pulsa M para encenderlo)."
          : "Sonido encendido.",
      );
    }

    if (this.awaitingEstimate || this.levelEnded || this.busy) {
      this.player.setVelocityX(0);
      this.updatePlayerAnim();
      this.prompt.setVisible(false);
      return;
    }

    const speed = this.decisionCritical ? CRITICAL_SPEED : BASE_SPEED;
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;

    if (left) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    const jump =
      Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up);
    if (jump && this.player.body.blocked.down) {
      this.player.setVelocityY(-420);
    }

    if (
      this.viewMode === "house" &&
      Phaser.Input.Keyboard.JustDown(this.keys.x)
    ) {
      this.startHouseScan();
    }
    this.updatePlayerAnim();
    this.handlePromptAndAction();
  }

  handlePromptAndAction() {
    const { floorY } = LEVEL4.world;
    const px = this.player.x;
    const pressedE = Phaser.Input.Keyboard.JustDown(this.keys.e);
    this.prompt.setBackgroundColor("#1557b0");

    /* ---- calle: puertas y medidores, gana el más cercano ---- */
    if (this.viewMode === "street") {
      let best = null;
      this.houses.forEach((h) => {
        const dDoor = Math.abs(px - (h.doorX ?? h.x));
        if (dDoor <= DOOR_RANGE && (!best || dDoor < best.dist)) {
          best = { type: "door", house: h, dist: dDoor, x: h.doorX ?? h.x };
        }
        const dMeter = Math.abs(px - (h.meterX ?? h.x));
        if (dMeter <= METER_RANGE && (!best || dMeter < best.dist)) {
          best = { type: "meter", house: h, dist: dMeter, x: h.meterX ?? h.x };
        }
      });

      if (!best) {
        this.prompt.setVisible(false);
        return;
      }

      if (best.type === "door") {
        const blocked = this.metersChecked.size < this.houses.length;
        this.prompt
          .setText(
            blocked
              ? `Revisa los medidores primero (${this.metersChecked.size}/${this.houses.length})`
              : "E · Entrar",
          )
          .setBackgroundColor(blocked ? "#b91c1c" : "#1557b0")
          .setPosition(best.x, floorY - 72)
          .setVisible(true);
        if (pressedE) this.requestEnterHouse(best.house);
      } else {
        const checked = this.metersChecked.has(best.house.id);
        this.prompt
          .setText(checked ? "E · Medidor (revisado)" : "E · Revisar medidor")
          .setPosition(best.x, floorY - 64)
          .setVisible(true);
        if (pressedE) this.checkMeter(best.house);
      }
      return;
    }

    /* ---- interior: salida y objetos ---- */
    if (Math.abs(px - EXIT_X) <= DOOR_RANGE + 26) {
      this.prompt
        .setText("E · Salir")
        .setPosition(EXIT_X, floorY - 92)
        .setVisible(true);
      if (pressedE) this.returnToStreet();
      return;
    }

    let nearObj = null;
    let nearDist = Infinity;
    this.houseInteractables.forEach((o) => {
      const d = Math.abs(px - o.x);
      if (d <= OBJ_RANGE && d < nearDist) {
        nearObj = o;
        nearDist = d;
      }
    });

    if (!nearObj) {
      this.prompt.setVisible(false);
      return;
    }

    const done = this.attendedIds.has(nearObj.id);
    const hidden = this.isHidden(nearObj);

    let text;
    if (done) text = "Atendido";
    else if (hidden) text = `X · Escanear (${this.detectorCharges} cargas)`;
    else text = `E · ${nearObj.accion ?? nearObj.label}`;

    this.prompt
      .setText(text)
      .setPosition(nearObj.x, nearObj.y - 44)
      .setVisible(true);

    if (pressedE && !done) this.tryAttendObject(nearObj);
  }
}
