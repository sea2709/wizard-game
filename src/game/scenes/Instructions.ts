import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { addMenuSceneBackground } from './menuSceneBackground';

const INSTRUCTION_PAGES = [
    [
        'The sky is gloomy — half swallowed by shadow!',
        'Top left: starlight count, Darkness bar, and your current season.',
        'Snatch starlights to push the bar down and chase the dark away.',
        'Clear Spring, Summer, Fall, and Winter — darkness resets to 50%',
        'each season but rises faster as the year turns. Beat all four to win.',
        'Let the bar hit 100%… and it\'s curtains.',
        '',
        'Wander        ← →',
        'Sprint        Shift + ← →',
        'Leap          ↑',
        'Attack        Space'
    ],
    [
        'Murklings lurk on the platforms — bump one and the sky',
        'gets moodier. Toast them with a fireball instead!',
        'From Summer onward, purple Strikers shoot shadow bolts —',
        'they grow bolder through Fall and Winter.'
    ]
];

export class Instructions extends Scene
{
    private pageIndex = 0;
    private hasAdvanced = false;

    private bodyText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;
    private nextButtonLabel!: Phaser.GameObjects.Text;

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

        this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x120820, 0.96)
            .setStrokeStyle(3, 0xfff8c0, 0.8);

        this.hintText = this.add.text(centerX, panelBottom - 28, '', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#fff8c0',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5, 1);

        const buttonY = this.hintText.y - this.hintText.height - 18 - 26;
        const button = this.createButton(centerX, buttonY, 'Next', () => this.advance());

        this.nextButtonLabel = button.label;

        const title = this.add.text(centerX, panelTop + 36, 'The Starwarden\'s Field Guide', {
            fontFamily: 'Arial Black',
            fontSize: 44,
            color: '#fff8c0',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5, 0);

        this.bodyText = this.add.text(centerX, title.y + title.height + 32, '', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: panelWidth - 96 }
        }).setOrigin(0.5, 0);

        this.input.keyboard!.on('keydown-ENTER', () => this.advance());
        this.input.keyboard!.on('keydown-SPACE', () => this.advance());

        this.showPage(0);

        EventBus.emit('current-scene-ready', this);
    }

    showPage (index: number)
    {
        this.pageIndex = index;
        this.hasAdvanced = false;

        this.bodyText.setText(INSTRUCTION_PAGES[index].join('\n'));

        const isLastPage = index === INSTRUCTION_PAGES.length - 1;
        this.nextButtonLabel.setText(isLastPage ? 'Off we go!' : 'Next');
        this.hintText.setText(
            isLastPage
                ? 'Enter or Space when you\'re ready'
                : `Page ${index + 1} of ${INSTRUCTION_PAGES.length} — Enter or Space to continue`
        );
    }

    advance ()
    {
        if (this.hasAdvanced || !this.scene.isActive('Instructions'))
        {
            return;
        }

        this.hasAdvanced = true;

        if (this.pageIndex < INSTRUCTION_PAGES.length - 1)
        {
            this.time.delayedCall(120, () => {
                this.hasAdvanced = false;
                this.showPage(this.pageIndex + 1);
            });
            return;
        }

        this.startGame();
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
        if (!this.scene.isActive('Instructions'))
        {
            return;
        }

        this.scene.start('Game', { isNewRun: true });
    }
}
