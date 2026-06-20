import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { addMenuSceneBackground } from './menuSceneBackground';

const INSTRUCTION_LINES = [
    'The sky is gloomy — half swallowed by shadow!',
    'Top left: starlight count, Darkness bar, and your current phase.',
    'Snatch starlights to push the bar down and chase the dark away.',
    'Clear Phase 1, then Phase 2 — darkness resets to 50% but rises faster.',
    'Beat both phases to win. Let the bar hit 100%… and it\'s curtains.',
    '',
    'Wander        ← →',
    'Sprint        Shift + ← →',
    'Leap          ↑',
    'Attack        Space',
    '',
    'Murklings lurk on the platforms — bump one and the sky',
    'gets moodier. Toast them with a fireball instead!',
    'In Phase 2, purple Strikers hang back and shoot shadow bolts.'
];

export class Instructions extends Scene
{
    private hasStarted = false;

    constructor ()
    {
        super('Instructions');
    }

    create ()
    {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        addMenuSceneBackground(this);

        const panelWidth = 960;
        const panelHeight = 720;
        const panelTop = centerY - panelHeight / 2;
        const panelBottom = centerY + panelHeight / 2;

        const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x120820, 0.96)
            .setStrokeStyle(3, 0xfff8c0, 0.8);

        const hint = this.add.text(centerX, panelBottom - 28, 'Enter or Space when you\'re ready', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#fff8c0',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5, 1);

        const buttonY = hint.y - hint.height - 18 - 26;
        const startButton = this.createButton(centerX, buttonY, 'Off we go!', () => this.startGame());

        const title = this.add.text(centerX, panelTop + 36, 'The Starwarden\'s Field Guide', {
            fontFamily: 'Arial Black',
            fontSize: 44,
            color: '#fff8c0',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5, 0);

        const body = this.add.text(centerX, title.y + title.height + 32, INSTRUCTION_LINES.join('\n'), {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: panelWidth - 96 }
        }).setOrigin(0.5, 0);

        this.input.keyboard!.once('keydown-ENTER', () => this.startGame());
        this.input.keyboard!.once('keydown-SPACE', () => this.startGame());

        EventBus.emit('current-scene-ready', this);
    }

    createButton (x: number, y: number, label: string, onSelect: () => void)
    {
        const background = this.add.rectangle(x, y, 320, 52, 0x5030a0, 1)
            .setStrokeStyle(2, 0xfff8c0, 0.9)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(x, y, label, {
            fontFamily: 'Arial Black',
            fontSize: 26,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

        background.on('pointerover', () => background.setFillStyle(0x6840c0));
        background.on('pointerout', () => background.setFillStyle(0x5030a0));
        background.on('pointerdown', onSelect);

        return { background, label: text };
    }

    startGame ()
    {
        if (this.hasStarted || !this.scene.isActive('Instructions'))
        {
            return;
        }

        this.hasStarted = true;
        this.scene.start('Game');
    }
}
