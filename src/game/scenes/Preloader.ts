import { Scene, Textures } from 'phaser';
import {
    MURKLING_DIE_FPS,
    MURKLING_DIE_SHEET_FRAMES,
    MURKLING_FRAME_SIZE,
    MURKLING_WALK_FPS,
    MURKLING_WALK_SHEET_FRAMES
} from '../config/baddiesConfig';
import {
    WIZARD_ATTACK_FPS,
    WIZARD_ATTACK_SHEET_FRAMES,
    WIZARD_DIE_SHEET_FRAMES
} from '../config/wizardCombatConfig';

const WIZARD_FRAME_WIDTH = 96;
const WIZARD_FRAME_HEIGHT = 76;

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(centerX, centerY, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(centerX, centerY, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(centerX - 230, centerY, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('bg-layer-1', 'background/spring/1.png');
        this.load.image('bg-layer-2', 'background/spring/2.png');
        this.load.image('bg-layer-3', 'background/spring/3.png');
        this.load.image('bg-layer-4', 'background/spring/4.png');

        this.load.image('bg-summer-layer-1', 'background/summer/1.png');
        this.load.image('bg-summer-layer-2', 'background/summer/2.png');
        this.load.image('bg-summer-layer-3', 'background/summer/3.png');
        this.load.image('bg-summer-layer-4', 'background/summer/4.png');

        this.load.image('bg-fall-layer-1', 'background/fall/1.png');
        this.load.image('bg-fall-layer-2', 'background/fall/2.png');
        this.load.image('bg-fall-layer-3', 'background/fall/3.png');
        this.load.image('bg-fall-layer-4', 'background/fall/4.png');
        this.load.image('bg-fall-layer-5', 'background/fall/5.png');

        this.load.image('bg-winter-layer-1', 'background/winter/1.png');
        this.load.image('bg-winter-layer-2', 'background/winter/2.png');
        this.load.image('bg-winter-layer-3', 'background/winter/3.png');
        this.load.image('bg-winter-layer-4', 'background/winter/4.png');

        this.load.image('platform-tile-11', 'platform/tiles/11.png');
        this.load.image('starlight', 'starlight/stars.png');
        this.load.image('tree-spring', 'platform/elements/tree-spring.png');
        this.load.image('tree-summer', 'platform/elements/tree-summer.png');
        this.load.image('tree-fall', 'platform/elements/tree-fall.png');
        this.load.image('tree-winter', 'platform/elements/tree-winter.png');
        this.load.image('tree2-spring', 'platform/elements/tree2-spring.png');
        this.load.image('tree2-summer', 'platform/elements/tree2-summer.png');
        this.load.image('tree2-fall', 'platform/elements/tree2-fall.png');
        this.load.image('tree2-winter', 'platform/elements/tree2-winter.png');

        this.load.spritesheet('wizard', 'wizard/wizard-sheet.png', {
            frameWidth: WIZARD_FRAME_WIDTH,
            frameHeight: WIZARD_FRAME_HEIGHT
        });

        this.load.spritesheet('murkling', 'murkling/murkling-sheet.png', {
            frameWidth: MURKLING_FRAME_SIZE,
            frameHeight: MURKLING_FRAME_SIZE
        });
    }

    create ()
    {
        this.anims.create({
            key: 'wizard-idle',
            frames: this.anims.generateFrameNumbers('wizard', { start: 0, end: 4 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'wizard-walk',
            frames: this.anims.generateFrameNumbers('wizard', { start: 5, end: 9 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'wizard-run',
            frames: this.anims.generateFrameNumbers('wizard', { start: 10, end: 14 }),
            frameRate: 14,
            repeat: -1
        });

        this.anims.create({
            key: 'wizard-jump',
            frames: this.anims.generateFrameNumbers('wizard', { start: 15, end: 19 }),
            frameRate: 12,
            repeat: 0
        });

        this.anims.create({
            key: 'wizard-hurt',
            frames: this.anims.generateFrameNumbers('wizard', { start: 20, end: 24 }),
            frameRate: 14,
            repeat: 0
        });

        this.anims.create({
            key: 'wizard-die',
            frames: this.anims.generateFrameNumbers('wizard', { frames: [ ...WIZARD_DIE_SHEET_FRAMES ] }),
            frameRate: 10,
            repeat: 0
        });

        this.anims.create({
            key: 'wizard-attack',
            frames: this.anims.generateFrameNumbers('wizard', { frames: [ ...WIZARD_ATTACK_SHEET_FRAMES ] }),
            frameRate: WIZARD_ATTACK_FPS,
            repeat: 0
        });

        this.createFireballTexture();
        this.createMurklingBoltTexture();
        this.configureMurklingTextures();

        this.anims.create({
            key: 'murkling-walk',
            frames: this.anims.generateFrameNumbers('murkling', {
                frames: [ ...MURKLING_WALK_SHEET_FRAMES ]
            }),
            frameRate: MURKLING_WALK_FPS,
            repeat: -1
        });

        this.anims.create({
            key: 'murkling-die',
            frames: this.anims.generateFrameNumbers('murkling', {
                frames: [ ...MURKLING_DIE_SHEET_FRAMES ]
            }),
            frameRate: MURKLING_DIE_FPS,
            repeat: 0
        });

        this.scene.start('Story');
    }

    configureMurklingTextures ()
    {
        if (this.textures.exists('murkling'))
        {
            this.textures.get('murkling').setFilter(Textures.FilterMode.NEAREST);
        }
    }

    createFireballTexture ()
    {
        const size = 24;
        const graphics = this.add.graphics();

        graphics.fillStyle(0xff6600, 1);
        graphics.fillCircle(size / 2, size / 2, 9);
        graphics.fillStyle(0xffcc33, 1);
        graphics.fillCircle(size / 2, size / 2, 5);

        graphics.generateTexture('fireball', size, size);
        graphics.destroy();
    }

    createMurklingBoltTexture ()
    {
        const size = 16;
        const graphics = this.add.graphics();

        graphics.fillStyle(0x442266, 1);
        graphics.fillCircle(size / 2, size / 2, 7);
        graphics.fillStyle(0x9966cc, 1);
        graphics.fillCircle(size / 2, size / 2, 4);

        graphics.generateTexture('murkling-bolt', size, size);
        graphics.destroy();
    }
}
