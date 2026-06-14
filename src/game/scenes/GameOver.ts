import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export type GameOverOutcome = 'darkness' | 'victory';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameOverText : Phaser.GameObjects.Text;
    outcome: GameOverOutcome = 'darkness';

    constructor ()
    {
        super('GameOver');
    }

    init (data: { outcome?: GameOverOutcome })
    {
        this.outcome = data?.outcome ?? 'darkness';
    }

    create ()
    {
        const isVictory = this.outcome === 'victory';

        this.camera = this.cameras.main
        this.camera.setBackgroundColor(isVictory ? 0x1a4d8c : 0xff0000);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.5);

        this.gameOverText = this.add.text(
            512,
            384,
            isVictory ? 'The sky stays bright!' : 'The sky went dark...',
            {
                fontFamily: 'Arial Black', fontSize: 48, color: '#ffffff',
                stroke: '#000000', strokeThickness: 8,
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(100);
        
        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}
