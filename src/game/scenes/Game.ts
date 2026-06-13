import { Input, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { DEBUG_PHYSICS, DEBUG_WORLD_GRID } from '../debug';
import {
    TILE_HEIGHT,
    TILE_WIDTH,
    WORLD_HEIGHT,
    WORLD_MAP_COLS,
    WORLD_MAP_ROWS,
    WORLD_WIDTH,
    tileSurfaceY,
    tileToWorld,
    worldMap
} from '../world/worldMap';

const PLAYER_SPEED = 220;
const RUN_SPEED = 330;
const JUMP_VELOCITY = -420;
const ARCADE_GRAVITY = 800;
const RUN_JUMP_ROWS = 5;
const RUN_JUMP_VELOCITY = -Math.round(Math.sqrt(2 * ARCADE_GRAVITY * RUN_JUMP_ROWS * TILE_HEIGHT));
const BACKGROUND_SCROLL_FACTORS = [0.1, 0.25, 0.45, 0.65];

type PlayerAnimState = 'idle' | 'walk' | 'run' | 'jump';

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
    airFrames = 0;
    groundedFrames = 0;
    worldGridDebug?: Phaser.GameObjects.Graphics;

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
        this.cameras.main.roundPixels = true;

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
                if (worldMap[row][col] !== 1)
                {
                    continue;
                }

                const { x, y } = tileToWorld(col, row);
                const tile = this.platforms.create(x, y, 'platform-tile-11');

                tile.setOrigin(0.5, 1).setDepth(10).refreshBody();
            }
        }

        const groundRow = WORLD_MAP_ROWS - 1;
        const playerX = 80;

        this.player = this.physics.add.sprite(playerX, tileSurfaceY(groundRow), 'wizard-idle-0');
        this.player.setOrigin(0.5, 1);
        this.player.setDepth(20);
        this.player.setCollideWorldBounds(true);

        this.updatePlayerBody();

        this.physics.add.collider(this.player, this.platforms);

        this.cameras.main.startFollow(this.player, true, 0.1, 0);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SHIFT);

        if (import.meta.env.DEV)
        {
            this.setupDebugControls();
        }

        EventBus.emit('current-scene-ready', this);
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

                    if (worldMap[row][col] === 1)
                    {
                        graphics.fillStyle(0x00ff88, 0.15);
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
        }

        this.updatePlayerBody();
    }

    update ()
    {
        if (!this.player || !this.cursors)
        {
            return;
        }

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

        const isMoving = this.cursors.left.isDown || this.cursors.right.isDown;
        const isRunning = isMoving && this.shiftKey.isDown;

        const jumpPressed = Input.Keyboard.JustDown(this.cursors.up!)
            || Input.Keyboard.JustDown(this.spaceKey);
        const isGrounded = this.groundedFrames >= 1;
        const inAir = this.airFrames >= 2;
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
        else
        {
            this.player.setVelocityX(0);
        }

        if (inAir)
        {
            this.setPlayerAnimation('jump');
        }
        else if (isRunning)
        {
            this.setPlayerAnimation('run');
        }
        else if (isMoving)
        {
            this.setPlayerAnimation('walk');
        }
        else
        {
            this.setPlayerAnimation('idle');
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
