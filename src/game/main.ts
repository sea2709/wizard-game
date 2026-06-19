import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { Instructions } from './scenes/Instructions';
import { Story } from './scenes/Story';
import { AUTO, Game, Scale } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { DEBUG_PHYSICS } from './debug';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1280,
    height: 960,
    parent: 'game-container',
    backgroundColor: '#028af8',
    render: {
        antialias: true,
        pixelArt: false
    },
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 800 },
            debug: DEBUG_PHYSICS
        }
    },
    scene: [
        Boot,
        Preloader,
        Story,
        Instructions,
        MainGame
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
