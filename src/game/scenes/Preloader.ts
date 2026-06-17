import { Scene } from 'phaser';
import {
    MURKLING_FRAME_SIZE,
    MURKLING_WALK_FPS,
    MURKLING_WALK_FRAME_COUNT
} from '../baddiesConfig';

const WIZARD_FRAME_WIDTH = 72;
const WIZARD_FRAME_HEIGHT = 76;

const WIZARD_DIE_FRAME_IDS = ['000', '003', '007', '009', '014'] as const;

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

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

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');

        this.load.image('bg-layer-1', 'background/1.png');
        this.load.image('bg-layer-2', 'background/2.png');
        this.load.image('bg-layer-3', 'background/3.png');
        this.load.image('bg-layer-4', 'background/4.png');

        this.load.image('platform-tile-11', 'platform/tiles/11.png');
        this.load.image('starlight', 'starlight/stars.png');
        this.load.image('tree-1', 'platform/elements/tree1.png');
        this.load.image('tree-2', 'platform/elements/tree2.png');

        this.load.spritesheet('wizard', 'wizard/wizard-sheet.png', {
            frameWidth: WIZARD_FRAME_WIDTH,
            frameHeight: WIZARD_FRAME_HEIGHT
        });

        for (const frameId of WIZARD_DIE_FRAME_IDS)
        {
            this.load.image(`wizard-die-${frameId}`, `wizard/7_DIE_${frameId}.png`);
        }

        this.load.spritesheet('murkling', 'monster/walk.png', {
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
            frames: WIZARD_DIE_FRAME_IDS.map((frameId) => ({ key: `wizard-die-${frameId}` })),
            frameRate: 10,
            repeat: 0
        });

        this.anims.create({
            key: 'murkling-walk',
            frames: this.anims.generateFrameNumbers('murkling', {
                start: 0,
                end: MURKLING_WALK_FRAME_COUNT - 1
            }),
            frameRate: MURKLING_WALK_FPS,
            repeat: -1
        });

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Game');
    }
}
