import { Scene } from 'phaser';
import {
    STARLIGHT_BOB_MS,
    STARLIGHT_BOB_PX,
    STARLIGHT_COLLECT_MS,
    STARLIGHT_COLLECT_SCALE,
    STARLIGHT_DISPLAY_SIZE,
    STARLIGHT_PULSE_MS,
    STARLIGHT_PULSE_SCALE,
    STARLIGHT_SPIN_MS,
    STARLIGHT_TURN_ANGLE,
    STARLIGHT_TURN_MS,
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

/** Layered idle motion: pulse, bob, twinkle, and either a swing or slow spin. */
export function setupStarlightIdleAnimations (
    scene: Scene,
    starlight: Phaser.GameObjects.Sprite,
    col: number,
    row: number
): void
{
    const seed = starlightSeed(col, row);
    const baseY = starlight.y;
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
        y: baseY - STARLIGHT_BOB_PX,
        duration: STARLIGHT_BOB_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: stagger + 120
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

    if (seed % 2 === 0)
    {
        starlight.angle = -STARLIGHT_TURN_ANGLE;

        scene.tweens.add({
            targets: starlight,
            angle: STARLIGHT_TURN_ANGLE,
            duration: STARLIGHT_TURN_MS,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: stagger / 2
        });
    }
    else
    {
        const spinDirection = seed % 4 === 1 ? -1 : 1;

        scene.tweens.add({
            targets: starlight,
            angle: 360 * spinDirection,
            duration: STARLIGHT_SPIN_MS,
            repeat: -1,
            ease: 'Linear',
            delay: stagger
        });
    }
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
