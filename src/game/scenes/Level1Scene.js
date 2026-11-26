import Phaser from "phaser";
import { EventBus } from "../EventBus";
import {
  LEVEL1,
  ROOMS,
  TAPS,
  LEAKS,
  FALSE_ALARM,
  TATO_LINES,
  LUZ_LINES,
  LEVEL1_OBJECTS,
} from "../data/level1Data";

const INTERACT_RANGE = 78;

/**
 * Level 1, "La casa Ortiz", as a side-view doll house.
 *
 * Phaser owns movement, visuals and detection; React owns navigation, the repair
 * kit inventory and the store. The bridge is EventBus, and the flow is:
 *
 *   scene  --game:request-repair-->  RepairKitModal
 *   modal  --game:repair-result---->  scene
 *   scene  --game:state------------>  store (perdidaDiaria, cargasDetector)
 *   scene  --game:complete--------->  App (LEVEL_SUMMARY)
 */
export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1Scene");
  }

  create() {
    this.completed = false;
    this.inputLocked = false;
    this.detectorOn = false;
    this.detectorTimer = null;
    this.detectorCharges = LEVEL1.detectorCharges;
    this.needleStopped = false;
    this.mateoScheduled = false;
    this.mateoEventDone = false;
    this.mateo = null;
    this.repaired = new Set();
    this.tapsOpen = new Map(TAPS.map((tap) => [tap.id, true]));
    this.meterMax =
      LEVEL1.totalLeakPerDay + TAPS.length * LEVEL1.openTapMeterBoost;

    this.cameras.main.setBackgroundColor("#0b2a4a");
    this.physics.world.setBounds(0, 0, LEVEL1.world.width, LEVEL1.world.height);

    this.buildTextures();
    this.drawHouse();
    this.buildGround();
    this.buildPlayer();
    this.buildObjects();
    this.buildMeter();
    this.buildDetectorLayer();
    this.buildInput();
    this.bindEvents();
    this.emitState();

    this.time.delayedCall(600, () => this.say("Tato", TATO_LINES.intro));
  }

  /* ------------------------------------------------------------------ setup */

  buildTextures() {
    if (!this.textures.exists("inspector")) {
      const g = this.add.graphics();

      g.fillStyle(0x0b2740, 1);
      g.fillRoundedRect(6, 57, 11, 7, 3);
      g.fillRoundedRect(19, 57, 11, 7, 3);
      g.fillStyle(0x123c66, 1);
      g.fillRoundedRect(8, 42, 8, 18, 3);
      g.fillRoundedRect(20, 42, 8, 18, 3);

      g.fillStyle(0x2461b1, 1);
      g.fillRoundedRect(7, 20, 22, 26, 5);
      g.fillRoundedRect(3, 22, 5, 17, 2);
      g.fillRoundedRect(28, 22, 5, 17, 2);
      g.fillStyle(0x619bf2, 1);
      g.fillRoundedRect(11, 24, 14, 15, 4);
      g.fillStyle(0xf4ce0f, 1);
      g.fillCircle(23, 31, 3);

      g.fillStyle(0xf3c9a2, 1);
      g.fillRoundedRect(11, 8, 14, 14, 5);
      g.fillCircle(5.5, 40, 3);
      g.fillCircle(30.5, 40, 3);
      g.fillStyle(0x22313f, 1);
      g.fillCircle(15, 15, 1.3);
      g.fillCircle(21, 15, 1.3);

      g.fillStyle(0xf4ce0f, 1);
      g.fillRoundedRect(8, 2, 20, 10, 5);
      g.fillStyle(0xd9b40a, 1);
      g.fillRoundedRect(5, 9, 26, 3, 2);

      g.generateTexture("inspector", 36, 64);
      g.destroy();
    }

    if (!this.textures.exists("mateo")) {
      const g = this.add.graphics();

      g.fillStyle(0xf3c9a2, 1);
      g.fillRect(8, 36, 4, 8);
      g.fillRect(16, 36, 4, 8);
      g.fillStyle(0x2f4f6f, 1);
      g.fillRoundedRect(6, 28, 16, 9, 3);
      g.fillStyle(0xd93b3b, 1);
      g.fillRoundedRect(5, 13, 18, 17, 4);
      g.fillStyle(0xf3c9a2, 1);
      g.fillCircle(14, 8, 7);
      g.fillStyle(0x2b1d12, 1);
      g.fillEllipse(14, 4, 15, 8);
      g.fillStyle(0x22313f, 1);
      g.fillCircle(11, 8, 1.1);
      g.fillCircle(17, 8, 1.1);

      g.generateTexture("mateo", 28, 44);
      g.destroy();
    }
  }

  drawHouse() {
    const { width, floorY } = LEVEL1.world;
    const wallTop = 120;
    const wallHeight = floorY - wallTop;

    // Roof and facade band.
    this.add.rectangle(width / 2, 60, width, 120, 0x1557b0).setDepth(0);
    this.add.rectangle(width / 2, 116, width, 10, 0x0e76a8).setDepth(0);

    ROOMS.forEach((room) => {
      const centerX = room.x + room.width / 2;
      this.add
        .rectangle(
          centerX,
          wallTop + wallHeight / 2,
          room.width,
          wallHeight,
          room.wall,
        )
        .setDepth(0);

      if (room.id === "exterior") {
        this.add
          .rectangle(centerX, floorY - 22, room.width, 44, 0xc7d3e0)
          .setDepth(1);
        this.add.rectangle(centerX, 190, room.width, 60, 0x8ec5f7).setDepth(0);
      } else {
        this.add
          .rectangle(room.x, wallTop + wallHeight / 2, 5, wallHeight, 0x9fb6cc)
          .setDepth(1);
        this.add
          .text(centerX, 138, room.name.toUpperCase(), {
            fontFamily: '"Inter", sans-serif',
            fontSize: "11px",
            fontStyle: "bold",
            color: "#5a3b22",
          })
          .setOrigin(0.5)
          .setDepth(2);
      }
    });

    this.drawFurniture();
  }

  drawFurniture() {
    const g = this.add.graphics().setDepth(2);

    // --- Kitchen (170 - 367) -------------------------------------------------
    g.fillStyle(0xc9a06a, 1);
    g.fillRoundedRect(184, 424, 172, 46, 4);
    g.fillStyle(0xe7d6bd, 1);
    g.fillRoundedRect(180, 416, 180, 12, 5);
    g.fillStyle(0x7fa8cc, 1);
    g.fillRoundedRect(204, 417, 64, 13, 4);
    g.fillRoundedRect(300, 419, 44, 11, 4);
    g.fillStyle(0xe7d6bd, 1);
    g.fillRoundedRect(186, 158, 116, 74, 5);
    g.lineStyle(2, 0xb99b74, 1);
    g.strokeRoundedRect(186, 158, 116, 74, 5);
    g.lineBetween(244, 160, 244, 230);

    // Faucets.
    g.fillStyle(0x9aa8b5, 1);
    g.fillRect(234, 396, 5, 26);
    g.fillRect(234, 396, 16, 4);
    g.fillRect(316, 402, 4, 18);
    g.fillRect(316, 402, 12, 4);

    // --- Washbasin (367 - 564) ----------------------------------------------
    g.fillStyle(0xcfe6f7, 1);
    g.fillRoundedRect(400, 188, 92, 84, 6);
    g.lineStyle(3, 0x9fb6cc, 1);
    g.strokeRoundedRect(400, 188, 92, 84, 6);
    g.fillStyle(0xdfe8f0, 1);
    g.fillRect(436, 424, 20, 46);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(446, 424, 84, 28);
    g.lineStyle(2, 0xb8c7d6, 1);
    g.strokeEllipse(446, 424, 84, 28);
    g.fillStyle(0x9aa8b5, 1);
    g.fillRect(450, 392, 5, 24);
    g.fillRect(450, 392, 14, 4);

    // Wet floor: the false alarm.
    g.fillStyle(0x9fd0f0, 0.75);
    g.fillEllipse(FALSE_ALARM.x, 458, 74, 16);
    g.fillEllipse(FALSE_ALARM.x + 26, 462, 26, 8);

    // --- Toilet (564 - 761) -------------------------------------------------
    g.fillStyle(0xeef3f8, 1);
    g.fillRoundedRect(624, 350, 58, 68, 5);
    g.lineStyle(2, 0xb8c7d6, 1);
    g.strokeRoundedRect(624, 350, 58, 68, 5);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(653, 430, 80, 46);
    g.lineStyle(3, 0xdbe6f0, 1);
    g.strokeEllipse(653, 430, 80, 46);
    g.fillStyle(0xdfe8f0, 1);
    g.fillRect(640, 442, 26, 28);

    // --- Shower (761 - 960) -------------------------------------------------
    g.fillStyle(0xb8c7d6, 1);
    g.fillRoundedRect(806, 314, 44, 8, 4);
    g.fillRect(826, 296, 5, 20);
    g.fillRect(826, 322, 5, 66);
    g.fillStyle(0x9aa8b5, 1);
    g.fillRect(900, 300, 5, 104);
    g.fillCircle(902, 366, 6);
    g.lineStyle(2, 0xc7d3e0, 1);
    g.strokeEllipse(880, 462, 44, 12);
    g.lineStyle(1, 0x9fb6cc, 0.7);
    for (let x = 780; x < 960; x += 30) {
      g.lineBetween(x, 300, x, 460);
    }
  }

  buildGround() {
    this.ground = this.add
      .rectangle(LEVEL1.world.width / 2, 500, LEVEL1.world.width, 60, 0x8a6a46)
      .setDepth(1);
    this.physics.add.existing(this.ground, true);
    this.add
      .rectangle(LEVEL1.world.width / 2, 472, LEVEL1.world.width, 5, 0x6f5334)
      .setDepth(2);
  }

  buildPlayer() {
    this.player = this.physics.add.sprite(140, 438, "inspector").setDepth(60);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 60);
    this.player.body.setOffset(8, 4);
    this.physics.add.collider(this.player, this.ground);
  }

  buildObjects() {
    this.objects = LEVEL1_OBJECTS.map((data) => {
      const entry = { ...data };

      if (data.kind === "tap") {
        entry.handle = this.add.graphics({ x: data.x, y: data.y }).setDepth(6);
        entry.handle.fillStyle(0x2f6fb5, 1);
        entry.handle.fillRoundedRect(-2, -4, 20, 6, 3);
        entry.handle.fillCircle(18, -1, 4);
      }

      const isTap = data.kind === "tap";
      entry.drop = this.add
        .ellipse(data.x, data.y + 6, isTap ? 3 : 5, isTap ? 12 : 8, 0x38bdf8)
        .setDepth(7);
      entry.tween = this.tweens.add({
        targets: entry.drop,
        y: data.y + 48,
        alpha: { from: 0.95, to: 0 },
        duration: isTap ? 700 : 1100,
        delay: Math.random() * 400,
        repeat: -1,
      });

      if (data.kind === "leak") {
        entry.marker = this.add
          .circle(data.x, data.y, 17, 0x00e5ff, 0.28)
          .setStrokeStyle(2, 0x00e5ff)
          .setDepth(52)
          .setAlpha(0);
      }

      return entry;
    });

    this.leakMarkers = this.objects
      .filter((obj) => obj.marker)
      .map((obj) => obj.marker);
  }

  buildMeter() {
    const x = 86;
    const y = 250;

    const panel = this.add.graphics().setDepth(55);
    panel.fillStyle(0xf7fafc, 1);
    panel.fillRoundedRect(x - 52, y - 74, 104, 156, 14);
    panel.lineStyle(3, 0x1557b0, 1);
    panel.strokeRoundedRect(x - 52, y - 74, 104, 156, 14);
    panel.fillStyle(0xe8f2fb, 1);
    panel.fillCircle(x, y, 40);
    panel.lineStyle(3, 0x1557b0, 1);
    panel.strokeCircle(x, y, 40);
    panel.lineStyle(2, 0x1557b0, 0.55);
    for (let i = -3; i <= 3; i += 1) {
      const angle = i * 0.28;
      panel.lineBetween(
        x + Math.sin(angle) * 33,
        y - Math.cos(angle) * 33,
        x + Math.sin(angle) * 39,
        y - Math.cos(angle) * 39,
      );
    }

    this.meterFlash = this.add.circle(x, y, 42, 0x00e5ff, 0).setDepth(55);

    this.needle = this.add
      .rectangle(x, y, 5, 34, 0xd93b3b)
      .setOrigin(0.5, 1)
      .setDepth(56);
    this.add.circle(x, y, 5, 0x1557b0).setDepth(57);

    this.add
      .text(x, y - 58, "MEDIDOR", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "10px",
        fontStyle: "bold",
        color: "#1557b0",
      })
      .setOrigin(0.5)
      .setDepth(56);

    this.meterText = this.add
      .text(x, y + 56, "80 L/día", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "13px",
        fontStyle: "bold",
        color: "#0b2740",
      })
      .setOrigin(0.5)
      .setDepth(56);
  }

  buildDetectorLayer() {
    this.overlay = this.add
      .rectangle(
        LEVEL1.world.width / 2,
        LEVEL1.world.height / 2,
        LEVEL1.world.width,
        LEVEL1.world.height,
        0x00122b,
        0,
      )
      .setDepth(50);

    this.pipes = this.add.graphics().setDepth(51).setAlpha(0);
    this.pipes.lineStyle(3, 0x00e5ff, 0.85);
    this.pipes.lineBetween(86, 330, 86, 440);
    this.pipes.lineBetween(86, 440, 940, 440);
    LEVEL1_OBJECTS.forEach((obj) => {
      this.pipes.lineBetween(obj.x, 440, obj.x, obj.y);
      this.pipes.fillStyle(0x00e5ff, 0.9);
      this.pipes.fillCircle(obj.x, obj.y, 3);
    });
  }

  buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.prompt = this.add
      .text(0, 0, "E  Interactuar", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#1557b0",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(80)
      .setVisible(false);
  }

  bindEvents() {
    this.onRepairResult = (payload) => this.applyRepair(payload);
    this.onDetectorRequest = () => this.activateDetector();

    EventBus.on("game:repair-result", this.onRepairResult);
    EventBus.on("game:detector-request", this.onDetectorRequest);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("game:repair-result", this.onRepairResult);
      EventBus.off("game:detector-request", this.onDetectorRequest);
    });
  }

  /* ------------------------------------------------------------------ loop */

  update(time) {
    if (!this.player) return;

    if (this.inputLocked) {
      this.player.setVelocityX(0);
    } else {
      const speed = 175;
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
        this.player.setVelocityY(-430);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.e)) this.tryInteract();
      if (Phaser.Input.Keyboard.JustDown(this.keys.space))
        this.activateDetector();
    }

    this.updatePrompt();
    this.updateNeedle(time);
  }

  updatePrompt() {
    const near = this.inputLocked ? null : this.findNearObject();
    this.nearObject = near;

    if (!near) {
      this.prompt.setVisible(false);
      return;
    }

    this.prompt
      .setText(near.kind === "tap" ? "E  Cerrar llave" : "E  Revisar")
      .setPosition(near.x, near.y - 44)
      .setVisible(true);
  }

  findNearObject() {
    let best = null;
    let bestDx = INTERACT_RANGE;

    for (const obj of this.objects) {
      if (obj.kind === "tap" && !this.tapsOpen.get(obj.id)) continue;
      if (obj.kind === "leak" && this.repaired.has(obj.id)) continue;

      const dx = Math.abs(this.player.x - obj.x);
      if (dx <= bestDx) {
        bestDx = dx;
        best = obj;
      }
    }

    return best;
  }

  updateNeedle(time) {
    if (!this.needle) return;

    const loss = this.leakTotal() + this.openTaps() * LEVEL1.openTapMeterBoost;
    const ratio = Math.min(loss / this.meterMax, 1);

    if (ratio > 0.002) {
      this.needleStopped = false;
      const amplitude = 0.16 + ratio * 0.5;
      const speed = 0.004 + ratio * 0.012;
      this.needle.rotation = Math.sin(time * speed) * amplitude;
      return;
    }

    if (this.needleStopped) return;
    this.needleStopped = true;

    this.tweens.add({
      targets: this.needle,
      rotation: 0,
      duration: 700,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: this.needle,
      scaleY: 1.14,
      duration: 150,
      yoyo: true,
    });
    this.cameras.main.shake(170, 0.003);

    this.meterFlash.setAlpha(0.65);
    this.tweens.add({ targets: this.meterFlash, alpha: 0, duration: 900 });
  }

  /* ------------------------------------------------------------- gameplay */

  tryInteract() {
    const obj = this.nearObject;
    if (!obj) return;

    if (obj.kind === "tap") {
      this.closeTap(obj);
      return;
    }

    this.inputLocked = true;
    this.prompt.setVisible(false);
    EventBus.emit("game:request-repair", {
      objectId: obj.id,
      label: obj.label,
      kind: obj.kind,
      hasLeak: obj.kind === "leak",
    });
  }

  closeTap(obj) {
    this.tapsOpen.set(obj.id, false);
    this.tweens.add({
      targets: obj.handle,
      rotation: -Math.PI / 2,
      duration: 220,
    });
    this.stopFlow(obj);
    this.emitState();

    if (this.openTaps() === 0) {
      this.say("Tato", TATO_LINES.tapsClosed);
      this.time.delayedCall(900, () => this.say("Tato", TATO_LINES.meterStill));
      this.scheduleMateo();
    }
  }

  applyRepair({ objectId, success, cancel = false } = {}) {
    // A wrong piece keeps the kit open, so the player stays locked in place.
    if (cancel || success) this.inputLocked = false;

    const obj = this.objects.find((item) => item.id === objectId);
    if (!obj || cancel) return;

    if (!success) {
      this.cameras.main.shake(120, 0.002);
      return;
    }

    if (obj.kind !== "leak" || this.repaired.has(obj.id)) return;

    this.repaired.add(obj.id);
    this.stopFlow(obj);

    if (obj.marker) {
      if (obj.marker.pulse) {
        obj.marker.pulse.stop();
        obj.marker.pulse = null;
      }
      obj.marker.setScale(1).setAlpha(0);
    }

    this.showCheck(obj.x, obj.y);
    this.emitState();
  }

  stopFlow(obj) {
    if (obj.tween) obj.tween.pause();
    if (obj.drop) obj.drop.setAlpha(0);
  }

  resumeFlow(obj) {
    if (obj.tween) obj.tween.resume();
    if (obj.drop) obj.drop.setAlpha(1);
  }

  showCheck(x, y) {
    const badge = this.add.circle(x, y - 10, 11, 0x1f9d55).setDepth(81);
    const text = this.add
      .text(x, y - 11, "✓", {
        fontFamily: '"Inter", sans-serif',
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(82);

    this.tweens.add({
      targets: [badge, text],
      y: "-=26",
      alpha: 0,
      duration: 1400,
      ease: "Sine.easeOut",
      onComplete: () => {
        badge.destroy();
        text.destroy();
      },
    });
  }

  scheduleMateo() {
    if (this.mateoScheduled || this.mateoEventDone) return;
    this.mateoScheduled = true;
    this.time.delayedCall(1600, () => this.runMateo());
  }

  runMateo() {
    const target = this.objects.find((obj) => obj.id === "llave_ducha");
    if (!target) return;

    this.mateo = this.add
      .sprite(1005, 470, "mateo")
      .setOrigin(0.5, 1)
      .setDepth(59);

    this.tweens.add({
      targets: this.mateo,
      x: target.x + 34,
      duration: 1900,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.mateoEventDone = true;
        this.mateoScheduled = false;

        this.tapsOpen.set("llave_ducha", true);
        target.handle.rotation = 0;
        this.tweens.add({
          targets: target.handle,
          rotation: 0.35,
          duration: 180,
          yoyo: true,
        });
        this.resumeFlow(target);
        this.emitState();

        this.say("Luz", LUZ_LINES.afterMateo);
        this.time.delayedCall(1100, () => this.say("Tato", TATO_LINES.mateo));

        this.time.delayedCall(2400, () => {
          if (!this.mateo) return;
          this.tweens.add({
            targets: this.mateo,
            x: 1010,
            alpha: 0,
            duration: 1300,
            ease: "Sine.easeIn",
            onComplete: () => {
              this.mateo.destroy();
              this.mateo = null;
            },
          });
        });
      },
    });
  }

  /* -------------------------------------------------------------- detector */

  activateDetector() {
    if (this.detectorOn) return;

    if (this.detectorCharges <= 0) {
      this.say("Tato", TATO_LINES.detectorEmpty);
      return;
    }

    this.detectorCharges -= 1;
    this.detectorOn = true;
    this.emitState();
    this.say("Tato", TATO_LINES.detectorOn);

    this.tweens.add({ targets: this.overlay, fillAlpha: 0.45, duration: 280 });
    this.tweens.add({ targets: this.pipes, alpha: 1, duration: 280 });

    this.leakMarkers.forEach((marker) => {
      if (!marker.active) return;
      marker.setAlpha(1);
      marker.pulse = this.tweens.add({
        targets: marker,
        scale: 1.3,
        alpha: 0.3,
        duration: 620,
        yoyo: true,
        repeat: -1,
      });
    });

    this.detectorTimer = this.time.delayedCall(LEVEL1.detectorDurationMs, () =>
      this.deactivateDetector(),
    );
  }

  deactivateDetector() {
    this.detectorOn = false;
    this.detectorTimer = null;
    this.emitState();

    this.tweens.add({ targets: this.overlay, fillAlpha: 0, duration: 320 });
    this.tweens.add({ targets: this.pipes, alpha: 0, duration: 320 });

    this.leakMarkers.forEach((marker) => {
      if (marker.pulse) {
        marker.pulse.stop();
        marker.pulse = null;
      }
      marker.setScale(1);
      marker.setAlpha(0);
    });
  }

  /* ---------------------------------------------------------------- state */

  leakTotal() {
    return LEAKS.filter((leak) => !this.repaired.has(leak.id)).reduce(
      (total, leak) => total + leak.perdidaDia,
      0,
    );
  }

  openTaps() {
    let open = 0;
    this.tapsOpen.forEach((isOpen) => {
      if (isOpen) open += 1;
    });
    return open;
  }

  emitState() {
    const perdidaDiaria = this.leakTotal();

    EventBus.emit("game:state", {
      perdidaDiaria,
      cargasDetector: this.detectorCharges,
      detectorActive: this.detectorOn,
      openTaps: this.openTaps(),
      leaksRepaired: this.repaired.size,
    });

    if (this.meterText) {
      this.meterText.setText(`${Math.round(perdidaDiaria)} L/día`);
    }

    this.checkComplete();
  }

  checkComplete() {
    if (this.completed) return;
    if (this.repaired.size < LEAKS.length) return;
    if (this.openTaps() > 0) return;
    if (!this.mateoEventDone) return;

    this.completed = true;
    this.say("Tato", TATO_LINES.allRepaired);
    this.time.delayedCall(900, () => this.say("Luz", LUZ_LINES.afterRepair));
    this.time.delayedCall(2600, () => EventBus.emit("game:complete"));
  }

  say(speaker, text) {
    EventBus.emit("game:message", { speaker, text });
  }
}
