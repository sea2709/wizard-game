import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { WIZARD_DISPLAY_HEIGHT, WIZARD_DISPLAY_WIDTH } from '../wizardCombatConfig';

const STORY_WIZARD_SCALE = 1.5;

const STORY_PAGES = [
    [
        'Long ago, the sky burned bright with starlight.',
        'But a creeping shadow — the Murk — has risen from the depths,',
        'swallowing the heavens bit by bit.',
        '',
        'Half the world now lies in gloom. Without the stars,',
        'the land withers, and dark things stir in the twilight.',
        '',
        'You are the last Starwarden — a wizard who carries',
        'embers of the old light in your staff.'
    ],
    [
        'Scattered across the realm, tiny starlights still flicker.',
        'Gather them, and the sky will remember how to shine.',
        '',
        'But beware the Murklings — creatures born of shadow.',
        'They feed on despair and claw the darkness ever higher.',
        '',
        'The fate of the world rests on your journey.',
        'Push back the Murk. Restore the dawn.'
    ]
];

export class Story extends Scene
{
    private pageIndex = 0;
    private hasAdvanced = false;

    private bodyText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;
    private nextButtonBackground!: Phaser.GameObjects.Rectangle;
    private nextButtonLabel!: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Story');
    }

    create ()
    {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        this.cameras.main.setBackgroundColor(0x120820);

        if (this.textures.exists('bg-layer-1'))
        {
            const bg = this.add.tileSprite(centerX, centerY, width, height, 'bg-layer-1')
                .setScrollFactor(0)
                .setAlpha(0.35);
            bg.setTileScale(Math.max(width / bg.width, height / bg.height));
        }

        this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.55);

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

        this.nextButtonBackground = button.background;
        this.nextButtonLabel = button.label;

        const title = this.add.text(centerX, panelTop + 36, 'The Starwarden\'s Tale', {
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

        this.add.sprite(centerX, buttonY - 56, 'wizard')
            .setOrigin(0.5, 1)
            .setDisplaySize(
                WIZARD_DISPLAY_WIDTH * STORY_WIZARD_SCALE,
                WIZARD_DISPLAY_HEIGHT * STORY_WIZARD_SCALE
            )
            .play('wizard-idle');

        this.input.keyboard!.on('keydown-ENTER', () => this.advance());
        this.input.keyboard!.on('keydown-SPACE', () => this.advance());

        this.showPage(0);

        EventBus.emit('current-scene-ready', this);
    }

    showPage (index: number)
    {
        this.pageIndex = index;
        this.hasAdvanced = false;

        this.bodyText.setText(STORY_PAGES[index].join('\n'));

        const isLastPage = index === STORY_PAGES.length - 1;
        this.nextButtonLabel.setText(isLastPage ? 'Continue' : 'Next');
        this.hintText.setText(
            isLastPage
                ? 'Enter or Space when you\'re ready'
                : `Page ${index + 1} of ${STORY_PAGES.length} — Enter or Space to continue`
        );
    }

    advance ()
    {
        if (this.hasAdvanced || !this.scene.isActive('Story'))
        {
            return;
        }

        this.hasAdvanced = true;

        if (this.pageIndex < STORY_PAGES.length - 1)
        {
            this.time.delayedCall(120, () => {
                this.hasAdvanced = false;
                this.showPage(this.pageIndex + 1);
            });
            return;
        }

        this.scene.start('Instructions');
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
}
