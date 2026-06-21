import { playMenuKeySound } from '../audio/gameAudio';
import { EventBus } from '../EventBus';
import { Math as PhaserMath, Scene } from 'phaser';
import { MURKLING_DISPLAY_SIZE } from '../config/baddiesConfig';
import { STARLIGHT_DISPLAY_SIZE } from '../config/starlightConfig';
import {
    FIREBALL_DISPLAY_SIZE,
    FIREBALL_SPAWN_OFFSET_X,
    FIREBALL_SPAWN_OFFSET_Y,
    FIREBALL_SPEED,
    WIZARD_ATTACK_FIREBALL_DELAY_MS,
    WIZARD_DISPLAY_HEIGHT,
    WIZARD_DISPLAY_WIDTH
} from '../config/wizardCombatConfig';
import {
    playStarlightCollectAnimation,
    setupStarlightIdleAnimations
} from '../starlightAnimations';
import { addMenuSceneBackground } from './menuSceneBackground';

const STORY_WIZARD_SCALE = 1.5;
const STORY_MURKLING_SCALE = 1.5;
const STORY_STARLIGHT_SCALE = 2;

const STORY_COLLECT_INTRO_DELAY_MS = 350;
const STORY_COLLECT_RUN_SPEED = 260;
const STORY_COLLECT_LOOP_DELAY_MS = 800;
/** Horizontal offset from panel center for wizard start / starlight end (px). */
const STORY_COLLECT_RUN_HALF_WIDTH = 170;
const STORY_COMBAT_INTRO_DELAY_MS = 1400;
const STORY_COMBAT_BETWEEN_ATTACKS_MS = 500;
const STORY_COMBAT_LOOP_DELAY_MS = 1600;

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
    private wizard!: Phaser.GameObjects.Sprite;
    private starlight!: Phaser.GameObjects.Sprite;
    private murklingLeft!: Phaser.GameObjects.Sprite;
    private murklingRight!: Phaser.GameObjects.Sprite;

    private characterY = 0;
    private centerX = 0;
    private murklingSize = 0;
    private collectDemoActive = false;
    private combatDemoActive = false;
    private activeFireball?: Phaser.GameObjects.Sprite;
    private collectStepTimer?: Phaser.Time.TimerEvent;
    private combatStepTimer?: Phaser.Time.TimerEvent;
    private wizardRunTween?: Phaser.Tweens.Tween;
    private attackFireballTimer?: Phaser.Time.TimerEvent;
    private attackCompleteTimer?: Phaser.Time.TimerEvent;

    constructor ()
    {
        super('Story');
    }

    create ()
    {
        const { width, height } = this.scale;
        const centerX = width / 2;
        this.centerX = centerX;
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

        this.characterY = buttonY - 56;
        const wizardWidth = WIZARD_DISPLAY_WIDTH * STORY_WIZARD_SCALE;
        const wizardHeight = WIZARD_DISPLAY_HEIGHT * STORY_WIZARD_SCALE;
        this.murklingSize = MURKLING_DISPLAY_SIZE * STORY_MURKLING_SCALE;
        const murklingOffset = wizardWidth / 2 + this.murklingSize / 2 + 28;

        this.wizard = this.add.sprite(centerX, this.characterY, 'wizard')
            .setOrigin(0.5, 1)
            .setDisplaySize(wizardWidth, wizardHeight)
            .setDepth(2)
            .play('wizard-idle');

        this.murklingLeft = this.add.sprite(centerX - murklingOffset, this.characterY, 'murkling')
            .setOrigin(0.5, 1)
            .setDisplaySize(this.murklingSize, this.murklingSize)
            .setDepth(1)
            .play('murkling-walk')
            .setVisible(false);

        this.murklingRight = this.add.sprite(centerX + murklingOffset, this.characterY, 'murkling')
            .setOrigin(0.5, 1)
            .setDisplaySize(this.murklingSize, this.murklingSize)
            .setFlipX(true)
            .setDepth(1)
            .play('murkling-walk')
            .setVisible(false);

        const starlightSize = STARLIGHT_DISPLAY_SIZE * STORY_STARLIGHT_SCALE;
        this.starlight = this.add.sprite(centerX, this.characterY, 'starlight')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(starlightSize, starlightSize)
            .setDepth(3)
            .setVisible(false);

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

        if (index === 0)
        {
            this.stopCombatDemo();
            this.startCollectDemo();
        }
        else if (index === STORY_PAGES.length - 1)
        {
            this.stopCollectDemo();
            this.wizard.setPosition(this.centerX, this.characterY);
            this.resetMurklings();
            this.startCombatDemo();
        }
        else
        {
            this.stopCollectDemo();
            this.stopCombatDemo();
        }

        const isLastPage = index === STORY_PAGES.length - 1;
        this.nextButtonLabel.setText(isLastPage ? 'Continue' : 'Next');
        this.hintText.setText(
            isLastPage
                ? 'Enter or Space when you\'re ready'
                : `Page ${index + 1} of ${STORY_PAGES.length} — Enter or Space to continue`
        );
    }

    startCollectDemo ()
    {
        this.stopCollectDemo();
        this.collectDemoActive = true;
        this.resetCollectDemo();
        this.scheduleCollectStep(STORY_COLLECT_INTRO_DELAY_MS, () => this.runWizardToStarlight(() =>
        {
            this.finishStarlightCollect();
        }));
    }

    stopCollectDemo ()
    {
        this.collectDemoActive = false;
        this.collectStepTimer?.remove();
        this.collectStepTimer = undefined;
        this.stopWizardRunTween();
        this.tweens.killTweensOf(this.starlight);
        this.starlight.setVisible(false);
        this.wizard.setFlipX(false);
        this.wizard.anims.play('wizard-idle');
    }

    stopWizardRunTween ()
    {
        if (this.wizardRunTween)
        {
            this.wizardRunTween.stop();
            this.wizardRunTween = undefined;
        }
    }

    scheduleCollectStep (delayMs: number, callback: () => void)
    {
        this.collectStepTimer?.remove();
        this.collectStepTimer = this.time.delayedCall(delayMs, () =>
        {
            this.collectStepTimer = undefined;

            if (this.collectDemoActive)
            {
                callback();
            }
        });
    }

    runCollectCycle ()
    {
        if (!this.collectDemoActive)
        {
            return;
        }

        this.resetCollectDemo();
        this.runWizardToStarlight(() =>
        {
            this.finishStarlightCollect();
        });
    }

    finishStarlightCollect ()
    {
        if (!this.collectDemoActive)
        {
            return;
        }

        playStarlightCollectAnimation(this, this.starlight, () =>
        {
            if (!this.collectDemoActive)
            {
                return;
            }

            this.starlight.setVisible(false);
            this.scheduleCollectStep(STORY_COLLECT_LOOP_DELAY_MS, () => this.runCollectCycle());
        });
    }

    resetCollectDemo ()
    {
        const panelHalf = STORY_COLLECT_RUN_HALF_WIDTH;
        const wizardWidth = WIZARD_DISPLAY_WIDTH * STORY_WIZARD_SCALE;
        const wizardHeight = WIZARD_DISPLAY_HEIGHT * STORY_WIZARD_SCALE;
        const startX = this.centerX - panelHalf + wizardWidth / 2 + 24;
        const starlightX = this.centerX + panelHalf - 24;
        const starlightY = this.characterY - wizardHeight * 0.55;

        this.murklingLeft.setVisible(false);
        this.murklingRight.setVisible(false);
        this.wizard.setPosition(startX, this.characterY);
        this.wizard.setFlipX(false);
        this.wizard.anims.play('wizard-idle');

        this.tweens.killTweensOf(this.starlight);
        this.starlight
            .setPosition(starlightX, starlightY)
            .setAlpha(1)
            .setAngle(0)
            .setScale(1)
            .setVisible(true);
        setupStarlightIdleAnimations(this, this.starlight, 0, 0);
    }

    runWizardToStarlight (onComplete: () => void)
    {
        const wizardWidth = WIZARD_DISPLAY_WIDTH * STORY_WIZARD_SCALE;
        const stopX = this.starlight.x - wizardWidth / 2 - 20;

        this.wizard.anims.play('wizard-run');

        const distance = stopX - this.wizard.x;
        const durationMs = (distance / STORY_COLLECT_RUN_SPEED) * 1000;

        this.stopWizardRunTween();
        this.wizardRunTween = this.tweens.add({
            targets: this.wizard,
            x: stopX,
            duration: durationMs,
            ease: 'Linear',
            onComplete: () =>
            {
                this.wizardRunTween = undefined;
                this.wizard.anims.play('wizard-idle');
                onComplete();
            }
        });
    }

    startCombatDemo ()
    {
        this.stopCombatDemo();
        this.combatDemoActive = true;
        this.scheduleCombatStep(STORY_COMBAT_INTRO_DELAY_MS, () => this.runCombatCycle());
    }

    stopCombatDemo ()
    {
        this.combatDemoActive = false;
        this.combatStepTimer?.remove();
        this.combatStepTimer = undefined;
        this.clearWizardAttackTimers();
        this.murklingLeft.off('animationcomplete-murkling-die');
        this.murklingRight.off('animationcomplete-murkling-die');
        this.destroyActiveFireball();
        this.wizard.anims.play('wizard-idle');
        this.wizard.setFlipX(false);
    }

    scheduleCombatStep (delayMs: number, callback: () => void)
    {
        this.combatStepTimer?.remove();
        this.combatStepTimer = this.time.delayedCall(delayMs, () =>
        {
            this.combatStepTimer = undefined;

            if (this.combatDemoActive)
            {
                callback();
            }
        });
    }

    runCombatCycle ()
    {
        if (!this.combatDemoActive)
        {
            return;
        }

        this.resetMurklings();
        this.attackMurkling(this.murklingLeft, true, () =>
        {
            this.scheduleCombatStep(STORY_COMBAT_BETWEEN_ATTACKS_MS, () =>
            {
                this.attackMurkling(this.murklingRight, false, () =>
                {
                    this.scheduleCombatStep(STORY_COMBAT_LOOP_DELAY_MS, () => this.runCombatCycle());
                });
            });
        });
    }

    clearWizardAttackHandlers ()
    {
        this.attackCompleteTimer?.remove();
        this.attackCompleteTimer = undefined;
        this.wizard.off('animationcomplete-wizard-attack', this.returnWizardToIdleAfterAttack, this);
    }

    clearWizardAttackTimers ()
    {
        this.clearWizardAttackHandlers();
        this.attackFireballTimer?.remove();
        this.attackFireballTimer = undefined;
    }

    returnWizardToIdleAfterAttack ()
    {
        if (!this.combatDemoActive)
        {
            return;
        }

        this.clearWizardAttackHandlers();
        this.wizard.anims.play('wizard-idle');
    }

    attackMurkling (
        murkling: Phaser.GameObjects.Sprite,
        faceLeft: boolean,
        onComplete: () => void
    )
    {
        if (!this.combatDemoActive || !murkling.visible)
        {
            onComplete();
            return;
        }

        this.wizard.setFlipX(faceLeft);
        this.clearWizardAttackTimers();
        this.wizard.anims.play('wizard-attack');

        this.attackFireballTimer = this.time.delayedCall(WIZARD_ATTACK_FIREBALL_DELAY_MS, () =>
        {
            this.attackFireballTimer = undefined;

            if (!this.combatDemoActive)
            {
                return;
            }

            this.launchFireballAt(murkling, () =>
            {
                this.killStoryMurkling(murkling, onComplete);
            });
        });

        this.wizard.once('animationcomplete-wizard-attack', this.returnWizardToIdleAfterAttack, this);

        const attackAnim = this.anims.get('wizard-attack');

        if (attackAnim)
        {
            this.attackCompleteTimer = this.time.delayedCall(attackAnim.duration + 16, () =>
            {
                this.attackCompleteTimer = undefined;
                this.returnWizardToIdleAfterAttack();
            });
        }
    }

    launchFireballAt (target: Phaser.GameObjects.Sprite, onHit: () => void)
    {
        const direction = this.wizard.flipX ? -1 : 1;
        const spawnOffsetX = FIREBALL_SPAWN_OFFSET_X * STORY_WIZARD_SCALE;
        const spawnOffsetY = FIREBALL_SPAWN_OFFSET_Y * STORY_WIZARD_SCALE;
        const fireballSize = FIREBALL_DISPLAY_SIZE * STORY_WIZARD_SCALE;
        const startX = this.wizard.x + direction * spawnOffsetX;
        const startY = this.wizard.y + spawnOffsetY;
        const endX = target.x;
        const endY = target.y - this.murklingSize * 0.45;
        const distance = PhaserMath.Distance.Between(startX, startY, endX, endY);
        const durationMs = (distance / FIREBALL_SPEED) * 1000;

        this.destroyActiveFireball();

        const fireball = this.add.sprite(startX, startY, 'fireball')
            .setDisplaySize(fireballSize, fireballSize)
            .setDepth(3);

        this.activeFireball = fireball;

        this.tweens.add({
            targets: fireball,
            x: endX,
            y: endY,
            duration: durationMs,
            ease: 'Linear',
            onComplete: () =>
            {
                if (this.activeFireball === fireball)
                {
                    this.activeFireball = undefined;
                }

                fireball.destroy();

                if (this.combatDemoActive)
                {
                    onHit();
                }
            }
        });
    }

    killStoryMurkling (murkling: Phaser.GameObjects.Sprite, onComplete: () => void)
    {
        if (!murkling.visible)
        {
            onComplete();
            return;
        }

        let finished = false;

        const finish = () =>
        {
            if (finished)
            {
                return;
            }

            finished = true;
            murkling.off('animationcomplete-murkling-die', finish);
            murkling.setVisible(false);
            onComplete();
        };

        murkling.anims.play('murkling-die');
        murkling.once('animationcomplete-murkling-die', finish);

        const dieAnim = this.anims.get('murkling-die');

        if (dieAnim)
        {
            this.time.delayedCall(dieAnim.duration + 16, finish);
        }
    }

    resetMurklings ()
    {
        for (const murkling of [ this.murklingLeft, this.murklingRight ])
        {
            murkling.setVisible(true);
            murkling.anims.play('murkling-walk');
        }

        this.murklingLeft.setFlipX(false);
        this.murklingRight.setFlipX(true);
    }

    destroyActiveFireball ()
    {
        if (!this.activeFireball)
        {
            return;
        }

        this.tweens.killTweensOf(this.activeFireball);
        this.activeFireball.destroy();
        this.activeFireball = undefined;
    }

    advance ()
    {
        if (this.hasAdvanced || !this.scene.isActive('Story'))
        {
            return;
        }

        playMenuKeySound(this.game);
        this.hasAdvanced = true;

        if (this.pageIndex < STORY_PAGES.length - 1)
        {
            this.time.delayedCall(120, () => {
                this.hasAdvanced = false;
                this.showPage(this.pageIndex + 1);
            });
            return;
        }

        this.stopCollectDemo();
        this.stopCombatDemo();
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
