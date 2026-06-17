import { Scene } from 'phaser';

export function addMenuSceneBackground (scene: Scene): void
{
    const { width, height } = scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    scene.cameras.main.setBackgroundColor(0x120820);

    if (scene.textures.exists('bg-layer-1'))
    {
        const bg = scene.add.tileSprite(centerX, centerY, width, height, 'bg-layer-1')
            .setScrollFactor(0)
            .setAlpha(0.35);
        bg.setTileScale(Math.max(width / bg.width, height / bg.height));
    }

    scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.55);
}
