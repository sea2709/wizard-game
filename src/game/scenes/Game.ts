import { Input, Math as PhaserMath, Scene } from 'phaser';
import {
    MURKLING_DISPLAY_SIZE,
    MURKLING_HIT_COOLDOWN_MS,
    MURKLING_KNOCKBACK_X,
    MURKLING_JUMP_OVER_CLEARANCE_PX,
    MURKLING_JUMP_OVER_WINDOW_MS,
    resolveMurklingPatrolDirection
} from '../config/baddiesConfig';
import { EventBus } from '../EventBus';
import { DEBUG_PHYSICS, DEBUG_WORLD_GRID, DEFAULT_START_SEASON } from '../debug';
import {
    getSeasonSettings,
    MURKLING_BOLT_DISPLAY_SIZE,
    STRIKER_ATTACK_COOLDOWN_MS,
    STRIKER_ATTACK_RANGE_PX,
    STRIKER_DISPLAY_SIZE,
    STRIKER_PROJECTILE_DARKNESS_SPIKE,
    STRIKER_PROJECTILE_SPEED,
    STRIKER_TINT,
    STRIKER_WINDUP_MS,
    TOTAL_SEASONS,
    type GameSeason,
    type MurklingType,
    type SeasonSettings
} from '../config/seasonConfig';
import {
    HUD_DARKNESS_BAR_HEIGHT,
    HUD_DARKNESS_BAR_WIDTH,
    HUD_DARKNESS_BAR_X,
    HUD_DARKNESS_BAR_Y,
    HUD_DARKNESS_LABEL_Y,
    HUD_DARKNESS_DEPTH,
    HUD_STARLIGHT_COUNT_GAP,
    HUD_STARLIGHT_X,
    HUD_STARLIGHT_Y,
    HUD_TEXT_DEPTH,
    STARLIGHT_DISPLAY_SIZE
} from '../config/starlightConfig';
import {
    DEPTH_OFFSET_FIREBALL,
    DEPTH_OFFSET_MURKLING,
    DEPTH_OFFSET_PLAYER,
    DEPTH_OFFSET_PROJECTILE,
    DEPTH_OFFSET_STARLIGHT,
    TREE_DEPTH,
    worldDepthFromFeetY
} from '../config/elementsConfig';
import { playStarlightCollectAnimation, setupStarlightIdleAnimations } from '../starlightAnimations';
import {
    murklingSpawnKey,
    pickRandomGroundMurklingSpawn,
    pickRandomMurklingSpawn,
    type MurklingSpawn
} from '../world/murklingSpawns';
import {
    FIREBALL_DISPLAY_SIZE,
    FIREBALL_GROUND_MAX_RANGE,
    FIREBALL_SPEED,
    FIREBALL_SPAWN_OFFSET_X,
    FIREBALL_SPAWN_OFFSET_Y,
    WIZARD_ATTACK_FIREBALL_DELAY_MS,
    WIZARD_DISPLAY_HEIGHT,
    WIZARD_DISPLAY_WIDTH
} from '../config/wizardCombatConfig';
import { createPlatformLayer } from '../world/platformLayer';
import { pickRandomStarlightSpawn, starlightSpawnKey, type StarlightSpawn } from '../world/starlightSpawns';
import {
    CELL_PLATFORM,
    CELL_TREE_2,
    TILE_HEIGHT,
    TILE_WIDTH,
    WORLD_HEIGHT,
    WORLD_MAP_COLS,
    WORLD_MAP_ROWS,
    WORLD_WIDTH,
    getTreePlatformRow,
    getTreeSizeMultiplier,
    getTreeTextureKey,
    isTreeCell,
    tileSurfaceY,
    tileToWorld,
    worldMap,
    regenerateWorldMap
} from '../world/worldMap';

const PLAYER_SPEED = 240;
const RUN_SPEED = 360;
/** Horizontal drag — coasts to a stop when movement keys are released. */
const PLAYER_DRAG_X = 1400;
const ARCADE_GRAVITY = 800;
const WALK_JUMP_ROWS = 5;
const RUN_JUMP_ROWS = 6;
const VICTORY_JUMP_FRAMES = 5;
const VICTORY_JUMP_HEIGHT = WALK_JUMP_ROWS * TILE_HEIGHT;
/** Match walk-jump physics timing (not the 12fps anim length) for a natural celebration bounce. */
const VICTORY_JUMP_ASCENT_MS = Math.round(Math.sqrt((2 * VICTORY_JUMP_HEIGHT) / ARCADE_GRAVITY) * 1000);
const VICTORY_JUMP_DURATION_MS = VICTORY_JUMP_ASCENT_MS * 2;
const VICTORY_JUMP_FRAME_RATE = (VICTORY_JUMP_FRAMES / VICTORY_JUMP_DURATION_MS) * 1000;
const JUMP_VELOCITY = -Math.round(Math.sqrt(2 * ARCADE_GRAVITY * WALK_JUMP_ROWS * TILE_HEIGHT));
const RUN_JUMP_VELOCITY = -Math.round(Math.sqrt(2 * ARCADE_GRAVITY * RUN_JUMP_ROWS * TILE_HEIGHT));
const PAUSE_MENU_DEPTH = 200;
const SEASON_TRANSITION_DEPTH = 150;
const HUD_SEASON_Y = HUD_DARKNESS_BAR_Y + HUD_DARKNESS_BAR_HEIGHT + 8;
const PLAYER_START_X = 80;
/** Cap gameplay tick delta so tab/GC pauses don't spike darkness or spawn timers. */
const MAX_FRAME_DELTA_MS = 50;
/** Patrol AI skipped beyond this margin outside the camera view. */
const MURKLING_OFF_SCREEN_MARGIN = STRIKER_ATTACK_RANGE_PX;

type PlayerAnimState = 'idle' | 'walk' | 'run' | 'jump' | 'hurt' | 'die' | 'attack';

type GameSceneData = {
    season?: GameSeason;
};

type StrikerState = 'patrol' | 'windup' | 'cooldown';

type MurklingSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
    spawnKey: string;
    murklingType: MurklingType;
    spawnRow: number;
    patrolMinX: number;
    patrolMaxX: number;
    wizardSide: number;
    jumpOverHandled: boolean;
    jumpOverPendingAt: number;
    strikerState: StrikerState;
    strikerWindupAt: number;
    strikerCooldownUntil: number;
    patrolVelocityX: number;
    dying: boolean;
};

export class Game extends Scene
{
    worldWidth = 0;
    currentSeason: GameSeason = 1;
    seasonSettings!: SeasonSettings;
    backgroundLayers: Phaser.GameObjects.TileSprite[] = [];
    platformLayer: Phaser.Tilemaps.TilemapLayer;
    decorativeTrees: Phaser.GameObjects.Group;
    player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    spaceKey: Phaser.Input.Keyboard.Key;
    shiftKey: Phaser.Input.Keyboard.Key;
    escKey: Phaser.Input.Keyboard.Key;
    enterKey: Phaser.Input.Keyboard.Key;
    playerAnimState: PlayerAnimState = 'idle';
    isHurt = false;
    isAttacking = false;
    attackFireballTimer?: Phaser.Time.TimerEvent;
    attackCompleteTimer?: Phaser.Time.TimerEvent;
    airFrames = 0;
    groundedFrames = 0;
    worldGridDebug?: Phaser.GameObjects.Graphics;
    starlights: Phaser.Physics.Arcade.Group;
    murklings: Phaser.Physics.Arcade.Group;
    murklingProjectiles: Phaser.Physics.Arcade.Group;
    fireballs: Phaser.Physics.Arcade.Group;
    darknessOverlay: Phaser.GameObjects.Rectangle;
    hudStarlightIcon: Phaser.GameObjects.Image;
    hudStarlightCount: Phaser.GameObjects.Text;
    darknessBarTrack: Phaser.GameObjects.Rectangle;
    darknessBarFill: Phaser.GameObjects.Rectangle;
    darknessBarLabel: Phaser.GameObjects.Text;
    darknessBarText: Phaser.GameObjects.Text;
    hudSeasonLabel: Phaser.GameObjects.Text;
    gameOverMessage?: Phaser.GameObjects.Text;
    gameOverTitle?: Phaser.GameObjects.Text;
    darkness = 0.5;
    starlightsCollected = 0;
    totalStarlights = 0;
    starlightOccupiedKeys = new Set<string>();
    murklingOccupiedKeys = new Set<string>();
    starlightSpawnElapsed = 0;
    murklingSpawnElapsed = 0;
    gameEnded = false;
    lastMurklingHitTime = 0;
    hudStarlightsCollected = -1;
    hudTotalStarlights = -1;
    hudDarknessPercent = -1;
    isVictoryCelebration = false;
    victoryGroundY = 0;
    victoryJumpTween?: Phaser.Tweens.Tween;
    isPaused = false;
    isAwaitingSeasonContinue = false;
    pauseMenu?: Phaser.GameObjects.Container;
    seasonTransitionMenu?: Phaser.GameObjects.Container;

    constructor ()
    {
        super('Game');
    }

    init (data?: GameSceneData)
    {
        this.currentSeason = data?.season ?? DEFAULT_START_SEASON;
        this.seasonSettings = getSeasonSettings(this.currentSeason);
    }

    create ()
    {
        this.resetSeasonRuntimeState();

        const { width, height } = this.scale;
        const centerY = height / 2;

        this.worldWidth = WORLD_WIDTH;
        const worldCenterX = this.worldWidth / 2;

        this.physics.world.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
        this.cameras.main.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
        this.cameras.main.roundPixels = false;

        const layerKeys = this.seasonSettings.backgroundLayerKeys;
        const scrollFactors = this.seasonSettings.backgroundScrollFactors;
        const bgScale = Math.max(width / 576, height / 324);
        const bgDisplayHeight = 324 * bgScale;

        layerKeys.forEach((key, index) =>
        {
            const layer = this.add.tileSprite(worldCenterX, centerY, this.worldWidth, bgDisplayHeight, key)
                .setTileScale(bgScale)
                .setDepth(index)
                .setScrollFactor(scrollFactors[index]);

            this.backgroundLayers.push(layer);
        });

        this.decorativeTrees = this.add.group();
        this.buildWorldGeometry();

        this.player = this.physics.add.sprite(PLAYER_START_X, 0, 'wizard', 0);
        this.resetPlayerToStart();
        this.player.setOrigin(0.5, 1);
        this.player.setDisplaySize(WIZARD_DISPLAY_WIDTH, WIZARD_DISPLAY_HEIGHT);
        this.player.setDepth(worldDepthFromFeetY(this.player.y, DEPTH_OFFSET_PLAYER));
        this.player.setCollideWorldBounds(true);
        this.player.setDragX(PLAYER_DRAG_X);
        this.updatePlayerBody();

        this.physics.add.collider(this.player, this.platformLayer);

        this.darknessOverlay = this.add.rectangle(0, 0, width, height, 0x020218, 1)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setAlpha(0)
            .setDepth(HUD_DARKNESS_DEPTH);

        this.hudStarlightIcon = this.add.image(HUD_STARLIGHT_X, HUD_STARLIGHT_Y, 'starlight')
            .setOrigin(0, 0)
            .setDisplaySize(STARLIGHT_DISPLAY_SIZE, STARLIGHT_DISPLAY_SIZE)
            .setScrollFactor(0)
            .setDepth(HUD_TEXT_DEPTH);

        this.hudStarlightCount = this.add.text(
            HUD_STARLIGHT_X + STARLIGHT_DISPLAY_SIZE + HUD_STARLIGHT_COUNT_GAP,
            HUD_STARLIGHT_Y + STARLIGHT_DISPLAY_SIZE / 2,
            '0/0',
            {
                fontFamily: 'Arial Black',
                fontSize: 22,
                color: '#fff8c0',
                stroke: '#000000',
                strokeThickness: 4
            }
        )
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(HUD_TEXT_DEPTH);

        const barInnerWidth = HUD_DARKNESS_BAR_WIDTH - 4;
        const barInnerHeight = HUD_DARKNESS_BAR_HEIGHT - 4;

        this.darknessBarLabel = this.add.text(HUD_DARKNESS_BAR_X, HUD_DARKNESS_LABEL_Y, 'Darkness', {
            fontFamily: 'Arial Black',
            fontSize: 18,
            color: '#fff8c0',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(HUD_TEXT_DEPTH);

        this.darknessBarTrack = this.add.rectangle(
            HUD_DARKNESS_BAR_X,
            HUD_DARKNESS_BAR_Y,
            HUD_DARKNESS_BAR_WIDTH,
            HUD_DARKNESS_BAR_HEIGHT,
            0x120820,
            0.75
        )
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(HUD_TEXT_DEPTH)
            .setStrokeStyle(2, 0xfff8c0, 0.5);

        this.darknessBarFill = this.add.rectangle(
            HUD_DARKNESS_BAR_X + 2,
            HUD_DARKNESS_BAR_Y + 2,
            barInnerWidth,
            barInnerHeight,
            0x5030a0,
            1
        )
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(HUD_TEXT_DEPTH);

        this.darknessBarText = this.add.text(
            HUD_DARKNESS_BAR_X + HUD_DARKNESS_BAR_WIDTH + 8,
            HUD_DARKNESS_BAR_Y - 1,
            '0%',
            {
                fontFamily: 'Arial Black',
                fontSize: 16,
                color: '#fff8c0',
                stroke: '#000000',
                strokeThickness: 3
            }
        )
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(HUD_TEXT_DEPTH);

        this.hudSeasonLabel = this.add.text(
            HUD_DARKNESS_BAR_X,
            HUD_SEASON_Y,
            `${this.seasonSettings.name} (${this.currentSeason}/${TOTAL_SEASONS})`,
            {
                fontFamily: 'Arial Black',
                fontSize: 16,
                color: this.seasonSettings.hudColor,
                stroke: '#000000',
                strokeThickness: 3
            }
        )
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(HUD_TEXT_DEPTH);

        this.spawnStarlights();
        this.spawnMurklings();
        this.setupFireballs();
        this.setupMurklingProjectiles();

        this.updateHud();
        this.updateDarknessVisuals();

        this.cameras.main.startFollow(this.player, true, 1, 0);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SHIFT);
        this.escKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.ESC);
        this.enterKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.ENTER);

        if (import.meta.env.DEV)
        {
            this.setupDebugControls();
        }

        EventBus.emit('current-scene-ready', this);
    }

    resetSeasonRuntimeState ()
    {
        this.darkness = this.seasonSettings.darknessStart;
        this.starlightsCollected = 0;
        this.totalStarlights = 0;
        this.starlightOccupiedKeys = new Set();
        this.murklingOccupiedKeys = new Set();
        this.starlightSpawnElapsed = 0;
        this.murklingSpawnElapsed = 0;
        this.gameEnded = false;
        this.lastMurklingHitTime = 0;
        this.hudStarlightsCollected = -1;
        this.hudTotalStarlights = -1;
        this.hudDarknessPercent = -1;
        this.isVictoryCelebration = false;
        this.isPaused = false;
        this.isAwaitingSeasonContinue = false;
        this.backgroundLayers = [];
        this.victoryJumpTween?.stop();
        this.victoryJumpTween = undefined;
        this.attackFireballTimer?.remove();
        this.attackFireballTimer = undefined;
        this.attackCompleteTimer?.remove();
        this.attackCompleteTimer = undefined;
        this.isAttacking = false;
        this.isHurt = false;
        this.playerAnimState = 'idle';
        this.airFrames = 0;
        this.groundedFrames = 0;
    }

    buildWorldGeometry ()
    {
        this.platformLayer = createPlatformLayer(this, worldMap, 10);
        this.decorativeTrees.clear(true, true);

        for (let row = 0; row < WORLD_MAP_ROWS; row++)
        {
            for (let col = 0; col < WORLD_MAP_COLS; col++)
            {
                const cell = worldMap[row][col];

                if (!isTreeCell(cell))
                {
                    continue;
                }

                const platformRow = getTreePlatformRow(row);

                if (
                    platformRow >= WORLD_MAP_ROWS
                    || worldMap[platformRow][col] !== CELL_PLATFORM
                )
                {
                    continue;
                }

                const { x } = tileToWorld(col, platformRow);
                const y = tileSurfaceY(platformRow);
                const tree = this.add.image(x, y, getTreeTextureKey(cell));

                tree.setOrigin(0.5, 1);
                tree.setDepth(TREE_DEPTH);

                const displayWidth = getTreeSizeMultiplier(row, col) * TILE_WIDTH;
                const aspect = tree.width / tree.height;

                tree.setDisplaySize(displayWidth, displayWidth / aspect);
                this.decorativeTrees.add(tree);
            }
        }
    }

    resetPlayerToStart ()
    {
        const groundRow = WORLD_MAP_ROWS - 1;

        this.player.setPosition(PLAYER_START_X, tileSurfaceY(groundRow));
        this.player.setVelocity(0, 0);
        this.player.setFlipX(false);
        this.player.clearTint();
    }

    spawnStarlights ()
    {
        this.starlightOccupiedKeys = new Set();
        this.starlightSpawnElapsed = 0;
        this.starlights = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });

        for (let i = 0; i < this.seasonSettings.starlightInitialCount; i++)
        {
            this.spawnRandomStarlight();
        }

        this.physics.add.overlap(
            this.player,
            this.starlights,
            (_player, starlightObject) => this.collectStarlight(starlightObject as Phaser.Physics.Arcade.Sprite)
        );
    }

    spawnRandomStarlight ()
    {
        const spawn = pickRandomStarlightSpawn(worldMap, this.starlightOccupiedKeys);

        if (!spawn)
        {
            return;
        }

        this.createStarlight(spawn);
    }

    createStarlight (spawn: StarlightSpawn)
    {
        const spawnKey = starlightSpawnKey(spawn);
        const { col, row, floatOffsetPx } = spawn;

        this.starlightOccupiedKeys.add(spawnKey);

        const { x } = tileToWorld(col, row);
        const y = tileSurfaceY(row) - floatOffsetPx;
        const starlight = this.starlights.create(x, y, 'starlight') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;

        starlight.setDepth(worldDepthFromFeetY(y, DEPTH_OFFSET_STARLIGHT));
        starlight.setDisplaySize(STARLIGHT_DISPLAY_SIZE, STARLIGHT_DISPLAY_SIZE);
        starlight.setData('spawnKey', spawnKey);

        const hitRadius = STARLIGHT_DISPLAY_SIZE * 0.35;
        const hitOffset = STARLIGHT_DISPLAY_SIZE * 0.15;

        starlight.body.setCircle(hitRadius, hitOffset, hitOffset);

        setupStarlightIdleAnimations(this, starlight, col, row);

        this.totalStarlights++;
        this.updateHud();
    }

    resetStarlightSpawnTimer ()
    {
        this.starlightSpawnElapsed = 0;
    }

    spawnMurklings ()
    {
        this.murklingSpawnElapsed = 0;
        this.murklingOccupiedKeys = new Set();
        this.murklings = this.physics.add.group();

        this.physics.add.collider(this.murklings, this.platformLayer);
        this.physics.add.overlap(
            this.player,
            this.murklings,
            (_player, murklingObject) => this.hitMurkling(murklingObject as Phaser.Physics.Arcade.Sprite)
        );

        for (let i = 0; i < this.seasonSettings.minGroundMurklingCount; i++)
        {
            this.spawnGroundMurkling();
        }

        for (let i = this.seasonSettings.minGroundMurklingCount; i < this.seasonSettings.murklingInitialCount; i++)
        {
            this.spawnRandomMurkling('patrol');
        }

        for (let i = 0; i < this.seasonSettings.strikerInitialCount; i++)
        {
            this.spawnRandomMurkling('striker');
        }
    }

    setupMurklingProjectiles ()
    {
        this.murklingProjectiles = this.physics.add.group({
            allowGravity: false,
            maxSize: 32
        });

        this.physics.add.overlap(
            this.player,
            this.murklingProjectiles,
            (_player, boltObject) => this.hitMurklingProjectile(boltObject as Phaser.Physics.Arcade.Sprite)
        );

        this.physics.add.collider(this.murklingProjectiles, this.platformLayer, (boltObject) =>
        {
            (boltObject as Phaser.Physics.Arcade.Sprite).destroy();
        });
    }

    hitMurklingProjectile (bolt: Phaser.Physics.Arcade.Sprite)
    {
        if (this.gameEnded || !bolt.active)
        {
            return;
        }

        bolt.destroy();
        this.applyWizardDarknessHit(STRIKER_PROJECTILE_DARKNESS_SPIKE);
    }

    applyWizardDarknessHit (darknessSpike: number)
    {
        const now = this.time.now;

        if (now - this.lastMurklingHitTime < MURKLING_HIT_COOLDOWN_MS)
        {
            return;
        }

        this.lastMurklingHitTime = now;
        this.darkness = Math.min(1, this.darkness + darknessSpike);
        this.updateDarknessVisuals();
        this.updateHud();
        this.playPlayerHurt();
        this.player.setTint(0xaa66ff);
        this.time.delayedCall(200, () => this.player.clearTint());

        if (this.darkness >= 1)
        {
            this.endGame('darkness');
        }
    }

    setupFireballs ()
    {
        this.fireballs = this.physics.add.group({
            allowGravity: false,
            maxSize: 24
        });

        this.physics.add.overlap(
            this.fireballs,
            this.murklings,
            (fireballObject, murklingObject) => this.hitMurklingWithFireball(
                fireballObject as Phaser.Physics.Arcade.Sprite,
                murklingObject as Phaser.Physics.Arcade.Sprite
            )
        );

        this.physics.add.collider(this.fireballs, this.platformLayer, (fireballObject) =>
        {
            (fireballObject as Phaser.Physics.Arcade.Sprite).destroy();
        });
    }

    destroyMurkling (murkling: Phaser.Physics.Arcade.Sprite)
    {
        if (!murkling.active)
        {
            return;
        }

        const murklingSprite = murkling as MurklingSprite;

        if (murklingSprite.spawnKey)
        {
            this.murklingOccupiedKeys.delete(murklingSprite.spawnKey);
        }

        murkling.destroy();
    }

    isMurklingDying (murkling: Phaser.Physics.Arcade.Sprite): boolean
    {
        return (murkling as MurklingSprite).dying === true;
    }

    killMurkling (murkling: Phaser.Physics.Arcade.Sprite)
    {
        if (!murkling.active || this.isMurklingDying(murkling))
        {
            return;
        }

        const murklingSprite = murkling as MurklingSprite;

        murklingSprite.dying = true;
        murklingSprite.patrolVelocityX = 0;
        murkling.setVelocity(0, 0);

        if (murkling.body)
        {
            murkling.body.enable = false;
        }

        murkling.anims.play('murkling-die');
        murkling.once('animationcomplete-murkling-die', () =>
        {
            this.destroyMurkling(murkling);
        });

        const dieAnim = this.anims.get('murkling-die');

        if (dieAnim)
        {
            this.time.delayedCall(dieAnim.duration + 16, () =>
            {
                if (murkling.active && this.isMurklingDying(murkling))
                {
                    this.destroyMurkling(murkling);
                }
            });
        }
    }

    hitMurklingWithFireball (
        fireball: Phaser.Physics.Arcade.Sprite,
        murkling: Phaser.Physics.Arcade.Sprite
    )
    {
        if (!fireball.active || !murkling.active || this.gameEnded || this.isMurklingDying(murkling))
        {
            return;
        }

        this.killMurkling(murkling);
        fireball.destroy();
    }

    spawnFireball ()
    {
        if (this.gameEnded || !this.player)
        {
            return;
        }

        const direction = this.player.flipX ? -1 : 1;
        const x = this.player.x + direction * FIREBALL_SPAWN_OFFSET_X;
        const y = this.player.y + FIREBALL_SPAWN_OFFSET_Y;
        const fireball = this.fireballs.create(x, y, 'fireball') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

        fireball.setDepth(worldDepthFromFeetY(y, DEPTH_OFFSET_FIREBALL));
        fireball.setDisplaySize(FIREBALL_DISPLAY_SIZE, FIREBALL_DISPLAY_SIZE);
        fireball.setVelocityX(direction * FIREBALL_SPEED);
        fireball.body.setAllowGravity(false);

        if (this.groundedFrames >= 1)
        {
            fireball.setData('spawnX', x);
            fireball.setData('maxRange', FIREBALL_GROUND_MAX_RANGE);
        }
    }

    updateFireballs ()
    {
        for (const fireballObject of this.fireballs.getChildren())
        {
            const fireball = fireballObject as Phaser.Physics.Arcade.Sprite;
            const maxRange = fireball.getData('maxRange') as number | undefined;

            if (maxRange !== undefined)
            {
                const spawnX = fireball.getData('spawnX') as number;

                if (Math.abs(fireball.x - spawnX) >= maxRange)
                {
                    fireball.destroy();
                    continue;
                }
            }

            if (fireball.x < 0 || fireball.x > this.worldWidth)
            {
                fireball.destroy();
            }
        }
    }

    updateWorldEntityDepths ()
    {
        if (this.player?.active)
        {
            this.player.setDepth(worldDepthFromFeetY(this.player.y, DEPTH_OFFSET_PLAYER));
        }

        for (const murklingObject of this.murklings.getChildren())
        {
            const murkling = murklingObject as Phaser.Physics.Arcade.Sprite;

            murkling.setDepth(worldDepthFromFeetY(murkling.y, DEPTH_OFFSET_MURKLING));
        }

        for (const fireballObject of this.fireballs.getChildren())
        {
            const fireball = fireballObject as Phaser.Physics.Arcade.Sprite;

            fireball.setDepth(worldDepthFromFeetY(fireball.y, DEPTH_OFFSET_FIREBALL));
        }

        for (const boltObject of this.murklingProjectiles.getChildren())
        {
            const bolt = boltObject as Phaser.Physics.Arcade.Sprite;

            bolt.setDepth(worldDepthFromFeetY(bolt.y, DEPTH_OFFSET_PROJECTILE));
        }
    }

    playPlayerAttack ()
    {
        if (this.isAttacking || this.isHurt || this.gameEnded || this.isVictoryCelebration)
        {
            return;
        }

        this.isAttacking = true;
        this.player.setVelocityX(0);
        this.clearAttackCompleteHandlers();
        this.playerAnimState = 'idle';
        this.setPlayerAnimation('attack');

        this.attackFireballTimer?.remove();
        this.attackFireballTimer = this.time.delayedCall(WIZARD_ATTACK_FIREBALL_DELAY_MS, () =>
        {
            this.attackFireballTimer = undefined;
            this.spawnFireball();
        });

        this.player.once('animationcomplete-wizard-attack', this.onPlayerAttackComplete, this);

        const attackAnim = this.anims.get('wizard-attack');

        if (attackAnim)
        {
            this.attackCompleteTimer = this.time.delayedCall(attackAnim.duration + 16, () =>
            {
                this.onPlayerAttackComplete();
            });
        }
    }

    clearAttackCompleteHandlers ()
    {
        this.attackCompleteTimer?.remove();
        this.attackCompleteTimer = undefined;
        this.player.off('animationcomplete-wizard-attack', this.onPlayerAttackComplete, this);
    }

    onPlayerAttackComplete ()
    {
        if (!this.isAttacking)
        {
            return;
        }

        this.clearAttackCompleteHandlers();
        this.isAttacking = false;
        this.setPlayerAnimation('idle');
    }

    cancelPlayerAttack ()
    {
        this.attackFireballTimer?.remove();
        this.attackFireballTimer = undefined;
        this.clearAttackCompleteHandlers();
        this.isAttacking = false;
    }

    spawnGroundMurkling (type: MurklingType = 'patrol')
    {
        const spawn = pickRandomGroundMurklingSpawn(
            worldMap,
            this.murklingOccupiedKeys,
            Math.random,
            this.player.x
        );

        if (!spawn)
        {
            return;
        }

        this.createMurkling(spawn, type);
    }

    spawnRandomMurkling (forcedType?: MurklingType)
    {
        const spawn = pickRandomMurklingSpawn(
            worldMap,
            this.murklingOccupiedKeys,
            Math.random,
            this.player.x
        );

        if (!spawn)
        {
            return;
        }

        const type = forcedType ?? this.rollMurklingSpawnType();

        this.createMurkling(spawn, type);
    }

    rollMurklingSpawnType (): MurklingType
    {
        if (this.seasonSettings.strikerSpawnChance <= 0)
        {
            return 'patrol';
        }

        return Math.random() < this.seasonSettings.strikerSpawnChance ? 'striker' : 'patrol';
    }

    createMurkling ({ col, row, startCol, endCol }: MurklingSpawn, type: MurklingType = 'patrol')
    {
        const spawnKey = murklingSpawnKey({ col, row, startCol, endCol });
        const displaySize = type === 'striker' ? STRIKER_DISPLAY_SIZE : MURKLING_DISPLAY_SIZE;

        const { x } = tileToWorld(col, row);
        const y = tileSurfaceY(row);
        const murkling = this.murklings.create(x, y, 'murkling') as MurklingSprite;

        murkling.setOrigin(0.5, 1);
        murkling.setDepth(worldDepthFromFeetY(y, DEPTH_OFFSET_MURKLING));
        murkling.setDisplaySize(displaySize, displaySize);
        murkling.setCollideWorldBounds(false);
        murkling.anims.play('murkling-walk');

        murkling.spawnKey = spawnKey;
        murkling.murklingType = type;
        murkling.spawnRow = row;
        murkling.dying = false;
        murkling.strikerState = 'patrol';
        murkling.strikerWindupAt = 0;
        murkling.strikerCooldownUntil = 0;
        murkling.patrolVelocityX = NaN;

        if (type === 'striker')
        {
            murkling.setTint(STRIKER_TINT);
        }

        const patrolMinX = startCol * TILE_WIDTH + TILE_WIDTH / 2;
        const patrolMaxX = endCol * TILE_WIDTH + TILE_WIDTH / 2;
        const fallbackMoveRight = col < startCol + (endCol - startCol) / 2;
        const moveRight = resolveMurklingPatrolDirection(
            x,
            this.player.x,
            patrolMinX,
            patrolMaxX,
            fallbackMoveRight
        );

        murkling.patrolMinX = patrolMinX;
        murkling.patrolMaxX = patrolMaxX;
        murkling.wizardSide = this.player.x < x - 8 ? -1 : this.player.x > x + 8 ? 1 : 0;
        murkling.jumpOverHandled = false;
        murkling.jumpOverPendingAt = 0;
        this.setMurklingDirection(murkling, moveRight);

        this.murklingOccupiedKeys.add(spawnKey);

        const bodyWidth = displaySize * 0.7;
        const bodyHeight = displaySize * 0.55;

        murkling.body.setSize(bodyWidth, bodyHeight);
        murkling.body.setOffset(
            (murkling.width - bodyWidth) / 2,
            murkling.height - bodyHeight
        );
    }

    ensureMurklingVelocityX (murkling: MurklingSprite, velocityX: number)
    {
        if (murkling.patrolVelocityX === velocityX)
        {
            return;
        }

        murkling.setVelocityX(velocityX);
        murkling.patrolVelocityX = velocityX;
    }

    isMurklingNearCamera (murkling: MurklingSprite): boolean
    {
        const cam = this.cameras.main;
        const left = cam.scrollX - MURKLING_OFF_SCREEN_MARGIN;
        const right = cam.scrollX + cam.width + MURKLING_OFF_SCREEN_MARGIN;

        return murkling.x >= left && murkling.x <= right;
    }

    setMurklingDirection (murkling: MurklingSprite, moveRight: boolean)
    {
        const speed = this.seasonSettings.murklingPatrolSpeed;
        const shouldFlipX = !moveRight;

        if (murkling.flipX !== shouldFlipX)
        {
            murkling.setFlipX(shouldFlipX);
        }

        this.ensureMurklingVelocityX(murkling, moveRight ? speed : -speed);
    }

    updateMurklings ()
    {
        const wizardX = this.player.x;
        const wizardY = this.player.y;
        const wizardInAir = !this.player.body.onFloor();
        const patrolSpeed = this.seasonSettings.murklingPatrolSpeed;

        for (const murklingObject of this.murklings.getChildren())
        {
            const murkling = murklingObject as MurklingSprite;

            if (murkling.dying)
            {
                continue;
            }

            if (murkling.murklingType === 'striker')
            {
                this.updateStrikerMurkling(murkling, wizardX, wizardY);
                continue;
            }

            if (!this.isMurklingNearCamera(murkling))
            {
                continue;
            }

            const { patrolMinX, patrolMaxX } = murkling;
            const prevWizardSide = murkling.wizardSide;
            const wizardOnRight = wizardX > murkling.x + 8;
            const wizardOnLeft = wizardX < murkling.x - 8;
            const wizardSide = wizardOnRight ? 1 : wizardOnLeft ? -1 : 0;
            const movingRight = !murkling.flipX;
            const movingAwayFromWizard =
                (wizardOnRight && !movingRight) || (wizardOnLeft && movingRight);
            const wizardAbove = wizardY < murkling.y - MURKLING_JUMP_OVER_CLEARANCE_PX;
            const crossedWizard = prevWizardSide * wizardSide < 0;
            const jumpOverWindowOpen =
                murkling.jumpOverPendingAt > 0
                && this.time.now - murkling.jumpOverPendingAt < MURKLING_JUMP_OVER_WINDOW_MS;

            if (wizardInAir && crossedWizard)
            {
                murkling.jumpOverPendingAt = this.time.now;
            }

            const shouldConsiderJumpOver =
                (wizardInAir && crossedWizard)
                || (wizardInAir && wizardAbove && movingAwayFromWizard)
                || (jumpOverWindowOpen && movingAwayFromWizard);

            if (shouldConsiderJumpOver)
            {
                if (!murkling.jumpOverHandled)
                {
                    const towardMoveRight = wizardSide !== 0 ? wizardSide > 0 : null;
                    const moveRight = resolveMurklingPatrolDirection(
                        murkling.x,
                        wizardX,
                        patrolMinX,
                        patrolMaxX,
                        movingRight,
                        towardMoveRight
                    );

                    this.setMurklingDirection(murkling, moveRight);
                    murkling.jumpOverHandled = true;
                }
            }
            else if (!jumpOverWindowOpen && Math.abs(wizardX - murkling.x) > MURKLING_DISPLAY_SIZE * 2)
            {
                murkling.jumpOverHandled = false;
                murkling.jumpOverPendingAt = 0;
            }

            murkling.wizardSide = wizardSide;

            if (murkling.x <= patrolMinX)
            {
                murkling.x = patrolMinX;
                const moveRight = resolveMurklingPatrolDirection(
                    murkling.x,
                    wizardX,
                    patrolMinX,
                    patrolMaxX,
                    true
                );
                this.setMurklingDirection(murkling, moveRight);
            }
            else if (murkling.x >= patrolMaxX)
            {
                murkling.x = patrolMaxX;
                const moveRight = resolveMurklingPatrolDirection(
                    murkling.x,
                    wizardX,
                    patrolMinX,
                    patrolMaxX,
                    false
                );
                this.setMurklingDirection(murkling, moveRight);
            }
            else
            {
                this.ensureMurklingVelocityX(
                    murkling,
                    murkling.flipX ? -patrolSpeed : patrolSpeed
                );
            }
        }
    }

    updateStrikerMurkling (
        murkling: MurklingSprite,
        wizardX: number,
        wizardY: number
    )
    {
        const { patrolMinX, patrolMaxX, spawnRow } = murkling;
        const now = this.time.now;
        let strikerState = murkling.strikerState;
        const inRange = this.isWizardInStrikerRange(wizardX, wizardY, murkling.x, murkling.y, spawnRow);

        if (strikerState === 'cooldown')
        {
            if (now < murkling.strikerCooldownUntil)
            {
                this.ensureMurklingVelocityX(murkling, 0);
                return;
            }

            strikerState = 'patrol';
            murkling.strikerState = 'patrol';
        }

        if (strikerState === 'windup')
        {
            this.ensureMurklingVelocityX(murkling, 0);

            const shouldFlipX = wizardX < murkling.x;

            if (murkling.flipX !== shouldFlipX)
            {
                murkling.setFlipX(shouldFlipX);
            }

            if (!inRange)
            {
                murkling.strikerState = 'patrol';
                murkling.strikerWindupAt = 0;
            }
            else if (now - murkling.strikerWindupAt >= STRIKER_WINDUP_MS)
            {
                this.spawnStrikerBolt(murkling, wizardX, wizardY);
                murkling.strikerState = 'cooldown';
                murkling.strikerCooldownUntil = now + STRIKER_ATTACK_COOLDOWN_MS;
                murkling.strikerWindupAt = 0;
            }

            return;
        }

        if (inRange)
        {
            this.ensureMurklingVelocityX(murkling, 0);
            murkling.setFlipX(wizardX < murkling.x);
            murkling.strikerState = 'windup';
            murkling.strikerWindupAt = now;
            return;
        }

        if (murkling.x <= patrolMinX)
        {
            murkling.x = patrolMinX;
            this.setMurklingDirection(murkling, true);
        }
        else if (murkling.x >= patrolMaxX)
        {
            murkling.x = patrolMaxX;
            this.setMurklingDirection(murkling, false);
        }
        else
        {
            this.ensureMurklingVelocityX(
                murkling,
                murkling.flipX ? -this.seasonSettings.murklingPatrolSpeed : this.seasonSettings.murklingPatrolSpeed
            );
        }
    }

    isWizardInStrikerRange (
        wizardX: number,
        wizardY: number,
        murklingX: number,
        murklingY: number,
        spawnRow: number
    ): boolean
    {
        const platformY = tileSurfaceY(spawnRow);
        const onSameTier = Math.abs(wizardY - platformY) <= TILE_HEIGHT;
        const horizontalDistance = Math.abs(wizardX - murklingX);
        const wizardNotFarAbove = wizardY >= murklingY - MURKLING_JUMP_OVER_CLEARANCE_PX;

        return onSameTier
            && horizontalDistance <= STRIKER_ATTACK_RANGE_PX
            && wizardNotFarAbove;
    }

    spawnStrikerBolt (
        murkling: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
        wizardX: number,
        wizardY: number
    )
    {
        const originY = murkling.y - STRIKER_DISPLAY_SIZE * 0.45;
        const targetY = wizardY - WIZARD_DISPLAY_HEIGHT * 0.5;
        const dx = wizardX - murkling.x;
        const dy = targetY - originY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const bolt = this.murklingProjectiles.create(
            murkling.x,
            originY,
            'murkling-bolt'
        ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

        bolt.setDepth(worldDepthFromFeetY(originY, DEPTH_OFFSET_PROJECTILE));
        bolt.setDisplaySize(MURKLING_BOLT_DISPLAY_SIZE, MURKLING_BOLT_DISPLAY_SIZE);
        bolt.setVelocity(
            (dx / distance) * STRIKER_PROJECTILE_SPEED,
            (dy / distance) * STRIKER_PROJECTILE_SPEED
        );
        bolt.body.setAllowGravity(false);
        bolt.setData('spawnX', murkling.x);
        bolt.setData('spawnY', originY);
        bolt.setData('maxTravel', STRIKER_ATTACK_RANGE_PX * 1.5);
    }

    updateMurklingProjectiles ()
    {
        for (const boltObject of this.murklingProjectiles.getChildren())
        {
            const bolt = boltObject as Phaser.Physics.Arcade.Sprite;
            const spawnX = bolt.getData('spawnX') as number;
            const spawnY = bolt.getData('spawnY') as number;
            const maxTravel = bolt.getData('maxTravel') as number;
            const dx = bolt.x - spawnX;
            const dy = bolt.y - spawnY;

            if (dx * dx + dy * dy >= maxTravel * maxTravel)
            {
                bolt.destroy();
                continue;
            }

            if (
                bolt.x < 0
                || bolt.x > this.worldWidth
                || bolt.y < 0
                || bolt.y > WORLD_HEIGHT
            )
            {
                bolt.destroy();
            }
        }
    }

    hitMurkling (murkling: Phaser.Physics.Arcade.Sprite)
    {
        if (this.gameEnded || !murkling.active || this.isMurklingDying(murkling))
        {
            return;
        }

        const knockback = this.player.x < murkling.x ? -MURKLING_KNOCKBACK_X : MURKLING_KNOCKBACK_X;

        this.player.setVelocityX(knockback);
        this.applyWizardDarknessHit(this.seasonSettings.murklingDarknessSpike);
    }

    collectStarlight (starlight: Phaser.Physics.Arcade.Sprite)
    {
        if (this.gameEnded || !starlight.active || starlight.getData('collecting'))
        {
            return;
        }

        starlight.setData('collecting', true);
        starlight.disableBody(true, false);

        playStarlightCollectAnimation(this, starlight, () =>
        {
            starlight.disableBody(true, true);

            const spawnKey = starlight.getData('spawnKey') as string | undefined;

            if (spawnKey)
            {
                this.starlightOccupiedKeys.delete(spawnKey);
            }

            this.starlightsCollected++;
            this.darkness = Math.max(0, this.darkness - this.seasonSettings.starlightDarknessRelief);

            this.updateDarknessVisuals();
            this.updateHud();
            this.spawnRandomStarlight();
            this.resetStarlightSpawnTimer();

            if (this.darkness <= 0)
            {
                if (this.currentSeason < TOTAL_SEASONS)
                {
                    this.completeSeason();
                }
                else
                {
                    this.endGame('victory');
                }
            }
        });
    }

    completeSeason ()
    {
        this.isAwaitingSeasonContinue = true;
        this.physics.pause();
        this.tweens.pauseAll();
        this.showSeasonTransitionMenu();
    }

    showSeasonTransitionMenu ()
    {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        this.seasonTransitionMenu = this.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(SEASON_TRANSITION_DEPTH);

        const backdrop = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.6);
        const title = this.add.text(
            centerX,
            centerY - 72,
            `${this.seasonSettings.name.toUpperCase()} COMPLETE`,
            {
                fontFamily: 'Arial Black',
                fontSize: 72,
                color: '#fff8c0',
                stroke: '#000000',
                strokeThickness: 10,
                align: 'center'
            }
        ).setOrigin(0.5);

        const message = this.add.text(centerX, centerY + 8, this.seasonSettings.transitionMessage, {
            fontFamily: 'Arial Black',
            fontSize: 28,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5);

        const continueButton = this.createPauseMenuButton(centerX, centerY + 88, 'Continue', () =>
        {
            this.continueToNextSeason();
        });

        this.seasonTransitionMenu.add([
            backdrop,
            title,
            message,
            continueButton.background,
            continueButton.label
        ]);
    }

    continueToNextSeason ()
    {
        if (!this.isAwaitingSeasonContinue)
        {
            return;
        }

        regenerateWorldMap();
        this.scene.restart({ season: (this.currentSeason + 1) as GameSeason });
    }

    hideSeasonTransitionMenu ()
    {
        this.seasonTransitionMenu?.destroy(true);
        this.seasonTransitionMenu = undefined;
    }

    updateDarknessVisuals ()
    {
        this.darknessOverlay.setAlpha(this.darkness);
        this.darknessBarFill.setScale(this.darkness, 1);

        const percent = Math.round(this.darkness * 100);

        if (percent !== this.hudDarknessPercent)
        {
            this.hudDarknessPercent = percent;
            this.darknessBarText.setText(`${percent}%`);
        }
    }

    updateHud ()
    {
        if (!this.hudStarlightCount)
        {
            return;
        }

        if (
            this.starlightsCollected === this.hudStarlightsCollected
            && this.totalStarlights === this.hudTotalStarlights
        )
        {
            return;
        }

        this.hudStarlightsCollected = this.starlightsCollected;
        this.hudTotalStarlights = this.totalStarlights;

        this.hudStarlightCount.setText(`${this.starlightsCollected}/${this.totalStarlights}`);
    }

    endGame (outcome: 'darkness' | 'victory')
    {
        if (this.gameEnded)
        {
            return;
        }

        this.gameEnded = true;
        this.freezeGameplay();

        if (outcome === 'darkness')
        {
            this.cancelPlayerAttack();
            this.playerAnimState = 'idle';
            this.setPlayerAnimation('die');
            this.showEndScreenText('GAME OVER', 'The sky went dark...');

            return;
        }

        this.startVictoryCelebration();
        this.showEndScreenText('VICTORY', 'You saved the world from the darkness!');
    }

    freezeGameplay ()
    {
        this.physics.pause();
        this.player.setVelocity(0, 0);
        this.player.off('animationcomplete-wizard-hurt', this.onPlayerHurtComplete, this);
        this.isHurt = false;
    }

    showEndScreenText (title: string, message: string)
    {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        this.gameOverTitle = this.add.text(centerX, centerY - 72, title, {
            fontFamily: 'Arial Black',
            fontSize: 104,
            color: '#fff8c0',
            stroke: '#000000',
            strokeThickness: 12,
            align: 'center'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        this.gameOverMessage = this.add.text(centerX, centerY + 44, message, {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);
    }

    startVictoryCelebration ()
    {
        this.isVictoryCelebration = true;
        this.victoryGroundY = this.getPlatformSurfaceYAt(this.player.x, this.player.y);
        this.player.setY(this.victoryGroundY);
        this.player.off('animationcomplete-wizard-jump', this.onVictoryJumpComplete, this);
        this.player.on('animationcomplete-wizard-jump', this.onVictoryJumpComplete, this);
        this.playVictoryJumpCycle();
    }

    getPlatformSurfaceYAt (worldX: number, feetY: number): number
    {
        const col = PhaserMath.Clamp(
            Math.floor(worldX / TILE_WIDTH),
            0,
            WORLD_MAP_COLS - 1
        );
        const footTolerance = TILE_HEIGHT;
        let surfaceY: number | null = null;

        for (let row = 0; row < WORLD_MAP_ROWS; row++)
        {
            if (worldMap[row][col] !== CELL_PLATFORM)
            {
                continue;
            }

            const platformSurfaceY = tileSurfaceY(row);

            // Nearest platform at or below the wizard (works when grounded or mid-air above a run).
            if (platformSurfaceY < feetY - footTolerance)
            {
                continue;
            }

            if (surfaceY === null || platformSurfaceY < surfaceY)
            {
                surfaceY = platformSurfaceY;
            }
        }

        return surfaceY ?? tileSurfaceY(WORLD_MAP_ROWS - 1);
    }

    playVictoryJumpCycle ()
    {
        if (!this.isVictoryCelebration)
        {
            return;
        }

        this.victoryJumpTween?.stop();
        this.player.setY(this.victoryGroundY);
        this.playerAnimState = 'jump';
        this.player.anims.play({
            key: 'wizard-jump',
            frameRate: VICTORY_JUMP_FRAME_RATE,
            repeat: 0
        });
        this.updatePlayerBody();

        this.victoryJumpTween = this.tweens.add({
            targets: this.player,
            y: this.victoryGroundY - VICTORY_JUMP_HEIGHT,
            duration: VICTORY_JUMP_ASCENT_MS,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }

    onVictoryJumpComplete ()
    {
        if (!this.isVictoryCelebration)
        {
            return;
        }

        this.playVictoryJumpCycle();
    }

    togglePause ()
    {
        if (this.isPaused)
        {
            this.resumeGame();
        }
        else
        {
            this.pauseGame();
        }
    }

    pauseGame ()
    {
        this.isPaused = true;
        this.physics.pause();
        this.tweens.pauseAll();
        this.showPauseMenu();
    }

    resumeGame ()
    {
        this.isPaused = false;
        this.hidePauseMenu();
        this.physics.resume();
        this.tweens.resumeAll();
    }

    restartGame ()
    {
        this.isPaused = false;
        regenerateWorldMap();
        this.scene.restart({ season: DEFAULT_START_SEASON });
    }

    showPauseMenu ()
    {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        this.pauseMenu = this.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(PAUSE_MENU_DEPTH);

        const backdrop = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.55);
        const panel = this.add.rectangle(centerX, centerY, 440, 300, 0x120820, 0.96)
            .setStrokeStyle(3, 0xfff8c0, 0.8);

        const title = this.add.text(centerX, centerY - 88, 'The game is being paused', {
            fontFamily: 'Arial Black',
            fontSize: 30,
            color: '#fff8c0',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5);

        const resumeButton = this.createPauseMenuButton(centerX, centerY - 8, 'Resume', () => this.resumeGame());
        const newGameButton = this.createPauseMenuButton(centerX, centerY + 62, 'New Game', () => this.restartGame());

        this.pauseMenu.add([
            backdrop,
            panel,
            title,
            resumeButton.background,
            resumeButton.label,
            newGameButton.background,
            newGameButton.label
        ]);
    }

    createPauseMenuButton (
        x: number,
        y: number,
        label: string,
        onSelect: () => void
    )
    {
        const background = this.add.rectangle(x, y, 300, 48, 0x5030a0, 1)
            .setStrokeStyle(2, 0xfff8c0, 0.9)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(x, y, label, {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        background.on('pointerover', () => background.setFillStyle(0x6840c0));
        background.on('pointerout', () => background.setFillStyle(0x5030a0));
        background.on('pointerdown', onSelect);

        return { background, label: text };
    }

    hidePauseMenu ()
    {
        this.pauseMenu?.destroy(true);
        this.pauseMenu = undefined;
    }

    setupDebugControls ()
    {
        if (DEBUG_PHYSICS)
        {
            this.physics.world.drawDebug = true;
        }

        if (DEBUG_WORLD_GRID)
        {
            this.createWorldGridDebug(true);
        }

        const debugKeys = this.input.keyboard!;

        debugKeys.on('keydown-P', () => this.togglePhysicsDebug());
        debugKeys.on('keydown-G', () => this.toggleWorldGridDebug());
    }

    togglePhysicsDebug ()
    {
        const world = this.physics.world;

        if (!world.debugGraphic)
        {
            world.createDebugGraphic();
        }

        world.drawDebug = !world.drawDebug;
    }

    createWorldGridDebug (visible: boolean)
    {
        if (!this.worldGridDebug)
        {
            const graphics = this.add.graphics().setDepth(100);

            for (let row = 0; row < WORLD_MAP_ROWS; row++)
            {
                for (let col = 0; col < WORLD_MAP_COLS; col++)
                {
                    const x = col * TILE_WIDTH;
                    const y = row * TILE_HEIGHT;

                    const cell = worldMap[row][col];

                    if (cell === 1)
                    {
                        graphics.fillStyle(0x00ff88, 0.15);
                        graphics.fillRect(x, y, TILE_WIDTH, TILE_HEIGHT);
                    }
                    else if (isTreeCell(cell))
                    {
                        graphics.fillStyle(cell === CELL_TREE_2 ? 0xffdd66 : 0xffaa44, 0.2);
                        graphics.fillRect(x, y, TILE_WIDTH, TILE_HEIGHT);
                    }

                    graphics.lineStyle(1, 0xffffff, 0.08);
                    graphics.strokeRect(x, y, TILE_WIDTH, TILE_HEIGHT);
                }
            }

            this.worldGridDebug = graphics;
        }

        this.worldGridDebug.setVisible(visible);
    }

    toggleWorldGridDebug ()
    {
        const visible = !this.worldGridDebug?.visible;

        this.createWorldGridDebug(visible);
    }

    updatePlayerBody ()
    {
        const bodyWidth = this.player.width * 0.35;
        const bodyHeight = this.player.height * 0.85;

        this.player.body.setSize(bodyWidth, bodyHeight);
        this.player.body.setOffset(
            (this.player.width - bodyWidth) / 2,
            this.player.height - bodyHeight
        );
    }

    setPlayerAnimation (state: PlayerAnimState)
    {
        if (this.playerAnimState === 'die')
        {
            return;
        }

        if (this.playerAnimState === 'hurt' && state !== 'hurt' && this.isHurt)
        {
            return;
        }

        if (this.playerAnimState === 'attack' && state !== 'attack' && this.isAttacking)
        {
            return;
        }

        if (this.playerAnimState === state && !this.isVictoryCelebration)
        {
            return;
        }

        this.playerAnimState = state;

        switch (state)
        {
            case 'jump':
                this.player.anims.play('wizard-jump');
                break;
            case 'walk':
                this.player.anims.play('wizard-walk');
                break;
            case 'run':
                this.player.anims.play('wizard-run');
                break;
            case 'idle':
                this.player.anims.play('wizard-idle');
                break;
            case 'hurt':
                this.player.anims.play('wizard-hurt');
                break;
            case 'die':
                this.player.anims.play('wizard-die');
                break;
            case 'attack':
                this.player.anims.play('wizard-attack');
                break;
        }

        this.updatePlayerBody();
    }

    playPlayerHurt ()
    {
        this.cancelPlayerAttack();
        this.isHurt = true;
        this.player.off('animationcomplete-wizard-hurt', this.onPlayerHurtComplete, this);
        this.playerAnimState = 'idle';
        this.setPlayerAnimation('hurt');
        this.player.once('animationcomplete-wizard-hurt', this.onPlayerHurtComplete, this);
    }

    onPlayerHurtComplete ()
    {
        this.isHurt = false;
        this.setPlayerAnimation('idle');
    }

    update (_time: number, delta: number)
    {
        if (!this.player || !this.cursors)
        {
            return;
        }

        if (this.isAwaitingSeasonContinue)
        {
            if (
                Input.Keyboard.JustDown(this.enterKey)
                || Input.Keyboard.JustDown(this.spaceKey)
            )
            {
                this.continueToNextSeason();
            }

            return;
        }

        if (Input.Keyboard.JustDown(this.escKey) && !this.gameEnded)
        {
            this.togglePause();
        }

        if (this.isPaused)
        {
            return;
        }

        if (this.gameEnded)
        {
            this.updateWorldEntityDepths();
            return;
        }

        const dt = Math.min(delta, MAX_FRAME_DELTA_MS);

        this.starlightSpawnElapsed += dt;

        if (this.starlightSpawnElapsed >= this.seasonSettings.starlightSpawnIntervalMs)
        {
            this.starlightSpawnElapsed = 0;
            this.spawnRandomStarlight();
        }

        this.murklingSpawnElapsed += dt;

        if (this.murklingSpawnElapsed >= this.seasonSettings.murklingSpawnIntervalMs)
        {
            this.murklingSpawnElapsed = 0;
            this.spawnRandomMurkling();
        }

        this.darkness = Math.min(
            1,
            this.darkness + dt / (this.seasonSettings.darknessFillSeconds * 1000)
        );
        this.updateDarknessVisuals();

        if (this.darkness >= 1)
        {
            this.endGame('darkness');
            return;
        }

        this.updateMurklings();
        this.updateMurklingProjectiles();
        this.updateFireballs();

        const onFloor = this.player.body.onFloor();

        if (onFloor)
        {
            this.groundedFrames++;
            this.airFrames = 0;
        }
        else
        {
            this.airFrames++;
            this.groundedFrames = 0;
        }

        const isGrounded = this.groundedFrames >= 1;
        const inAir = this.airFrames >= 2;
        const isMoving = this.cursors.left.isDown || this.cursors.right.isDown;
        const isRunning = isMoving && this.shiftKey.isDown;
        const velocityX = this.player.body.velocity.x;
        const isCoasting = !isMoving && isGrounded && Math.abs(velocityX) > 8;

        const jumpPressed = Input.Keyboard.JustDown(this.cursors.up!);
        const attackPressed = Input.Keyboard.JustDown(this.spaceKey);

        if (attackPressed)
        {
            this.playPlayerAttack();
        }

        const speed = isRunning ? RUN_SPEED : PLAYER_SPEED;
        const jumpVelocity = isRunning ? RUN_JUMP_VELOCITY : JUMP_VELOCITY;

        if (jumpPressed && isGrounded && !this.isAttacking)
        {
            this.player.setVelocityY(jumpVelocity);
            this.airFrames = 2;
            this.groundedFrames = 0;
        }

        if (!this.isAttacking)
        {
            if (this.cursors.left.isDown)
            {
                this.player.setVelocityX(-speed);
                this.player.setFlipX(true);
            }
            else if (this.cursors.right.isDown)
            {
                this.player.setVelocityX(speed);
                this.player.setFlipX(false);
            }
            else if (isCoasting)
            {
                this.player.setFlipX(velocityX < 0);
            }
        }
        else
        {
            this.player.setVelocityX(0);
        }

        if (!this.isHurt && !this.isAttacking)
        {
            if (inAir)
            {
                this.setPlayerAnimation('jump');
            }
            else if (isRunning)
            {
                this.setPlayerAnimation('run');
            }
            else if (isMoving || isCoasting)
            {
                this.setPlayerAnimation('walk');
            }
            else
            {
                this.setPlayerAnimation('idle');
            }
        }

        this.updateWorldEntityDepths();
    }

    changeScene ()
    {
        this.endGame('darkness');
    }
}
