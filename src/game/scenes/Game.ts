import { Input, Scene } from 'phaser';
import { EventBus } from '../EventBus';

const PLAYER_SPEED = 220;
const JUMP_VELOCITY = -420;
const WORLD_WIDTH_MULTIPLIER = 5;
const BACKGROUND_SCROLL_FACTORS = [0.1, 0.25, 0.45, 0.65];

type PlayerAnimState = 'idle' | 'walk' | 'jump';

export class Game extends Scene
{
    worldWidth = 0;
    backgroundLayers: Phaser.GameObjects.TileSprite[] = [];
    platform: Phaser.GameObjects.TileSprite;
    player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    spaceKey: Phaser.Input.Keyboard.Key;
    playerAnimState: PlayerAnimState = 'idle';
    airFrames = 0;
    groundedFrames = 0;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        const { width, height } = this.scale;
        const centerY = height / 2;

        this.worldWidth = width * WORLD_WIDTH_MULTIPLIER;
        const worldCenterX = this.worldWidth / 2;

        this.physics.world.setBounds(0, 0, this.worldWidth, height);
        this.cameras.main.setBounds(0, 0, this.worldWidth, height);
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

        const platformHeight = 24;
        const platformTop = height - platformHeight;

        this.platform = this.add.tileSprite(worldCenterX, height, this.worldWidth, platformHeight, 'platform-tile-11')
            .setOrigin(0.5, 1)
            .setDepth(10);

        const ground = this.add.rectangle(worldCenterX, platformTop, this.worldWidth, platformHeight, 0x000000, 0)
            .setOrigin(0.5, 0);

        this.physics.add.existing(ground, true);

        const playerX = 80;

        this.player = this.physics.add.sprite(playerX, platformTop, 'wizard-idle-0');
        this.player.setOrigin(0.5, 1);
        this.player.setDepth(20);
        this.player.setCollideWorldBounds(true);

        this.updatePlayerBody();

        this.physics.add.collider(this.player, ground);

        this.cameras.main.startFollow(this.player, true, 0.1, 0);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SPACE);

        EventBus.emit('current-scene-ready', this);
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

        const jumpPressed = Input.Keyboard.JustDown(this.cursors.up!)
            || Input.Keyboard.JustDown(this.spaceKey);
        const isGrounded = this.groundedFrames >= 1;
        const inAir = this.airFrames >= 2;

        if (jumpPressed && isGrounded)
        {
            this.player.setVelocityY(JUMP_VELOCITY);
            this.airFrames = 2;
            this.groundedFrames = 0;
        }

        if (this.cursors.left.isDown)
        {
            this.player.setVelocityX(-PLAYER_SPEED);
            this.player.setFlipX(true);
        }
        else if (this.cursors.right.isDown)
        {
            this.player.setVelocityX(PLAYER_SPEED);
            this.player.setFlipX(false);
        }
        else
        {
            this.player.setVelocityX(0);
        }

        const isMoving = this.cursors.left.isDown || this.cursors.right.isDown;

        if (inAir)
        {
            this.setPlayerAnimation('jump');
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
