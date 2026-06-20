import { Scene } from 'phaser';
import {
    STARLIGHT_COLLECT_MS,
    STARLIGHT_COLLECT_SCALE,
    STARLIGHT_PULSE_MS,
    STARLIGHT_PULSE_SCALE,
    STARLIGHT_TWINKLE_ALPHA_MIN,
    STARLIGHT_TWINKLE_MS
} from './config/starlightConfig';

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
    const stagger = phaseDelay(seed, 600);

    scene.tweens.add({
        targets: starlight,
        scaleX: STARLIGHT_PULSE_SCALE,
        scaleY: STARLIGHT_PULSE_SCALE,
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
    starlight.setScale(1);

    scene.tweens.add({
        targets: starlight,
        scaleX: STARLIGHT_COLLECT_SCALE,
        scaleY: STARLIGHT_COLLECT_SCALE,
        alpha: 0,
        angle: starlight.angle + 140,
        duration: STARLIGHT_COLLECT_MS,
        ease: 'Cubic.easeOut',
        onComplete: () => onComplete()
    });
}
