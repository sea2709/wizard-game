import { Scene } from 'phaser';

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

        for (let i = 0; i < 5; i++)
        {
            const frame = String(i).padStart(3, '0');
            this.load.image(`wizard-idle-${i}`, `wizard/1_IDLE_${frame}.png`);
            this.load.image(`wizard-walk-${i}`, `wizard/2_WALK_${frame}.png`);
            this.load.image(`wizard-jump-${i}`, `wizard/4_JUMP_${frame}.png`);
        }
    }

    create ()
    {
        this.anims.create({
            key: 'wizard-idle',
            frames: Array.from({ length: 5 }, (_, i) => ({ key: `wizard-idle-${i}` })),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'wizard-walk',
            frames: Array.from({ length: 5 }, (_, i) => ({ key: `wizard-walk-${i}` })),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'wizard-jump',
            frames: Array.from({ length: 5 }, (_, i) => ({ key: `wizard-jump-${i}` })),
            frameRate: 12,
            repeat: 0
        });

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Game');
    }
}
