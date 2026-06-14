import { Scene } from 'phaser';
import {
    STARLIGHT_COLLECT_MS,
    STARLIGHT_COLLECT_SCALE,
    STARLIGHT_DISPLAY_SIZE,
    STARLIGHT_PULSE_MS,
    STARLIGHT_PULSE_SCALE,
    STARLIGHT_TWINKLE_ALPHA_MIN,
    STARLIGHT_TWINKLE_MS
} from './starlightConfig';

function starlightSeed (col: number, row: number): number
{
    return col * 17 + row * 31;
}

function phaseDelay (seed: number, maxMs: number): number
{
    return seed % maxMs;
}

/** Idle motion: pulse + twinkle (two tweens per starlight). */
export function setupStarlightIdleAnimations (
    scene: Scene,
    starlight: Phaser.GameObjects.Sprite,
    col: number,
    row: number
): void
{
    const seed = starlightSeed(col, row);
    const pulseSize = STARLIGHT_DISPLAY_SIZE * STARLIGHT_PULSE_SCALE;
    const stagger = phaseDelay(seed, 600);

    scene.tweens.add({
        targets: starlight,
        displayWidth: pulseSize,
        displayHeight: pulseSize,
        duration: STARLIGHT_PULSE_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: stagger
    });

    scene.tweens.add({
        targets: starlight,
        alpha: STARLIGHT_TWINKLE_ALPHA_MIN,
        duration: STARLIGHT_TWINKLE_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: phaseDelay(seed, 400)
    });
}

/** Brief sparkle burst when the wizard collects a starlight. */
export function playStarlightCollectAnimation (
    scene: Scene,
    starlight: Phaser.GameObjects.Sprite,
    onComplete: () => void
): void
{
    scene.tweens.killTweensOf(starlight);

    const peakSize = STARLIGHT_DISPLAY_SIZE * STARLIGHT_COLLECT_SCALE;

    scene.tweens.add({
        targets: starlight,
        displayWidth: peakSize,
        displayHeight: peakSize,
        alpha: 0,
        angle: starlight.angle + 140,
        duration: STARLIGHT_COLLECT_MS,
        ease: 'Cubic.easeOut',
        onComplete: () => onComplete()
    });
}
