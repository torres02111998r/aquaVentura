import Phaser from "phaser";
import { EventBus } from "../EventBus";
import { SoundFX } from "../utils/SoundFX";
import {
  LEVEL1,
  LAYOUT,
  FURNITURE,
  FIXTURES,
  TATO_LINES,
  LUZ_LINES,
} from "../data/level1Data";

const BODY_FONT = "Inter, system-ui, 'Segoe UI', sans-serif";
const DISPLAY_FONT = "Ultra, Rockwell, Georgia, serif";

const INTERACT_RANGE = 64;
const PLAYER_HEIGHT = 118;
const WALK_SPEED = 190;

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1Scene");
  }

  init() {
    this.failedLoads = new Set();

    this.floor = "ground";
    this.completed = false;
    this.meterVerified = false;
    this.meterOutsideShown = false;

    this.enteredHouse = false;
    this.awaitingEstimate = false;
    this.estimateDone = false;
    this.inputLocked = false;
    this.transitioning = false;

    this.detectorOn = false;
    this.detectorCharges = LEVEL1.detectorCharges;
    this.detectorTimer = null;

    this.repaired = new Set();
    this.closedTaps = new Set();
    this.identified = new Set();

    this.mateoScheduled = false;
    this.mateoEventDone = false;
    this.mateo = null;

    this.stepAccum = 0;
    this.dripAccum = 0;
    this.dripSoundAccum = 0;
  }

  preload() {
    const loadIfMissing = (key, path) => {
      if (!this.textures.exists(key)) this.load.image(key, path);
    };

    this.load.on("loaderror", (file) => {
      if (file?.key) this.failedLoads.add(file.key);
    });

    loadIfMissing("f_cocina", "/assets/furniture/cocina.png");
    loadIfMissing("f_lavamanos", "/assets/furniture/lavamanos.png");
    loadIfMissing("f_inodoro", "/assets/furniture/inodoro.png");
    loadIfMissing("f_ducha", "/assets/furniture/ducha.png");

    loadIfMissing("p_luz", "/assets/portraits/luz.png");
    loadIfMissing("p_inspector", "/assets/portraits/inspector.png");
    loadIfMissing("p_sheet", "/assets/portraits/inspector_sheet.png");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b2a4a");
    this.physics.world.setBounds(0, 0, LAYOUT.world.width, LAYOUT.world.height);

    this.buildFallbackTextures();
    this.drawSky();
    this.drawRoof();
    this.drawHouse();
    this.drawExterior();
    this.drawStairs();
    this.buildFurniture();
    this.buildFixtures();
    this.buildLuz();
    this.buildMeter();
    this.buildDetectorLayer();
    this.buildPlayer();
    this.buildPrompt();
    this.buildInput();
    this.bindEvents();

    this.refreshFixtureVisuals();
    this.emitState();

    // Phaser may boot inside the Game constructor, before React subscribes.
    // Re-emit once so the HUD always receives the opening state.
    this.time.delayedCall(150, () => {
      if (this.sys?.isActive()) this.emitState();
    });
  }

  // ---------------------------------------------------------------------------
  // Textures and drawing
  // ---------------------------------------------------------------------------

  buildFallbackTextures() {
    if (!this.textures.exists("inspector")) {
      const g = this.add.graphics();
      g.fillStyle(0x1557b0, 1);
      g.fillRoundedRect(8, 26, 22, 34, 6);
      g.fillStyle(0xf2c9a0, 1);
      g.fillCircle(19, 18, 11);
      g.fillStyle(0x0e76a8, 1);
      g.fillRect(8, 12, 22, 6);
      g.generateTexture("inspector", 38, 64);
      g.destroy();
    }

    if (!this.textures.exists("mateo")) {
      const g = this.add.graphics();
      g.fillStyle(0xf2c9a0, 1);
      g.fillCircle(22, 16, 10);
      g.fillStyle(0xf59e0b, 1);
      g.fillRoundedRect(8, 26, 28, 34, 6);
      g.fillStyle(0x1557b0, 1);
      g.fillRect(11, 60, 8, 16);
      g.fillRect(25, 60, 8, 16);
      g.generateTexture("mateo", 44, 80);
      g.destroy();
    }
  }

  drawSky() {
    const g = this.add.graphics().setDepth(0);

    g.fillGradientStyle(0x9cc9f7, 0x9cc9f7, 0xe2f0ff, 0xe2f0ff, 1);
    g.fillRect(0, 0, LAYOUT.exterior.width, LAYOUT.streetY);

    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(50, 88, 18);
    g.fillCircle(72, 84, 22);
    g.fillCircle(94, 90, 16);

    g.fillStyle(0xbfe0c8, 0.75);
    g.fillEllipse(58, 372, 190, 96);

    // Sidewalk and road.
    g.fillStyle(0xcfd8e3, 1);
    g.fillRect(0, LAYOUT.streetY, LAYOUT.world.width, 24);
    g.fillStyle(0x8fa0b5, 1);
    g.fillRect(0, LAYOUT.streetY + 24, LAYOUT.world.width, 40);
    g.fillStyle(0xf4ce0f, 0.9);
    g.fillRect(0, LAYOUT.streetY + 42, LAYOUT.world.width, 4);

    // Sidewalk joints.
    g.lineStyle(1, 0xb6c3d2, 0.8);
    for (let x = 0; x <= LAYOUT.exterior.width; x += 26) {
      g.lineBetween(x, LAYOUT.streetY, x, LAYOUT.streetY + 24);
    }
  }

  drawRoof() {
    const { x1, x2, ridgeX, ridgeY, eaveY } = LAYOUT.roof;
    const g = this.add.graphics().setDepth(50);

    g.fillStyle(0x6f3418, 0.28);
    g.beginPath();
    g.moveTo(x1 - 6, eaveY + 18);
    g.lineTo(ridgeX, ridgeY + 16);
    g.lineTo(x2 + 6, eaveY + 18);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xc4622d, 1);
    g.beginPath();
    g.moveTo(x1, eaveY);
    g.lineTo(ridgeX, ridgeY);
    g.lineTo(x2, eaveY);
    g.closePath();
    g.fillPath();

    const rows = 9;
    for (let row = 0; row < rows; row += 1) {
      const t = (row + 1) / rows;
      const y = ridgeY + t * (eaveY - ridgeY);
      const half = t * (ridgeX - x1);
      const start = ridgeX - half;
      const end = ridgeX + half;
      const offset = row % 2 === 0 ? 0 : 7;

      for (let x = start + offset; x < end; x += 14) {
        g.fillStyle(row % 2 === 0 ? 0xd97742 : 0xb9571f, 0.92);
        g.beginPath();
        g.arc(x, y, 7, 0, Math.PI, false);
        g.closePath();
        g.fillPath();
      }
    }

    g.fillStyle(0x8a3f22, 1);
    g.fillRect(ridgeX - 10, ridgeY - 2, 20, 10);
    g.fillRect(x1 - 6, eaveY, x2 - x1 + 12, 12);
    g.fillStyle(0xa84f28, 1);
    g.fillRect(x1 - 6, eaveY, x2 - x1 + 12, 4);

    // Chimney.
    g.fillStyle(0xa9562f, 1);
    g.fillRect(720, 34, 34, 54);
    g.fillStyle(0x7a3b1f, 1);
    g.fillRect(714, 28, 46, 10);
  }

  drawHouse() {
    const g = this.add.graphics().setDepth(2);
    const { house, upper, lower, slab, stairs } = LAYOUT;

    // Upper floor: bathroom tiles.
    g.fillStyle(0xf4ecdf, 1);
    g.fillRect(house.x, upper.wallTop, house.width, upper.height);
    g.fillStyle(0xe7f3fb, 1);
    g.fillRect(house.x, upper.wallTop, house.width, 74);

    g.lineStyle(1, 0xcfe6f5, 0.9);
    for (let x = house.x; x <= house.x + house.width; x += 26) {
      g.lineBetween(x, upper.wallTop, x, upper.wallTop + 74);
    }
    for (let y = upper.wallTop; y <= upper.wallTop + 74; y += 18) {
      g.lineBetween(house.x, y, house.x + house.width, y);
    }

    // Lower floor: lobby and kitchen.
    g.fillStyle(0xf8eeda, 1);
    g.fillRect(house.x, lower.wallTop, house.width, lower.height);
    g.fillStyle(0xf1e3c8, 1);
    g.fillRect(470, lower.wallTop, 490, lower.height);

    g.lineStyle(1, 0xe3d3b2, 0.8);
    for (let x = 470; x <= 960; x += 30) {
      g.lineBetween(x, lower.wallTop, x, lower.floorY);
    }
    for (let y = lower.wallTop; y <= lower.floorY; y += 26) {
      g.lineBetween(470, y, 960, y);
    }

    // Slab with a stairwell gap.
    g.fillStyle(0xd9c6a5, 1);
    g.fillRect(house.x, slab.y, stairs.x1 - house.x, slab.height);
    g.fillRect(stairs.x2, slab.y, 960 - stairs.x2, slab.height);
    g.fillStyle(0xbfa982, 1);
    g.fillRect(house.x, slab.y + slab.height - 4, stairs.x1 - house.x, 4);
    g.fillRect(stairs.x2, slab.y + slab.height - 4, 960 - stairs.x2, 4);

    // Room dividers.
    g.fillStyle(0xc9b18d, 1);
    g.fillRect(478, upper.wallTop, 6, upper.height);
    g.fillRect(716, upper.wallTop, 6, upper.height);
    g.fillRect(466, lower.wallTop, 6, lower.height);

    // Baseboards.
    g.fillStyle(0xb59a72, 1);
    g.fillRect(house.x, upper.floorY - 6, house.width, 6);
    g.fillRect(house.x, lower.floorY - 6, house.width, 6);

    // Windows.
    const drawWindow = (x, y) => {
      g.fillStyle(0xbfe3ff, 1);
      g.fillRoundedRect(x, y, 46, 42, 6);
      g.lineStyle(3, 0xffffff, 1);
      g.strokeRoundedRect(x, y, 46, 42, 6);
      g.lineStyle(2, 0xffffff, 0.9);
      g.lineBetween(x + 23, y, x + 23, y + 42);
      g.lineBetween(x, y + 21, x + 46, y + 21);
    };
    drawWindow(232, 198);
    drawWindow(650, 198);

    // Door and threshold.
    g.fillStyle(0x8b5a2b, 1);
    g.fillRoundedRect(194, LAYOUT.door.y, 32, LAYOUT.door.height, 5);
    g.fillStyle(0x6f4420, 1);
    g.fillRoundedRect(200, LAYOUT.door.y + 6, 20, LAYOUT.door.height - 12, 4);
    g.fillStyle(0xf4ce0f, 1);
    g.fillCircle(216, LAYOUT.door.y + 44, 3);
    g.fillStyle(0xb59a72, 1);
    g.fillRect(192, lower.floorY - 6, 40, 6);

    // Rug in the lobby.
    g.fillStyle(0xc98b6b, 0.35);
    g.fillEllipse(268, 470, 118, 16);

    // Room labels.
    const label = (x, y, text) => {
      this.add
        .text(x, y, text, {
          fontFamily: BODY_FONT,
          fontSize: "10px",
          fontStyle: "bold",
          color: "#8a7455",
        })
        .setDepth(3)
        .setAlpha(0.85);
    };
    label(222, 128, "LAVAMANOS");
    label(494, 128, "INODORO");
    label(730, 128, "DUCHA");
    label(222, 336, "RECIBIDOR");
    label(486, 336, "COCINA");
  }

  drawExterior() {
    const g = this.add.graphics().setDepth(1);

    // Fence.
    g.fillStyle(0xe7d6bd, 1);
    for (let x = 8; x <= 190; x += 22) {
      g.fillRoundedRect(x, 440, 8, 36, 3);
    }
    g.fillRect(6, 452, 190, 5);

    // Tree.
    g.fillStyle(0x8a5a2b, 1);
    g.fillRect(38, 420, 9, 56);
    g.fillStyle(0x6fbf73, 1);
    g.fillCircle(42, 404, 26);
    g.fillCircle(24, 416, 17);
    g.fillCircle(60, 416, 17);

    // Plaque.
    g.fillStyle(0xffffff, 0.85);
    g.fillRoundedRect(82, 348, 86, 17, 5);
    this.add
      .text(125, 356, "CASA ORTIZ", {
        fontFamily: DISPLAY_FONT,
        fontSize: "9px",
        color: "#1557b0",
      })
      .setOrigin(0.5)
      .setDepth(17);
  }

  drawStairs() {
    const g = this.add.graphics().setDepth(6);
    const { baseX, topX, baseY, topY, steps } = LAYOUT.stairs;

    const dx = (topX - baseX) / steps;
    const dy = (topY - baseY) / steps;

    for (let i = 0; i < steps; i += 1) {
      const x = baseX + dx * i;
      const y = baseY + dy * i;

      g.fillStyle(0xa9793f, 1);
      g.fillRect(x, y - 10, 24, 10);
      g.fillStyle(0xc99a5c, 1);
      g.fillRect(x, y - 14, 26, 6);
    }

    // Handrail.
    g.lineStyle(4, 0x8a5a2b, 1);
    g.lineBetween(baseX + 6, baseY - 74, topX + 6, topY - 74);
    g.lineStyle(2, 0x8a5a2b, 1);
    for (let i = 0; i <= steps; i += 1) {
      const x = baseX + dx * i + 6;
      const y = baseY + dy * i;
      g.lineBetween(x, y - 70, x, y - 8);
    }
  }

  buildFurniture() {
    FURNITURE.forEach((item) => {
      const ready =
        this.textures.exists(item.key) && !this.failedLoads.has(item.key);

      if (ready) {
        const image = this.add
          .image(item.x, item.baseY, item.key)
          .setOrigin(0.5, 1)
          .setDepth(10);
        image.setScale(item.height / image.height);
      } else {
        this.drawFurniturePlaceholder(item);
      }
    });
  }

  drawFurniturePlaceholder(item) {
    const width = item.height * 0.9;
    const g = this.add.graphics().setDepth(10);

    g.fillStyle(0xe7d6bd, 1);
    g.fillRoundedRect(
      item.x - width / 2,
      item.baseY - item.height,
      width,
      item.height,
      10,
    );
    g.lineStyle(2, 0xb59a72, 1);
    g.strokeRoundedRect(
      item.x - width / 2,
      item.baseY - item.height,
      width,
      item.height,
      10,
    );

    this.add
      .text(item.x, item.baseY - item.height / 2, item.room.toUpperCase(), {
        fontFamily: BODY_FONT,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#7a5c3a",
      })
      .setOrigin(0.5)
      .setDepth(11);
  }

  buildFixtures() {
    FIXTURES.forEach((fixture) => {
      // Tap wheel.
      if (fixture.hasTap) {
        const wheel = this.add.circle(0, 0, 8, 0xdfe8f2);
        wheel.setStrokeStyle(2, 0x7f93a8);
        const spokeH = this.add.rectangle(0, 0, 14, 2, 0x7f93a8);
        const spokeV = this.add.rectangle(0, 0, 2, 14, 0x7f93a8);

        const container = this.add.container(fixture.x, fixture.y, [
          wheel,
          spokeH,
          spokeV,
        ]);
        container.setDepth(14);
        container.setRotation(0);
        fixture.tapRef = container;
      }

      // Puddle.
      const puddle = this.add
        .ellipse(
          fixture.puddle.x,
          fixture.puddle.y,
          fixture.puddle.w,
          fixture.puddle.h,
          0x38bdf8,
          0.32,
        )
        .setDepth(4)
        .setVisible(false);
      this.tweens.add({
        targets: puddle,
        alpha: { from: 0.2, to: 0.42 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      fixture.puddleRef = puddle;

      // Detector markers for real leaks only.
      if (fixture.hasLeak) {
        const marker = this.add
          .circle(fixture.marker.x, fixture.marker.y, 16, 0x00e5ff, 0.25)
          .setStrokeStyle(2, 0x00e5ff, 0.9)
          .setDepth(53)
          .setAlpha(0);

        const ring = this.add
          .circle(fixture.marker.x, fixture.marker.y, 16, 0x000000, 0)
          .setStrokeStyle(3, 0x00e5ff, 0.9)
          .setDepth(54)
          .setAlpha(0);

        const label = this.add
          .text(fixture.marker.x, fixture.marker.y - 26, "FUGA", {
            fontFamily: BODY_FONT,
            fontSize: "9px",
            fontStyle: "bold",
            color: "#00e5ff",
          })
          .setOrigin(0.5)
          .setDepth(55)
          .setAlpha(0);

        const pulse = this.tweens.add({
          targets: ring,
          scale: { from: 1, to: 1.7 },
          alpha: { from: 0.9, to: 0 },
          duration: 1000,
          repeat: -1,
          ease: "Sine.easeOut",
          paused: true,
        });

        fixture.markerRef = marker;
        fixture.ringRef = ring;
        fixture.labelRef = label;
        fixture.pulseTween = pulse;
      }
    });
  }

  buildLuz() {
    const ready =
      this.textures.exists("p_luz") && !this.failedLoads.has("p_luz");

    if (ready) {
      const luz = this.add
        .image(LAYOUT.luz.x, LAYOUT.luz.y, "p_luz")
        .setOrigin(0.5, 1)
        .setDepth(18);
      luz.setScale(150 / luz.height);

      this.tweens.add({
        targets: luz,
        scaleY: luz.scaleY * 1.012,
        duration: 1900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.luzRef = luz;
    } else {
      this.luzRef = this.add
        .text(LAYOUT.luz.x, LAYOUT.luz.y - 8, "Luz", {
          fontFamily: BODY_FONT,
          fontSize: "14px",
          fontStyle: "bold",
          color: "#1557b0",
        })
        .setOrigin(0.5, 1)
        .setDepth(18);
    }
  }

  buildMeter() {
    const { x, y } = LAYOUT.meter;
    const dialY = y - 20;
    const spread = Math.PI * 0.42;

    const g = this.add.graphics().setDepth(16);

    g.fillStyle(0x8a6a46, 1);
    g.fillRect(x - 5, y + 30, 10, 20);

    g.fillStyle(0xf6f1e6, 1);
    g.fillRoundedRect(x - 44, y - 56, 88, 92, 10);
    g.lineStyle(3, 0x0e76a8, 1);
    g.strokeRoundedRect(x - 44, y - 56, 88, 92, 10);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(x, dialY, 26);
    g.lineStyle(2, 0x9db4c9, 1);
    g.strokeCircle(x, dialY, 26);

    g.lineStyle(2, 0x6f8aa3, 1);
    for (let i = 0; i <= 6; i += 1) {
      const angle = -spread + (i / 6) * spread * 2;
      const innerX = x + Math.sin(angle) * 18;
      const innerY = dialY - Math.cos(angle) * 18;
      const outerX = x + Math.sin(angle) * 23;
      const outerY = dialY - Math.cos(angle) * 23;
      g.lineBetween(innerX, innerY, outerX, outerY);
    }

    this.meterNeedle = this.add
      .rectangle(x, dialY, 3, 24, 0xd62828)
      .setOrigin(0.5, 1)
      .setDepth(18);
    this.meterNeedle.rotation = -spread;

    this.meterGlow = this.add
      .circle(x, dialY, 40, 0x00e5ff, 1)
      .setDepth(15)
      .setAlpha(0);

    this.add
      .text(x, y + 24, "MEDIDOR", {
        fontFamily: BODY_FONT,
        fontSize: "8px",
        fontStyle: "bold",
        color: "#0e76a8",
      })
      .setOrigin(0.5)
      .setDepth(17);

    this.meterText = this.add
      .text(x, y + 8, "80 L/día", {
        fontFamily: BODY_FONT,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#0b2a4a",
      })
      .setOrigin(0.5)
      .setDepth(17);
  }

  buildDetectorLayer() {
    this.detectorOverlay = this.add
      .rectangle(
        LAYOUT.world.width / 2,
        LAYOUT.world.height / 2,
        LAYOUT.world.width,
        LAYOUT.world.height,
        0x03142b,
        1,
      )
      .setDepth(48)
      .setAlpha(0);

    const pipes = this.add.graphics().setDepth(49).setAlpha(0);
    const riserX = 200;

    pipes.lineStyle(2, 0x00e5ff, 0.6);
    FIXTURES.forEach((fixture) => {
      pipes.beginPath();
      pipes.moveTo(fixture.x, fixture.y);
      pipes.lineTo(riserX, fixture.y);
      pipes.lineTo(riserX, LAYOUT.meter.y);
      pipes.lineTo(LAYOUT.meter.x, LAYOUT.meter.y);
      pipes.strokePath();

      pipes.fillStyle(0x00e5ff, 0.85);
      pipes.fillCircle(fixture.x, fixture.y, 4);
    });

    pipes.fillStyle(0x00e5ff, 0.85);
    pipes.fillCircle(riserX, LAYOUT.meter.y, 5);

    this.pipeLayer = pipes;
  }

  buildPlayer() {
    const useSheet = this.buildWalkAnimation();

    let key = "inspector";
    if (useSheet) key = "p_sheet";
    else if (this.textures.exists("p_inspector") && !this.failedLoads.has("p_inspector")) {
      key = "p_inspector";
    }

    this.playerUsesSheet = useSheet;
    this.player = this.physics.add.sprite(
      LAYOUT.playerStart.x,
      LAYOUT.playerStart.y,
      key,
      useSheet ? 0 : undefined,
    );

    this.player.setOrigin(0.5, 1).setDepth(40);
    if (useSheet) this.player.setDisplaySize(56, PLAYER_HEIGHT);
    else if (key === "p_inspector") this.player.setDisplaySize(88, PLAYER_HEIGHT);
    else this.player.setDisplaySize(66, PLAYER_HEIGHT);

    this.player.body.setAllowGravity(false);
  }

  buildWalkAnimation() {
    const key = "p_sheet";
    if (!this.textures.exists(key) || this.failedLoads.has(key)) return false;

    const texture = this.textures.get(key);
    const source = texture.getSourceImage();
    if (!source?.width || !source?.height) return false;

    const frameWidth = Math.floor(source.width / 4);
    if (frameWidth < 16) return false;

    for (let i = 0; i < 4; i += 1) {
      if (!texture.has(i)) {
        texture.add(i, 0, i * frameWidth, 0, frameWidth, source.height);
      }
    }

    if (!this.anims.exists("inspector-walk")) {
      this.anims.create({
        key: "inspector-walk",
        frames: [0, 1, 2, 3].map((frame) => ({ key, frame })),
        frameRate: 10,
        repeat: -1,
      });
    }

    return true;
  }

  buildPrompt() {
    this.prompt = this.add
      .text(0, 0, "", {
        fontFamily: BODY_FONT,
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#0b2a4a",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(70)
      .setVisible(false);
  }

  buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      detector: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.input.keyboard.once("keydown", () => SoundFX.unlock());
    this.input.once("pointerdown", () => SoundFX.unlock());
  }

  bindEvents() {
    this.onRepairResult = (payload) => this.applyRepair(payload);
    this.onDetectorRequest = () => this.activateDetector();
    this.onEstimateSubmitted = () => this.handleEstimateSubmitted();

    EventBus.on("game:repair-result", this.onRepairResult);
    EventBus.on("game:detector-request", this.onDetectorRequest);
    EventBus.on("level1:estimate-submitted", this.onEstimateSubmitted);

    this.events.once("shutdown", () => {
      EventBus.off("game:repair-result", this.onRepairResult);
      EventBus.off("game:detector-request", this.onDetectorRequest);
      EventBus.off("level1:estimate-submitted", this.onEstimateSubmitted);
    });
  }

  // ---------------------------------------------------------------------------
  // State helpers
  // ---------------------------------------------------------------------------

  floorY() {
    return this.floor === "upper" ? LAYOUT.upper.floorY : LAYOUT.lower.floorY;
  }

  isWet(fixture) {
    if (fixture.hasTap && !this.closedTaps.has(fixture.id)) return true;
    if (fixture.hasLeak && !this.repaired.has(fixture.objectId)) return true;
    return false;
  }

  leakTotal() {
    return FIXTURES.reduce((total, fixture) => {
      if (!fixture.hasLeak) return total;
      if (this.repaired.has(fixture.objectId)) return total;
      return total + fixture.perdidaDia;
    }, 0);
  }

  openTaps() {
    return FIXTURES.filter(
      (fixture) => fixture.hasTap && !this.closedTaps.has(fixture.id),
    ).length;
  }

  remainingLeaks() {
    return FIXTURES.filter(
      (fixture) => fixture.hasLeak && !this.repaired.has(fixture.objectId),
    ).length;
  }

  currentMission() {
    if (this.meterVerified) return "Nivel completado";
    if (this.awaitingEstimate) return "Estima cuánta agua se pierde al día";
    if (!this.enteredHouse) return LEVEL1.missionText;
    if (this.openTaps() > 0) return "Cierra las llaves abiertas";
    if (this.remainingLeaks() > 0) return "Busca de dónde gotea";
    return "Vuelve al medidor y verifica";
  }

  emitState() {
    const perdidaDiaria = this.leakTotal();

    EventBus.emit("game:state", {
      perdidaDiaria,
      cargasDetector: this.detectorCharges,
      detectorActive: this.detectorOn,
      openTaps: this.openTaps(),
      leaksRepaired: this.repaired.size,
      missionText: this.currentMission(),
    });

    this.meterText?.setText(`${Math.round(perdidaDiaria)} L/día`);
  }

  refreshFixtureVisuals() {
    FIXTURES.forEach((fixture) => {
      if (!fixture.puddleRef) return;
      const wet = this.isWet(fixture) || fixture.alwaysWet;
      const revealed =
        !fixture.silent || this.identified.has(fixture.id) || this.detectorOn;
      fixture.puddleRef.setVisible(wet && revealed);
    });
  }

  refreshTapVisual(fixture) {
    if (!fixture.tapRef) return;
    const open = !this.closedTaps.has(fixture.id);
    this.tweens.add({
      targets: fixture.tapRef,
      rotation: open ? 0 : 0.85,
      alpha: open ? 1 : 0.75,
      duration: 240,
      ease: "Sine.easeOut",
    });
  }

  setKeyboardEnabled(enabled) {
    if (this.input?.keyboard) this.input.keyboard.enabled = enabled;
  }

  say(speaker, text) {
    if (!text) return;
    if (speaker === "Tato") SoundFX.playRadio();
    EventBus.emit("game:message", { speaker, text });
  }

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  findNearFixture() {
    let best = null;
    let bestDistance = INTERACT_RANGE;

    FIXTURES.forEach((fixture) => {
      if (fixture.floor !== this.floor) return;
      const distance = Math.abs(this.player.x - fixture.x);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = fixture;
      }
    });

    return best;
  }

  isNearMeter() {
    return (
      this.floor === "ground" &&
      Math.abs(this.player.x - LAYOUT.meter.x) <= 78
    );
  }

  onStairs() {
    return (
      this.player.x >= LAYOUT.stairs.x1 - 20 &&
      this.player.x <= LAYOUT.stairs.x2 + 20
    );
  }

  tryInteract() {
    if (this.awaitingEstimate) {
      this.say("Tato", TATO_LINES.needEstimate);
      return;
    }

    const fixture = this.findNearFixture();
    const meterNear = this.isNearMeter();

    if (fixture) {
      const fixtureDistance = Math.abs(this.player.x - fixture.x);
      const meterDistance = Math.abs(this.player.x - LAYOUT.meter.x);
      if (!meterNear || fixtureDistance <= meterDistance) {
        this.interactFixture(fixture);
        return;
      }
    }

    if (meterNear) this.verifyMeter();
  }

  interactFixture(fixture) {
    if (fixture.hasTap && !this.closedTaps.has(fixture.id)) {
      this.closeTap(fixture);
      return;
    }

    if (fixture.hasLeak && this.repaired.has(fixture.objectId)) return;

    if (fixture.falseAlarm && fixture.confirmedFalse) {
      this.say("Tato", TATO_LINES.falseAlarm);
      return;
    }

    this.inputLocked = true;
    EventBus.emit("game:request-repair", {
      objectId: fixture.objectId,
      label: fixture.label,
      kind: fixture.kind,
      hasLeak: fixture.hasLeak,
    });
  }

  closeTap(fixture) {
    if (this.closedTaps.has(fixture.id)) return;

    this.closedTaps.add(fixture.id);
    SoundFX.playValve();
    this.refreshTapVisual(fixture);
    this.refreshFixtureVisuals();
    this.emitState();

    if (this.openTaps() === 0 && !this.mateoScheduled) {
      this.say("Tato", TATO_LINES.tapsClosed);
      this.scheduleMateo();
    }
  }

  applyRepair(payload) {
    if (!payload) return;

    const fixture = FIXTURES.find(
      (item) => item.objectId === payload.objectId,
    );
    if (!fixture) {
      this.inputLocked = false;
      return;
    }

    if (payload.cancel) {
      this.inputLocked = false;
      return;
    }

    if (payload.success) {
      this.inputLocked = false;
      if (fixture.hasLeak && !this.repaired.has(fixture.objectId)) {
        this.repaired.add(fixture.objectId);
        this.identified.add(fixture.id);
        SoundFX.playRepair();
        this.showRepairSpark(fixture);
        this.refreshFixtureVisuals();
        this.emitState();

        if (this.remainingLeaks() === 0) {
          this.say("Tato", TATO_LINES.goMeter);
        }
      }
      return;
    }

    // Wrong piece on the false alarm: close the modal so only one piece is lost.
    if (fixture.falseAlarm) {
      fixture.confirmedFalse = true;
      this.inputLocked = false;
      EventBus.emit("game:repair-close");
      this.say("Tato", TATO_LINES.falseAlarm);
    }
  }

  showRepairSpark(fixture) {
    for (let i = 0; i < 8; i += 1) {
      const spark = this.add
        .circle(fixture.x, fixture.y, 3, 0x2ee56b, 1)
        .setDepth(60);
      this.tweens.add({
        targets: spark,
        x: fixture.x + Phaser.Math.Between(-42, 42),
        y: fixture.y + Phaser.Math.Between(-32, 32),
        alpha: 0,
        duration: 600,
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  verifyMeter() {
    if (this.meterVerified) return;

    if (this.openTaps() > 0) {
      this.say("Tato", TATO_LINES.meterNeedsTaps);
      return;
    }

    if (this.remainingLeaks() > 0) {
      this.say("Tato", TATO_LINES.meterStill);
      return;
    }

    this.meterVerified = true;
    this.completed = true;

    SoundFX.playMeterStop();
    this.cameras.main.shake(180, 0.004);

    this.tweens.add({
      targets: this.meterNeedle,
      rotation: -Math.PI * 0.42,
      duration: 700,
      ease: "Back.easeOut",
    });

    this.meterGlow.setAlpha(0.7);
    this.tweens.add({
      targets: this.meterGlow,
      alpha: 0,
      duration: 1200,
    });

    this.say("Luz", LUZ_LINES.afterRepair);
    this.emitState();

    this.time.delayedCall(2600, () => {
      if (this.sys?.isActive()) EventBus.emit("game:complete");
    });
  }

  // ---------------------------------------------------------------------------
  // Narrative triggers
  // ---------------------------------------------------------------------------

  checkEnterHouse() {
    if (this.enteredHouse) return false;
    if (this.player.x <= LAYOUT.house.x + 4) return false;

    this.enteredHouse = true;
    this.awaitingEstimate = true;
    this.setKeyboardEnabled(false);
    this.say("Luz", LUZ_LINES.intro);
    this.emitState();

    this.time.delayedCall(650, () => {
      if (!this.sys?.isActive()) return;
      this.say("Tato", TATO_LINES.estimate);
      EventBus.emit("level1:estimate-request");
    });

    return true;
  }

  handleEstimateSubmitted() {
    if (!this.sys?.isActive()) return;

    this.awaitingEstimate = false;
    this.estimateDone = true;
    this.setKeyboardEnabled(true);
    this.say("Tato", TATO_LINES.afterEstimate);
    this.emitState();
  }

  scheduleMateo() {
    if (this.mateoScheduled || this.mateoEventDone) return;
    this.mateoScheduled = true;

    this.time.delayedCall(1600, () => this.playMateo());
  }

  playMateo() {
    if (this.mateoEventDone) return;
    this.mateoEventDone = true;

    const shower = FIXTURES.find((fixture) => fixture.id === "ducha");
    if (!shower) return;

    this.closedTaps.delete(shower.id);
    this.refreshTapVisual(shower);
    this.refreshFixtureVisuals();
    this.emitState();

    this.say("Luz", LUZ_LINES.afterMateo);

    if (this.textures.exists("mateo")) {
      this.mateo = this.add
        .image(1000, LAYOUT.upper.floorY, "mateo")
        .setOrigin(0.5, 1)
        .setDepth(42)
        .setDisplaySize(56, 112);

      this.tweens.add({
        targets: this.mateo,
        x: 880,
        duration: 900,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.time.delayedCall(700, () => {
            if (!this.mateo) return;
            this.tweens.add({
              targets: this.mateo,
              x: 1010,
              alpha: 0,
              duration: 900,
              ease: "Sine.easeIn",
              onComplete: () => {
                this.mateo?.destroy();
                this.mateo = null;
              },
            });
          });
        },
      });
    }

    this.time.delayedCall(1200, () => {
      if (this.sys?.isActive()) this.say("Tato", TATO_LINES.mateo);
    });
  }

  // ---------------------------------------------------------------------------
  // Detector
  // ---------------------------------------------------------------------------

  activateDetector() {
    if (this.detectorOn || this.awaitingEstimate || this.meterVerified) return;

    const remaining = FIXTURES.filter(
      (fixture) => fixture.hasLeak && !this.repaired.has(fixture.objectId),
    );

    if (remaining.length === 0) {
      this.say("Tato", TATO_LINES.detectorClear);
      return;
    }

    if (this.detectorCharges <= 0) {
      this.say("Tato", TATO_LINES.detectorEmpty);
      return;
    }

    this.detectorCharges -= 1;
    this.detectorOn = true;

    SoundFX.playDetector();
    this.tweens.add({
      targets: this.detectorOverlay,
      alpha: 0.55,
      duration: 250,
    });
    this.tweens.add({
      targets: this.pipeLayer,
      alpha: 1,
      duration: 250,
    });

    remaining.forEach((fixture) => {
      this.identified.add(fixture.id);
      fixture.markerRef?.setAlpha(1);
      fixture.labelRef?.setAlpha(1);
      if (fixture.ringRef) {
        fixture.ringRef.setScale(1).setAlpha(0.9);
      }
      fixture.pulseTween?.restart();
    });

    this.refreshFixtureVisuals();
    this.say("Tato", TATO_LINES.detectorOn);
    this.emitState();

    this.detectorTimer = this.time.delayedCall(
      LEVEL1.detectorDurationMs,
      () => this.deactivateDetector(),
    );
  }

  deactivateDetector() {
    if (!this.detectorOn) return;

    this.detectorOn = false;
    this.detectorTimer = null;

    this.tweens.add({
      targets: this.detectorOverlay,
      alpha: 0,
      duration: 300,
    });
    this.tweens.add({
      targets: this.pipeLayer,
      alpha: 0,
      duration: 300,
    });

    FIXTURES.forEach((fixture) => {
      fixture.markerRef?.setAlpha(0);
      fixture.labelRef?.setAlpha(0);
      if (fixture.ringRef) fixture.ringRef.setAlpha(0).setScale(1);
      fixture.pulseTween?.pause();
    });

    this.refreshFixtureVisuals();
    this.emitState();
  }

  // ---------------------------------------------------------------------------
  // Per-frame updates
  // ---------------------------------------------------------------------------

  updateMeterNeedle(time) {
    if (!this.meterNeedle || this.meterVerified) return;

    const spread = Math.PI * 0.42;
    const maxLoss =
      LEVEL1.totalLeakPerDay + 3 * LEVEL1.openTapMeterBoost;
    const loss = this.leakTotal() + this.openTaps() * LEVEL1.openTapMeterBoost;
    const ratio = Phaser.Math.Clamp(loss / maxLoss, 0, 1);

    const base = -spread + ratio * spread * 2;
    if (ratio > 0.002) {
      const amplitude = 0.1 + ratio * 0.22;
      const speed = 0.004 + ratio * 0.01;
      this.meterNeedle.rotation = base + Math.sin(time * speed) * amplitude;
    } else {
      this.meterNeedle.rotation = base;
    }
  }

  spawnDrop(fixture) {
    const drop = this.add
      .ellipse(
        fixture.drip.x + Phaser.Math.Between(-8, 8),
        fixture.drip.y + Phaser.Math.Between(0, 8),
        4,
        9,
        0x38bdf8,
        0.9,
      )
      .setDepth(12);

    this.tweens.add({
      targets: drop,
      y: fixture.floorY - 3,
      alpha: 0,
      duration: Phaser.Math.Between(650, 900),
      ease: "Quad.easeIn",
      onComplete: () => drop.destroy(),
    });
  }

  updateDrips(delta) {
    this.dripAccum += delta;
    if (this.dripAccum < 420) return;
    this.dripAccum = 0;

    FIXTURES.forEach((fixture) => {
      if (fixture.silent) return;
      if (!this.isWet(fixture)) return;
      this.spawnDrop(fixture);
    });
  }

  updateProximitySound(delta) {
    this.dripSoundAccum += delta;
    if (this.dripSoundAccum < 850) return;
    this.dripSoundAccum = 0;

    if (this.detectorOn || this.meterVerified) return;

    const wet = FIXTURES.filter(
      (fixture) => !fixture.silent && this.isWet(fixture),
    );
    if (wet.length === 0) return;

    let nearest = null;
    let best = Infinity;

    wet.forEach((fixture) => {
      const distance = Phaser.Math.Distance.Between(
        fixture.x,
        fixture.y,
        this.player.x,
        this.player.y,
      );
      if (distance < best) {
        best = distance;
        nearest = fixture;
      }
    });

    if (!nearest || best > 320) return;
    SoundFX.playDrip(0.012 + 0.085 * (1 - best / 320));
  }

  updatePrompt() {
    if (!this.prompt) return;

    if (this.transitioning || this.inputLocked || this.awaitingEstimate) {
      this.prompt.setVisible(false);
      return;
    }

    const fixture = this.findNearFixture();
    const meterNear = this.isNearMeter();

    let text = "";
    let x = this.player.x;
    let y = this.player.y - 132;

    if (fixture) {
      if (fixture.hasTap && !this.closedTaps.has(fixture.id)) {
        text = "E · Cerrar llave";
      } else if (fixture.hasLeak && this.repaired.has(fixture.objectId)) {
        text = "Fuga reparada";
      } else {
        text = "E · Revisar";
      }
      x = fixture.x;
      y = fixture.y - 34;
    } else if (meterNear) {
      text = "E · Ver medidor";
      x = LAYOUT.meter.x;
      y = LAYOUT.meter.y - 72;
    } else if (this.onStairs()) {
      text = this.floor === "ground" ? "W · Subir" : "S · Bajar";
    }

    if (!text) {
      this.prompt.setVisible(false);
      return;
    }

    this.prompt.setText(text).setPosition(x, y).setVisible(true);
  }

  playWalk() {
    if (!this.playerUsesSheet) return;
    if (this.player.anims.currentAnim?.key !== "inspector-walk") {
      this.player.play("inspector-walk");
    }
  }

  stopWalk() {
    if (!this.playerUsesSheet) return;
    if (this.player.anims.isPlaying) this.player.stop();
  }

  climbStairs() {
    if (this.transitioning) return;

    this.transitioning = true;
    this.player.setVelocity(0, 0);
    this.player.setFlipX(false);
    SoundFX.playStep();

    const steps = this.time.addEvent({
      delay: 130,
      repeat: 5,
      callback: () => SoundFX.playStep(),
    });

    this.tweens.add({
      targets: this.player,
      x: LAYOUT.stairs.topX,
      y: LAYOUT.stairs.topY,
      duration: 900,
      ease: "Sine.easeInOut",
      onComplete: () => {
        steps.remove(false);
        this.floor = "upper";
        this.player.y = LAYOUT.upper.floorY;
        this.transitioning = false;
        this.emitState();
      },
    });
  }

  descendStairs() {
    if (this.transitioning) return;

    this.transitioning = true;
    this.player.setVelocity(0, 0);
    this.player.setFlipX(true);
    SoundFX.playStep();

    const steps = this.time.addEvent({
      delay: 130,
      repeat: 5,
      callback: () => SoundFX.playStep(),
    });

    this.tweens.add({
      targets: this.player,
      x: LAYOUT.stairs.baseX,
      y: LAYOUT.stairs.baseY,
      duration: 900,
      ease: "Sine.easeInOut",
      onComplete: () => {
        steps.remove(false);
        this.floor = "ground";
        this.player.y = LAYOUT.lower.floorY;
        this.transitioning = false;
        this.emitState();
      },
    });
  }

  update(time, delta) {
    if (!this.player) return;

    this.updateMeterNeedle(time);
    this.updateDrips(delta);
    this.updateProximitySound(delta);

    if (this.transitioning) {
      this.player.setVelocityX(0);
      this.prompt?.setVisible(false);
      return;
    }

    if (this.inputLocked || this.awaitingEstimate) {
      this.player.setVelocityX(0);
      this.stopWalk();
      this.prompt?.setVisible(false);
      return;
    }

    const left = this.keys.left.isDown || this.cursors.left.isDown;
    const right = this.keys.right.isDown || this.cursors.right.isDown;

    let moving = false;

    if (left && !right) {
      this.player.setVelocityX(-WALK_SPEED);
      this.player.setFlipX(true);
      moving = true;
    } else if (right && !left) {
      this.player.setVelocityX(WALK_SPEED);
      this.player.setFlipX(false);
      moving = true;
    } else {
      this.player.setVelocityX(0);
    }

    const minX = this.floor === "upper" ? 240 : 36;
    const maxX = 930;
    this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
    this.player.y = this.floorY();

    if (this.onStairs()) {
      if (
        this.floor === "ground" &&
        Phaser.Input.Keyboard.JustDown(this.keys.up)
      ) {
        this.climbStairs();
        return;
      }
      if (
        this.floor === "upper" &&
        Phaser.Input.Keyboard.JustDown(this.keys.down)
      ) {
        this.descendStairs();
        return;
      }
    }

    if (moving) {
      this.playWalk();
      this.stepAccum += delta;
      if (this.stepAccum >= 290) {
        this.stepAccum = 0;
        SoundFX.playStep();
      }
    } else {
      this.stopWalk();
    }

    if (this.checkEnterHouse()) {
      this.updatePrompt();
      return;
    }

    if (
      !this.meterOutsideShown &&
      this.openTaps() === 0 &&
      this.remainingLeaks() > 0 &&
      this.isNearMeter()
    ) {
      this.meterOutsideShown = true;
      this.say("Tato", TATO_LINES.meterOutside);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      this.tryInteract();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.detector)) {
      this.activateDetector();
    }

    this.updatePrompt();
  }
}
