import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    backgroundLayers: Phaser.GameObjects.Image[] = [];

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        const layerKeys = ['bg-layer-1', 'bg-layer-2', 'bg-layer-3', 'bg-layer-4'];

        layerKeys.forEach((key, index) =>
        {
            const layer = this.add.image(centerX, centerY, key);
            const scale = Math.max(width / layer.width, height / layer.height);

            layer.setScale(scale);
            layer.setDepth(index);
            layer.setScrollFactor(0);

            this.backgroundLayers.push(layer);
        });

        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
