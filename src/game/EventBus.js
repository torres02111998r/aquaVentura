import Phaser from 'phaser';

/**
 * Single communication channel between the Phaser canvas and the React layer.
 *
 * Phaser scenes emit gameplay events here; React components (HUD, modals,
 * screens) subscribe to them and vice versa. Neither side imports the other,
 * which keeps the rendering engine swappable and the UI testable in isolation.
 */
export const EventBus = new Phaser.Events.EventEmitter();

export default EventBus;
