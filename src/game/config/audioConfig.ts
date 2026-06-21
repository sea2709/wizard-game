/** Texture-style key for the main background music track. */
export const MUSIC_OVERTURE_KEY = 'overture';

/** Default volume for background music (0–1). */
export const MUSIC_VOLUME = 0.45;

/** Cache key for the fx audio sprite (`fix_mixdown.json` + `fx_mixdown.mp3`). */
export const SFX_FX_SPRITE_KEY = 'fx';

/** Marker name in `fix_mixdown.json` for menu / confirm key feedback. */
export const SFX_NUMKEY_MARKER = 'numkey';

/** Marker name in `fix_mixdown.json` for starlight collection. */
export const SFX_PING_MARKER = 'ping';

/** Marker name in `fix_mixdown.json` for wizard fireball attack. */
export const SFX_SHOT_MARKER = 'shot';

/** Marker name in `fix_mixdown.json` for murkling killed by fireball. */
export const SFX_ALIEN_DEATH_MARKER = 'alien death';

/** Marker name in `fix_mixdown.json` for wizard taking damage. */
export const SFX_BOSS_HIT_MARKER = 'boss hit';

/** Marker name in `fix_mixdown.json` for wizard game over. */
export const SFX_DEATH_MARKER = 'death';

/** Marker name in `fix_mixdown.json` for wizard jump (`squit` clip). */
export const SFX_SQUIT_MARKER = 'squit';

/** Marker name in `fix_mixdown.json` for full-game victory sting. */
export const SFX_ESCAPE_MARKER = 'escape';

/** Default volume for one-shot sound effects (0–1). */
export const SFX_VOLUME = 0.55;

/** Ascending `ping` fanfare when a season (Spring–Fall) is cleared. */
export const SFX_SEASON_COMPLETE_VOLUME = 0.58;

/** `escape` sting when Winter is cleared and the run is won. */
export const SFX_VICTORY_VOLUME = 0.6;

/** Walk-jump sfx volume — kept low because jumps are very frequent. */
export const SFX_JUMP_WALK_VOLUME = 0.38;

/** Run-jump sfx volume — slightly louder than walk jump. */
export const SFX_JUMP_RUN_VOLUME = 0.45;
