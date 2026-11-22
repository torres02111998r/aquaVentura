import Phaser from 'phaser';

const HERRAMIENTAS = ['shovel', 'pliers', 'key', 'key1', 'pica', 'club', 'marhsy'];
const NOMBRES = {
    shovel: 'la pala', pliers: 'el alicate', key: 'la llave',
    key1: 'la llave de tubo', pica: 'la pica', club: 'el martillo', marhsy: 'el destornillador'
};

export default class Level2Scene extends Phaser.Scene {

    constructor() {
        super('Level2Scene');
    }

    preload() {
        // Personajes
        this.load.image('dog', '/assets/Characters/dog.png');
        this.load.image('efrain', '/assets/Characters/efrain.png');
        this.load.image('luz', '/assets/Characters/luz.png');
        this.load.image('tato', '/assets/Characters/tato.png');

        // Plantas
        this.load.image('bush1', '/assets/Plants/bush1.png');
        this.load.image('bush2', '/assets/Plants/bush2.png');
        this.load.image('bush3', '/assets/Plants/bush3.png');
        this.load.image('flower', '/assets/Plants/flower.png');
        this.load.image('flower1', '/assets/Plants/flower2.png');
        this.load.image('flower3', '/assets/Plants/flower3.png');
        this.load.image('flower4', '/assets/Plants/flower4.png');
        this.load.image('tree', '/assets/Plants/tree.png');

        // Herramientas
        this.load.image('club', '/assets/tol/club.png');
        this.load.image('key', '/assets/tol/key.png');
        this.load.image('key1', '/assets/tol/key2.png');
        this.load.image('marhsy', '/assets/tol/marhsy.png');
        this.load.image('pica', '/assets/tol/pica.png');
        this.load.image('pliers', '/assets/tol/pliers.png');
        this.load.image('shovel', '/assets/tol/shovel.png');
    }

    create() {
        // ---------- Estado del juego ----------
        this.inv = new Set();          // herramientas encontradas
        this.zonas = [];               // cosas con las que Tato puede interactuar
        this.manguera = false;         // ¿Tato lleva la manguera abierta?
        this.litros = 0;
        this.fugasArregladas = 0;
        this.matasRegadas = 0;
        this.excavaciones = 3;         // cargas para excavar
        this.terminado = false;
        this.grifo = { x: 60, y: 250 };

        // Tato solo camina por el patio (no por el cielo del dibujo)
        this.physics.world.setBounds(0, 170, 960, 300);

        this.dibujarEscenario();
        this.crearEscondites();
        this.crearMatas();
        this.crearFugas();
        this.crearPersonajes();
        this.crearGrifoYManguera();
        this.crearTato();
        this.crearHUD();
        this.actualizarHUD();

        this.mostrarMensaje('Busca herramientas bajo árboles y arbustos. Mueve a Tato con WASD/flechas y usa [E].', 6000);

        // La manguera abierta gasta 1 L por segundo
        this.time.addEvent({
            delay: 1000, loop: true,
            callback: () => { if (this.manguera) { this.litros += 1; this.actualizarHUD(); } }
        });
    }

    // =====================================
    // ESCENARIO
    // =====================================
    dibujarEscenario() {
        this.add.rectangle(480, 270, 960, 540, 0x75B85A).setDepth(0);

        // Patio de baldosas: 12 columnas x 3 filas, centrado
        const t = 64;
        for (let fila = 0; fila < 3; fila++) {
            for (let col = 0; col < 12; col++) {
                this.add.rectangle(128 + col * t, 300 + fila * t, t - 2, t - 2, 0xA9A9A9).setDepth(1);
            }
        }

        // Árboles en las esquinas
        this.add.image(100, 120, 'tree').setDisplaySize(170, 190).setDepth(2);
        this.add.image(850, 120, 'tree').setDisplaySize(170, 190).setDepth(2);

        // Arbustos
        this.add.image(300, 150, 'bush1').setDisplaySize(120, 90).setDepth(2);
        this.add.image(550, 150, 'bush2').setDisplaySize(120, 90).setDepth(2);
        this.add.image(750, 180, 'bush3').setDisplaySize(120, 90).setDepth(2);
        // Arbustos chicos en las esquinas de abajo
        this.add.image(40, 440, 'bush1').setDisplaySize(80, 60).setDepth(2);
        this.add.image(920, 440, 'bush2').setDisplaySize(80, 60).setDepth(2);
    }

    // =====================================
    // HERRAMIENTAS ESCONDIDAS
    // =====================================
    crearEscondites() {
        // Puntos donde Tato se para a buscar (base del árbol / arbusto)
        const puntos = [
            { x: 110, y: 190 }, { x: 850, y: 190 },
            { x: 300, y: 215 }, { x: 550, y: 215 }, { x: 750, y: 225 },
            { x: 50, y: 440 },  { x: 910, y: 440 }
        ];
        // Cada herramienta queda en un escondite distinto cada vez que se juega
        const orden = Phaser.Utils.Array.Shuffle([...HERRAMIENTAS]);

        puntos.forEach((p, i) => {
            const e = { ...p, herramienta: orden[i], revisado: false };
            this.zonas.push({
                x: p.x, y: p.y, r: 60, label: 'Buscar',
                activo: () => !e.revisado,
                usar: () => {
                    e.revisado = true;
                    this.encontrar(e.herramienta, e.x, e.y);
                }
            });
        });
    }

    encontrar(herramienta, x, y) {
        this.inv.add(herramienta);
        const i = HERRAMIENTAS.indexOf(herramienta);
        const img = this.add.image(x, y, herramienta).setDisplaySize(50, 50).setDepth(8);

        this.tweens.add({
            targets: img, y: y - 40, duration: 350, ease: 'Back.easeOut',
            onComplete: () => this.tweens.add({
                targets: img, x: this.slots[i].x, y: this.slots[i].y, duration: 500,
                onComplete: () => {
                    img.destroy();
                    this.slots[i].clearTint().setAlpha(1);
                }
            })
        });

        const util = { shovel: 'sirve para excavar', pliers: 'sirve para la fuga enterrada',
                       key: 'sirve para la fuga de la pared', key1: 'sirve para la fuga de la unión' };
        this.mostrarMensaje(`Encontraste ${NOMBRES[herramienta]}${util[herramienta] ? ': ' + util[herramienta] : ' (no sirve para este nivel)'}.`);
    }

    // =====================================
    // MATAS (se riegan con la manguera)
    // =====================================
    crearMatas() {
        const datos = [
            { x: 220, y: 235, k: 'flower' }, { x: 400, y: 235, k: 'flower1' },
            { x: 620, y: 235, k: 'flower3' }, { x: 780, y: 245, k: 'flower4' }
        ];
        this.matas = datos.map((d, i) => {
            const img = this.add.image(d.x, d.y, d.k).setDisplaySize(45, 45).setDepth(2).setAlpha(0.7);
            this.tweens.add({ targets: img, angle: 8, duration: 1000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: i * 200 });
            const mata = { img, regada: false };
            this.zonas.push({
                x: d.x, y: d.y + 20, r: 55, label: 'Regar',
                activo: () => !mata.regada,
                usar: () => this.regar(mata)
            });
            return mata;
        });
    }

    regar(mata) {
        if (!this.manguera) {
            this.mostrarMensaje('Primero toma la manguera en el grifo (izquierda).');
            return;
        }
        mata.regada = true;
        this.matasRegadas++;
        this.litros += 15;
        mata.img.setAlpha(1);
        this.add.ellipse(mata.img.x, mata.img.y + 24, 50, 16, 0x1f8fa8, 0.5).setDepth(1.5);
        this.tweens.add({ targets: mata.img, scale: mata.img.scale * 1.25, duration: 250, yoyo: true });
        this.gotas(mata.img.x, mata.img.y - 20, 6);
        this.mostrarMensaje('¡Mata regada! Gastó 15 L con manguera.');
        this.actualizarHUD();
    }

    gotas(x, y, n) {
        for (let i = 0; i < n; i++) {
            const g = this.add.circle(x + Phaser.Math.Between(-18, 18), y, 3, 0x4cc3e6).setDepth(7);
            this.tweens.add({
                targets: g, y: y + 35, alpha: 0, duration: 500, delay: i * 60,
                onComplete: () => g.destroy()
            });
        }
    }

    // =====================================
    // FUGAS
    // =====================================
    crearFugas() {
        // Dos fugas visibles: cada una pide una herramienta distinta
        this.crearFugaVisible(880, 262, 'key', 'la llave');
        this.crearFugaVisible(300, 420, 'key1', 'la llave de tubo');

        // Fuga enterrada: tile al azar del patio, sin ninguna pista visible
        this.enterrada = {
            x: 128 + 64 * Phaser.Math.Between(1, 10),
            y: 300 + 64 * Phaser.Math.Between(0, 2),
            descubierta: false, arreglada: false
        };

        // Excavar: disponible en el patio cuando Tato tiene la pala
        this.zonas.push({
            x: 0, y: 0, r: 0, label: 'Excavar aquí', global: true,
            activo: () => this.inv.has('shovel') && !this.enterrada.descubierta && this.tato.y > 260,
            usar: () => this.excavar()
        });
    }

    crearFugaVisible(x, y, herramienta, nombre) {
        const charco = this.add.ellipse(x, y + 26, 50, 16, 0x1f8fa8, 0.6).setDepth(1.5);
        this.add.rectangle(x, y, 28, 10, 0x666666).setDepth(2); // tubo
        const gota = this.add.circle(x, y + 6, 4, 0x4cc3e6).setDepth(3);
        const tween = this.tweens.add({ targets: gota, y: y + 28, alpha: 0, duration: 700, repeat: -1 });
        const fuga = { arreglada: false };

        this.zonas.push({
            x, y: y + 15, r: 55, label: 'Reparar',
            activo: () => !fuga.arreglada,
            usar: () => {
                if (!this.inv.has(herramienta)) {
                    this.mostrarMensaje(`Necesitas ${nombre} para esta fuga.`);
                    return;
                }
                fuga.arreglada = true;
                tween.stop(); gota.destroy();
                this.tweens.add({ targets: charco, alpha: 0, duration: 800 });
                this.fugaReparada('Fuga reparada.');
            }
        });
    }

    excavar() {
        const e = this.enterrada;
        const d = Phaser.Math.Distance.Between(this.tato.x, this.tato.y, e.x, e.y);

        if (d < 45) {
            e.descubierta = true;
            this.add.rectangle(e.x, e.y, 56, 56, 0x6b4a2f).setDepth(1.6);       // hueco
            this.add.rectangle(e.x, e.y, 56, 12, 0x8a8a8a).setDepth(1.7);       // tubería
            this.add.ellipse(e.x, e.y + 12, 36, 12, 0x1f8fa8, 0.7).setDepth(1.8);
            const g = this.add.circle(e.x, e.y + 8, 4, 0x4cc3e6).setDepth(3);
            const tw = this.tweens.add({ targets: g, y: e.y + 26, alpha: 0, duration: 600, repeat: -1 });
            this.mostrarMensaje('¡Ahí está! La tubería gotea. Usa el alicate para ponerle la abrazadera.', 5000);

            this.zonas.push({
                x: e.x, y: e.y, r: 55, label: 'Reparar tubería',
                activo: () => !e.arreglada,
                usar: () => {
                    if (!this.inv.has('pliers')) { this.mostrarMensaje('Necesitas el alicate.'); return; }
                    e.arreglada = true; tw.stop(); g.destroy();
                    this.fugaReparada('Fuga enterrada reparada: ahorras ~1.800 L al mes.');
                }
            });
            return;
        }

        // Punto equivocado: pierde una carga
        this.excavaciones--;
        this.add.rectangle(this.tato.x, this.tato.y + 40, 40, 20, 0x6b4a2f).setDepth(1.6);
        if (this.excavaciones > 0) {
            this.mostrarMensaje(`Aquí no hay tubería. La señal estaba más lejos. Cargas: ${this.excavaciones}`);
        } else {
            this.excavaciones = 3;
            this.mostrarMensaje('Sin cargas. Descansas y recargas la pala: sigue la barra de señal.', 4000);
        }
    }

    fugaReparada(texto) {
        this.fugasArregladas++;
        this.mostrarMensaje(texto);
        this.actualizarHUD();
    }

    // =====================================
    // PERSONAJES
    // =====================================
    crearPersonajes() {
        const luz = this.add.image(450, 370, 'luz').setDisplaySize(90, 120).setDepth(3);
        const efrain = this.add.image(670, 370, 'efrain').setDisplaySize(90, 120).setDepth(3);
        const dog = this.add.image(830, 430, 'dog').setDisplaySize(90, 90).setDepth(3);

        [[luz, 300], [efrain, 600]].forEach(([p, retraso]) => {
            this.tweens.add({ targets: p, y: p.y - 6, duration: 900, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: retraso });
        });
        this.tweens.add({ targets: dog, y: dog.y - 10, duration: 500, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

        // Hablar con ellos da pistas
        this.zonas.push({
            x: 450, y: 370, r: 80, label: 'Hablar', activo: () => true,
            usar: () => this.mostrarMensaje('Luz: Quiero regar las plantas, pero el medidor sigue girando…')
        });
        this.zonas.push({
            x: 670, y: 370, r: 80, label: 'Hablar', activo: () => true,
            usar: () => this.mostrarMensaje('Don Efraín: Para lavar la moto, mejor con cubeta que con manguera.')
        });
    }

    // =====================================
    // GRIFO Y MANGUERA
    // =====================================
    crearGrifoYManguera() {
        const { x, y } = this.grifo;
        this.add.rectangle(x - 10, y + 10, 14, 40, 0x666666).setDepth(2);   // tubo de pared
        this.add.rectangle(x + 6, y - 6, 26, 10, 0x888888).setDepth(2);     // llave
        this.add.circle(x + 20, y - 6, 6, 0xc0392b).setDepth(2);            // volante

        this.hoseG = this.add.graphics().setDepth(3.5);

        this.zonas.push({
            x, y: y + 20, r: 60, label: 'Grifo', activo: () => true,
            usar: () => {
                this.manguera = !this.manguera;
                if (!this.manguera) this.hoseG.clear();
                this.mostrarMensaje(this.manguera
                    ? 'Manguera abierta: cada segundo se gasta 1 L. ¡Riega rápido!'
                    : 'Cerraste la llave y guardaste la manguera.');
            }
        });
    }

    dibujarManguera() {
        this.hoseG.clear();
        if (!this.manguera) return;
        const p0 = new Phaser.Math.Vector2(this.grifo.x + 20, this.grifo.y - 6);
        const p2 = new Phaser.Math.Vector2(this.tato.x, this.tato.y + 30);
        const c = new Phaser.Math.Vector2((p0.x + p2.x) / 2, Math.max(p0.y, p2.y) + 40);
        this.hoseG.lineStyle(5, 0x1f8fa8, 1);
        new Phaser.Curves.QuadraticBezier(p0, c, p2).draw(this.hoseG, 24);
    }

    // =====================================
    // TATO
    // =====================================
    crearTato() {
        this.tato = this.physics.add.sprite(230, 370, 'tato');
        this.tato.setDisplaySize(90, 120);
        this.tato.setCollideWorldBounds(true);
        this.tato.body.setAllowGravity(false);
        this.tato.body.setSize(this.tato.width * 0.5, this.tato.height * 0.7);
        this.tato.setDepth(4);

        this.teclas = this.input.keyboard.addKeys({
            arriba: Phaser.Input.Keyboard.KeyCodes.W,
            abajo: Phaser.Input.Keyboard.KeyCodes.S,
            izquierda: Phaser.Input.Keyboard.KeyCodes.A,
            derecha: Phaser.Input.Keyboard.KeyCodes.D,
            usar: Phaser.Input.Keyboard.KeyCodes.E
        });
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    // =====================================
    // HUD
    // =====================================
    crearHUD() {
        this.add.rectangle(480, 509, 960, 62, 0x12303a).setDepth(9);

        // Casillas de inventario: siluetas hasta que encuentres la herramienta
        this.slots = HERRAMIENTAS.map((h, i) =>
            this.add.image(40 + i * 56, 509, h).setDisplaySize(38, 38).setDepth(10).setTint(0x000000).setAlpha(0.35)
        );

        this.estado = this.add.text(440, 488, '', { fontFamily: 'Arial', fontSize: '15px', color: '#ffffff' }).setDepth(10);
        this.senalG = this.add.graphics().setDepth(10);

        this.mensaje = this.add.text(480, 12, '', {
            fontFamily: 'Arial', fontSize: '16px', color: '#ffffff',
            backgroundColor: '#12303a', padding: { x: 10, y: 6 }, wordWrap: { width: 700 }, align: 'center'
        }).setOrigin(0.5, 0).setDepth(11).setVisible(false);

        this.indicador = this.add.text(0, 0, '', {
            fontFamily: 'Arial', fontSize: '14px', color: '#12303a', backgroundColor: '#f2c14e', padding: { x: 6, y: 2 }
        }).setOrigin(0.5, 1).setDepth(11).setVisible(false);
    }

    actualizarHUD() {
        this.estado.setText(
            `Fugas: ${this.fugasArregladas}/3   Matas: ${this.matasRegadas}/4\nAgua usada: ${this.litros} L`
        );
        if (!this.terminado && this.fugasArregladas === 3 && this.matasRegadas === 4) {
            this.terminado = true;
            this.mostrarMensaje(`¡Patio listo! Gastaste ${this.litros} L y el medidor se detuvo.`, 8000);
        }
    }

    mostrarMensaje(texto, ms = 3500) {
        this.mensaje.setText(texto).setVisible(true);
        if (this.timerMsg) this.timerMsg.remove();
        this.timerMsg = this.time.delayedCall(ms, () => this.mensaje.setVisible(false));
    }

    // =====================================
    // UPDATE
    // =====================================
    update() {
        const v = 200;
        this.tato.setVelocity(0);
        if (this.teclas.arriba.isDown || this.cursors.up.isDown) this.tato.setVelocityY(-v);
        if (this.teclas.abajo.isDown || this.cursors.down.isDown) this.tato.setVelocityY(v);
        if (this.teclas.izquierda.isDown || this.cursors.left.isDown) this.tato.setVelocityX(-v);
        if (this.teclas.derecha.isDown || this.cursors.right.isDown) this.tato.setVelocityX(v);
        this.tato.body.velocity.normalize().scale(v);

        this.dibujarManguera();
        this.dibujarSenal();

        // Zona más cercana con la que se puede interactuar
        let mejor = null, mejorD = Infinity;
        for (const z of this.zonas) {
            if (!z.activo()) continue;
            const d = z.global ? 0 : Phaser.Math.Distance.Between(this.tato.x, this.tato.y + 30, z.x, z.y);
            if (!z.global && d > z.r) continue;
            // Las zonas globales (excavar) tienen la menor prioridad
            const peso = z.global ? 1000 : d;
            if (peso < mejorD) { mejor = z; mejorD = peso; }
        }

        if (mejor) {
            this.indicador.setText(`[E] ${mejor.label}`).setPosition(this.tato.x, this.tato.y - 65).setVisible(true);
            if (Phaser.Input.Keyboard.JustDown(this.teclas.usar)) mejor.usar();
        } else {
            this.indicador.setVisible(false);
        }
    }

    // Barra "frío y caliente" cuando Tato tiene la pala
    dibujarSenal() {
        this.senalG.clear();
        if (!this.inv.has('shovel') || this.enterrada.descubierta) return;
        const d = Phaser.Math.Distance.Between(this.tato.x, this.tato.y, this.enterrada.x, this.enterrada.y);
        const s = Phaser.Math.Clamp(1 - d / 300, 0, 1);
        this.senalG.fillStyle(0xffffff, 0.2).fillRect(760, 494, 170, 14);
        this.senalG.fillStyle(s > 0.75 ? 0xc0392b : 0xf2c14e, 1).fillRect(760, 494, 170 * s, 14);
    }
}
