import {
    MUSIC_OVERTURE_KEY,
    MUSIC_VOLUME,
    SFX_ALIEN_DEATH_MARKER,
    SFX_BOSS_HIT_MARKER,
    SFX_DEATH_MARKER,
    SFX_ESCAPE_MARKER,
    SFX_FX_SPRITE_KEY,
    SFX_NUMKEY_MARKER,
    SFX_JUMP_RUN_VOLUME,
    SFX_JUMP_WALK_VOLUME,
    SFX_PING_MARKER,
    SFX_SEASON_COMPLETE_VOLUME,
    SFX_SHOT_MARKER,
    SFX_SQUIT_MARKER,
    SFX_VICTORY_VOLUME,
    SFX_VOLUME
} from '../config/audioConfig';
import { Game, Scene, Sound } from 'phaser';

const SEASON_COMPLETE_PING_RATES = [ 1, 1.2, 1.35 ];
const SEASON_COMPLETE_PING_STAGGER_MS = 130;

let overtureMusic: Sound.BaseSound | null = null;
let overtureMusicInitialized = false;

function getOvertureMusic (game: Game): Sound.BaseSound | null
{
    return overtureMusic ?? game.sound.get(MUSIC_OVERTURE_KEY);
}

export function startOvertureMusic (game: Game): void
{
    const existing = getOvertureMusic(game);

    if (existing?.isPlaying)
    {
        return;
    }

    if (existing)
    {
        existing.play();
        overtureMusic = existing;
        return;
    }

    overtureMusic = game.sound.add(MUSIC_OVERTURE_KEY, {
        loop: true,
        volume: MUSIC_VOLUME
    });
    overtureMusic.play();
}

/**
 * Starts background music once the browser allows audio.
 * Browsers block autoplay until the user clicks or taps; Phaser unlocks on
 * mousedown/touch/keydown and emits `sound.unlocked`.
 */
export function initOvertureMusic (game: Game): void
{
    if (overtureMusicInitialized)
    {
        return;
    }

    overtureMusicInitialized = true;

    const tryStart = (): void =>
    {
        startOvertureMusic(game);
    };

    game.sound.once('unlocked', tryStart);

    if (!game.sound.locked)
    {
        tryStart();
    }
}

/** Short click for Enter / Space on menu-style scenes (Story, Instructions). */
export function playMenuKeySound (game: Game): void
{
    game.sound.playAudioSprite(SFX_FX_SPRITE_KEY, SFX_NUMKEY_MARKER, {
        volume: SFX_VOLUME
    });
}

/** Plays when the wizard collects a starlight. */
export function playStarlightCollectSound (game: Game): void
{
    game.sound.playAudioSprite(SFX_FX_SPRITE_KEY, SFX_PING_MARKER, {
        volume: SFX_VOLUME
    });
}

/** Plays when the wizard throws a fireball. */
export function playWizardAttackSound (game: Game): void
{
    game.sound.playAudioSprite(SFX_FX_SPRITE_KEY, SFX_SHOT_MARKER, {
        volume: SFX_VOLUME
    });
}

/** Plays when the wizard leaves the ground (walk or run jump). */
export function playWizardJumpSound (game: Game, isRunning: boolean): void
{
    const baseRate = isRunning ? 1.04 : 0.96;
    const rateJitter = (Math.random() - 0.5) * 0.08;

    game.sound.playAudioSprite(SFX_FX_SPRITE_KEY, SFX_SQUIT_MARKER, {
        volume: isRunning ? SFX_JUMP_RUN_VOLUME : SFX_JUMP_WALK_VOLUME,
        rate: baseRate + rateJitter
    });
}

/** Plays when a murkling is killed by a fireball. */
export function playMurklingDeathSound (game: Game): void
{
    game.sound.playAudioSprite(SFX_FX_SPRITE_KEY, SFX_ALIEN_DEATH_MARKER, {
        volume: SFX_VOLUME
    });
}

/** Plays when the wizard takes damage from a murkling or striker bolt. */
export function playWizardHitSound (game: Game): void
{
    game.sound.playAudioSprite(SFX_FX_SPRITE_KEY, SFX_BOSS_HIT_MARKER, {
        volume: SFX_VOLUME
    });
}

/** Plays when darkness reaches 100% and the wizard dies. */
export function playWizardDeathSound (game: Game): void
{
    game.sound.playAudioSprite(SFX_FX_SPRITE_KEY, SFX_DEATH_MARKER, {
        volume: SFX_VOLUME
    });
}

/** Ascending starlight pings when Spring–Fall darkness reaches 0%. */
export function playSeasonCompleteSound (scene: Scene): void
{
    SEASON_COMPLETE_PING_RATES.forEach((rate, index) =>
    {
        scene.time.delayedCall(index * SEASON_COMPLETE_PING_STAGGER_MS, () =>
        {
            scene.game.sound.playAudioSprite(SFX_FX_SPRITE_KEY, SFX_PING_MARKER, {
                volume: SFX_SEASON_COMPLETE_VOLUME,
                rate
            });
        });
    });
}

/** Longer sting when Winter is cleared and the full run is won. */
export function playVictorySound (game: Game): void
{
    game.sound.playAudioSprite(SFX_FX_SPRITE_KEY, SFX_ESCAPE_MARKER, {
        volume: SFX_VICTORY_VOLUME,
        rate: 1.05
    });
}
