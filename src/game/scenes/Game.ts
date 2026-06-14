import { Input, Scene } from 'phaser';
import {
    GLOOM_MITE_DARKNESS_SPIKE,
    GLOOM_MITE_DISPLAY_SIZE,
    GLOOM_MITE_HIT_COOLDOWN_MS,
    GLOOM_MITE_KNOCKBACK_X,
    GLOOM_MITE_PATROL_SPEED
} from '../baddiesConfig';
import { EventBus } from '../EventBus';
import { DEBUG_PHYSICS, DEBUG_WORLD_GRID } from '../debug';
import { DARKNESS_FILL_SECONDS, STARLIGHT_DISPLAY_SIZE } from '../starlightConfig';
import { TREE_DEPTH } from '../elementsConfig';
import { playStarlightCollectAnimation, setupStarlightIdleAnimations } from '../starlightAnimations';
import { getGloomMiteSpawns } from '../world/gloomMiteSpawns';
import { getStarlightSpawns } from '../world/starlightSpawns';
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
    worldMap
} from '../world/worldMap';

const PLAYER_SPEED = 240;
const RUN_SPEED = 360;
/** Horizontal drag — coasts to a stop when movement keys are released. */
const PLAYER_DRAG_X = 1400;
const ARCADE_GRAVITY = 800;
const WALK_JUMP_ROWS = 5;
const RUN_JUMP_ROWS = 6;
const JUMP_VELOCITY = -Math.round(Math.sqrt(2 * ARCADE_GRAVITY * WALK_JUMP_ROWS * TILE_HEIGHT));
const RUN_JUMP_VELOCITY = -Math.round(Math.sqrt(2 * ARCADE_GRAVITY * RUN_JUMP_ROWS * TILE_HEIGHT));
const BACKGROUND_SCROLL_FACTORS = [0.1, 0.25, 0.45, 0.65];

type PlayerAnimState = 'idle' | 'walk' | 'run' | 'jump' | 'hurt';

export class Game extends Scene
{
    worldWidth = 0;
    backgroundLayers: Phaser.GameObjects.TileSprite[] = [];
    platforms: Phaser.Physics.Arcade.StaticGroup;
    player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    spaceKey: Phaser.Input.Keyboard.Key;
    shiftKey: Phaser.Input.Keyboard.Key;
    playerAnimState: PlayerAnimState = 'idle';
    isHurt = false;
    airFrames = 0;
    groundedFrames = 0;
    worldGridDebug?: Phaser.GameObjects.Graphics;
    starlights: Phaser.Physics.Arcade.Group;
    gloomMites: Phaser.Physics.Arcade.Group;
    darknessOverlay: Phaser.GameObjects.Rectangle;
    hudText: Phaser.GameObjects.Text;
    darkness = 0;
    starlightsCollected = 0;
    totalStarlights = 0;
    gameEnded = false;
    lastGloomMiteHitTime = 0;
    hudStarlightsCollected = -1;
    hudTotalStarlights = -1;
    hudSkyPercent = -1;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        const { width, height } = this.scale;
        const centerY = height / 2;

        this.worldWidth = WORLD_WIDTH;
        const worldCenterX = this.worldWidth / 2;

        this.physics.world.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
        this.cameras.main.setBounds(0, 0, this.worldWidth, WORLD_HEIGHT);
        this.cameras.main.roundPixels = false;

        const layerKeys = ['bg-layer-1', 'bg-layer-2', 'bg-layer-3', 'bg-layer-4'];
        const bgScale = Math.max(width / 576, height / 324);
        const bgDisplayHeight = 324 * bgScale;

        layerKeys.forEach((key, index) =>
        {
            const layer = this.add.tileSprite(worldCenterX, centerY, this.worldWidth, bgDisplayHeight, key)
                .setTileScale(bgScale)
                .setDepth(index)
                .setScrollFactor(BACKGROUND_SCROLL_FACTORS[index]);

            this.backgroundLayers.push(layer);
        });

        this.platforms = this.physics.add.staticGroup();

        for (let row = 0; row < WORLD_MAP_ROWS; row++)
        {
            for (let col = 0; col < WORLD_MAP_COLS; col++)
            {
                if (worldMap[row][col] !== CELL_PLATFORM)
                {
                    continue;
                }

                const { x, y } = tileToWorld(col, row);
                const tile = this.platforms.create(x, y, 'platform-tile-11');

                tile.setOrigin(0.5, 1).setDepth(10).refreshBody();
            }
        }

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
            }
        }

        const groundRow = WORLD_MAP_ROWS - 1;
        const playerX = 80;

        this.player = this.physics.add.sprite(playerX, tileSurfaceY(groundRow), 'wizard-idle-0');
        this.player.setOrigin(0.5, 1);
        this.player.setDepth(20);
        this.player.setCollideWorldBounds(true);
        this.player.setDragX(PLAYER_DRAG_X);

        this.updatePlayerBody();

        this.physics.add.collider(this.player, this.platforms);

        this.spawnStarlights();
        this.spawnGloomMites();

        this.darknessOverlay = this.add.rectangle(0, 0, width, height, 0x020218, 0)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(30);

        this.hudText = this.add.text(16, 16, '', {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#fff8c0',
            stroke: '#000000',
            strokeThickness: 4
        })
            .setScrollFactor(0)
            .setDepth(31);

        this.updateHud();

        this.cameras.main.startFollow(this.player, true, 1, 0);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SHIFT);

        if (import.meta.env.DEV)
        {
            this.setupDebugControls();
        }

        EventBus.emit('current-scene-ready', this);
    }

    spawnStarlights ()
    {
        const spawns = getStarlightSpawns(worldMap);

        this.totalStarlights = spawns.length;
        this.starlights = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });

        for (const { col, row, floatOffsetPx } of spawns)
        {
            const { x } = tileToWorld(col, row);
            const y = tileSurfaceY(row) - floatOffsetPx;
            const starlight = this.starlights.create(x, y, 'starlight') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;

            starlight.setDepth(15);
            starlight.setDisplaySize(STARLIGHT_DISPLAY_SIZE, STARLIGHT_DISPLAY_SIZE);

            const hitRadius = STARLIGHT_DISPLAY_SIZE * 0.35;
            const hitOffset = STARLIGHT_DISPLAY_SIZE * 0.15;

            starlight.body.setCircle(hitRadius, hitOffset, hitOffset);

            setupStarlightIdleAnimations(this, starlight, col, row);
        }

        this.physics.add.overlap(
            this.player,
            this.starlights,
            (_player, starlightObject) => this.collectStarlight(starlightObject as Phaser.Physics.Arcade.Sprite)
        );
    }

    spawnGloomMites ()
    {
        const spawns = getGloomMiteSpawns(worldMap);

        this.gloomMites = this.physics.add.group();

        for (const { col, row, startCol, endCol } of spawns)
        {
            const { x } = tileToWorld(col, row);
            const y = tileSurfaceY(row);
            const mite = this.gloomMites.create(x, y, 'gloom-mite') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

            mite.setOrigin(0.5, 1);
            mite.setDepth(18);
            mite.setDisplaySize(GLOOM_MITE_DISPLAY_SIZE, GLOOM_MITE_DISPLAY_SIZE);
            mite.setCollideWorldBounds(false);

            const patrolMinX = startCol * TILE_WIDTH + TILE_WIDTH / 2;
            const patrolMaxX = endCol * TILE_WIDTH + TILE_WIDTH / 2;
            const patrolRight = col < startCol + (endCol - startCol) / 2;

            mite.setData('patrolMinX', patrolMinX);
            mite.setData('patrolMaxX', patrolMaxX);
            mite.setFlipX(!patrolRight);
            mite.setVelocityX(patrolRight ? GLOOM_MITE_PATROL_SPEED : -GLOOM_MITE_PATROL_SPEED);

            const bodyWidth = GLOOM_MITE_DISPLAY_SIZE * 0.7;
            const bodyHeight = GLOOM_MITE_DISPLAY_SIZE * 0.55;

            mite.body.setSize(bodyWidth, bodyHeight);
            mite.body.setOffset(
                (mite.width - bodyWidth) / 2,
                mite.height - bodyHeight
            );
        }

        this.physics.add.collider(this.gloomMites, this.platforms);
        this.physics.add.overlap(
            this.player,
            this.gloomMites,
            (_player, miteObject) => this.hitGloomMite(miteObject as Phaser.Physics.Arcade.Sprite)
        );
    }

    updateGloomMites ()
    {
        for (const miteObject of this.gloomMites.getChildren())
        {
            const mite = miteObject as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            const patrolMinX = mite.getData('patrolMinX') as number;
            const patrolMaxX = mite.getData('patrolMaxX') as number;

            if (mite.x <= patrolMinX)
            {
                mite.x = patrolMinX;
                mite.setFlipX(false);
            }
            else if (mite.x >= patrolMaxX)
            {
                mite.x = patrolMaxX;
                mite.setFlipX(true);
            }

            mite.setVelocityX(mite.flipX ? -GLOOM_MITE_PATROL_SPEED : GLOOM_MITE_PATROL_SPEED);
        }
    }

    hitGloomMite (mite: Phaser.Physics.Arcade.Sprite)
    {
        if (this.gameEnded || !mite.active)
        {
            return;
        }

        const now = this.time.now;

        if (now - this.lastGloomMiteHitTime < GLOOM_MITE_HIT_COOLDOWN_MS)
        {
            return;
        }

        this.lastGloomMiteHitTime = now;
        this.darkness = Math.min(1, this.darkness + GLOOM_MITE_DARKNESS_SPIKE);
        this.updateHud();

        const knockback = this.player.x < mite.x ? -GLOOM_MITE_KNOCKBACK_X : GLOOM_MITE_KNOCKBACK_X;

        this.player.setVelocityX(knockback);
        this.playPlayerHurt();
        this.player.setTint(0xaa66ff);
        this.time.delayedCall(200, () => this.player.clearTint());

        if (this.darkness >= 1)
        {
            this.endGame('darkness');
        }
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
            this.starlightsCollected++;

            if (this.totalStarlights > 0)
            {
                const relief = 1 / this.totalStarlights;

                this.darkness = Math.max(0, this.darkness - relief);
            }

            this.updateHud();

            if (this.starlightsCollected >= this.totalStarlights)
            {
                this.endGame('victory');
            }
        });
    }

    updateHud ()
    {
        const skyPercent = Math.round(this.darkness * 100);

        if (
            this.starlightsCollected === this.hudStarlightsCollected
            && this.totalStarlights === this.hudTotalStarlights
            && skyPercent === this.hudSkyPercent
        )
        {
            return;
        }

        this.hudStarlightsCollected = this.starlightsCollected;
        this.hudTotalStarlights = this.totalStarlights;
        this.hudSkyPercent = skyPercent;

        this.hudText.setText(`Starlights: ${this.starlightsCollected}/${this.totalStarlights}\nSky dark: ${skyPercent}%`);
    }

    endGame (outcome: 'darkness' | 'victory')
    {
        if (this.gameEnded)
        {
            return;
        }

        this.gameEnded = true;
        this.scene.start('GameOver', { outcome });
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
        if (this.playerAnimState === state)
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
        }

        this.updatePlayerBody();
    }

    playPlayerHurt ()
    {
        this.isHurt = true;
        this.player.off('animationcomplete-wizard-hurt', this.onPlayerHurtComplete, this);
        this.playerAnimState = 'idle';
        this.setPlayerAnimation('hurt');
        this.player.once('animationcomplete-wizard-hurt', this.onPlayerHurtComplete, this);
    }

    onPlayerHurtComplete ()
    {
        this.isHurt = false;
        this.playerAnimState = 'idle';
    }

    update (_time: number, delta: number)
    {
        if (!this.player || !this.cursors || this.gameEnded)
        {
            return;
        }

        this.darkness = Math.min(1, this.darkness + delta / (DARKNESS_FILL_SECONDS * 1000));
        this.darknessOverlay.setAlpha(this.darkness * 0.92);

        const skyPercent = Math.round(this.darkness * 100);

        if (skyPercent !== this.hudSkyPercent)
        {
            this.updateHud();
        }

        if (this.darkness >= 1)
        {
            this.endGame('darkness');
            return;
        }

        this.updateGloomMites();

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

        const jumpPressed = Input.Keyboard.JustDown(this.cursors.up!)
            || Input.Keyboard.JustDown(this.spaceKey);
        const speed = isRunning ? RUN_SPEED : PLAYER_SPEED;
        const jumpVelocity = isRunning ? RUN_JUMP_VELOCITY : JUMP_VELOCITY;

        if (jumpPressed && isGrounded)
        {
            this.player.setVelocityY(jumpVelocity);
            this.airFrames = 2;
            this.groundedFrames = 0;
        }

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

        if (!this.isHurt)
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
    }

    changeScene ()
    {
        this.endGame('darkness');
    }
}
