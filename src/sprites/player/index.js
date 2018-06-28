import Phaser from 'phaser';

import flaresJSON from '../../assets/particles/flares.json';
import flaresPNG from '../../assets/particles/flares.png';
import Behaviors from './behaviors';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor({ scene, x, y }) {
    super(scene, x, y, 'player');
    this.direction = 'left';
    this.movementState = 'idle';
    this.scene = scene;
  }

  velocities = {
    walking: 110,
    turning: 30,
    flying: 160,
    highjump: 600,
    jump: 250,
    landing: 40,
    aerialBoosting: 110,
    slideBursting: 500,
    sliding: 160,
    launchHalt: 30,
    launchPowerX: 500,
    launchPowerY: 450
  };

  timings = {
    launchTime: 1000,
    slideDuration: 350
  };

  energyLevel = 1000;
  missileCount = 9;

  preload() {
    Behaviors.preload(this.scene);
    //TODO: replace with better thruster image
    this.scene.load.atlas('flares', flaresPNG, flaresJSON);
    this.buildInputs();
  }

  create() {
    const { scene } = this;
    scene.physics.world.enable(this);

    this.body.setSize(75, 90);
    this.setOrigin(0.5, 0.63);

    this.body.setGravityY(325);

    const thrustParticles = scene.add.particles('flares');
    this.thruster = thrustParticles.createEmitter({
      frame: 'blue',
      lifespan: { min: 250, max: 400 },
      speed: { min: 1, max: 150 },
      scale: { start: 0.25, end: 0 },
      quantity: 1,
      blendMode: 'ADD',
      on: false
    });

    this.behaviors = new Behaviors({
      scene: scene,
      entity: this
    });

    this.thruster.startFollow(this.body);
    scene.add.existing(this);
    this.behaviors.on('booster', data => {
      if (data.angle) {
        this.thruster.setAngle(data.angle);
      }

      if (data.on !== undefined) {
        this.thruster.on = data.on;
      }

      if (data.x && data.y) {
        this.thruster.setPosition(data.x, data.y);
      }
    });

    window.thruster = this.thruster;
    window.behaviors = this.behaviors;
    window.entity = this;
    window.scene = this.scene;
  }

  hasNoInput() {
    const { primaryFire, secondaryFire, missiles, laser } = this.ordinance;

    const { dirUp, dirDown, dirLeft, dirRight, jump, boost } = this.locomotion;
    const { special1, special2 } = this.specialControls;

    return (
      !dirUp.isDown &&
      !dirDown.isDown &&
      !dirLeft.isDown &&
      !dirRight.isDown &&
      !primaryFire.isDown &&
      !secondaryFire.isDown &&
      !missiles.isDown &&
      !laser.isDown &&
      !jump.isDown &&
      !boost.isDown &&
      !special1.isDown &&
      !special2.isDown
    );
  }

  update() {
    const { scene, behaviors, velocities } = this;

    const { primaryFire, secondaryFire, missiles, laser } = this.ordinance;

    const { dirUp, dirDown, dirLeft, dirRight, jump, boost } = this.locomotion;
    const { special1, special2 } = this.specialControls;

    const onFloor = this.body.onFloor();

    if (onFloor) {
      if (dirLeft.isDown) {
        behaviors.handle('walk', {
          direction: 'left',
          onFloor,
          velocities: velocities
        });
      } else if (dirRight.isDown) {
        behaviors.handle('walk', {
          direction: 'right',
          onFloor,
          velocities: velocities
        });
      }

      if (dirUp.isDown && dirLeft.isDown) {
        behaviors.handle('aim', { aim: 'upfwd', direction: 'left' });
      } else if (dirUp.isDown && dirRight.isDown) {
        behaviors.handle('aim', { aim: 'upfwd', direction: 'right' });
      } else if (dirDown.isDown && dirLeft.isDown) {
        behaviors.handle('aim', { aim: 'dwnfwd', direction: 'left' });
      } else if (dirDown.isDown && dirRight.isDown) {
        behaviors.handle('aim', { aim: 'dwnfwd', direction: 'right' });
      } else if (dirUp.isDown) {
        behaviors.handle('aim', { aim: 'up' });
      } else if (dirDown.isDown) {
        behaviors.handle('aim', { aim: 'dwn' });
      } else {
        behaviors.handle('aim', { aim: 'fwd' });
      }

      if (missiles.isDown) {
        if (this.missileCount > 0) {
          behaviors.handle('shootMissiles', { onFloor, velocities });
        }
      }

      if (dirDown.isDown) {
        behaviors.handle('crouch', { onFloor, velocities });
      } else if (!dirDown.isDown) {
        behaviors.handle('uncrouch', { onFloor, velocities });
      }

      if (jump.isDown) {
        behaviors.handle('jump', { onFloor, velocities });
      }

      if (boost.isDown) {
        behaviors.handle('boost', { onFloor, velocities });
      } else if (!boost.isDown) {
        behaviors.handle('unboost', { onFloor, velocities });
      }

      if (this.hasNoInput()) {
        behaviors.handle('idle', { onFloor, velocities });
      }

      behaviors.handle('land', { onFloor, velocities });
    }

    if (!onFloor) {
      if (dirLeft.isDown) {
        behaviors.handle('veer', {
          direction: 'left',
          onFloor,
          velocities: velocities
        });
      } else if (dirRight.isDown) {
        behaviors.handle('veer', {
          direction: 'right',
          onFloor,
          velocities: velocities
        });
      }

      if (boost.isDown) {
        behaviors.handle('boost', { onFloor, velocities });
      } else if (!boost.isDown) {
        behaviors.handle('unboost', { onFloor, velocities });
      }

      behaviors.handle('unland', { onFloor, velocities });
    }

    if (primaryFire.isDown) {
      behaviors.handle('shoot', { gun: 'vulcan' });
    }
  }

  buildInputs() {
    const cursors = this.scene.input.keyboard.createCursorKeys();
    const WASDQECtrl = this.scene.input.keyboard.addKeys('W,A,S,D,Q,E, CTRL');

    const { down, left, right, up, shift, space } = cursors;
    const { W, A, S, D, Q, E } = WASDQECtrl;

    const missiles = up;
    const primaryFire = left;
    const laser = down;
    const secondaryFire = right;

    const dirUp = W;
    const dirDown = S;
    const dirLeft = A;
    const dirRight = D;
    const jump = space;
    const boost = shift;

    const special1 = Q;
    const special2 = E;

    this.ordinance = {
      primaryFire,
      secondaryFire,
      missiles,
      laser
    };

    this.locomotion = {
      dirUp,
      dirDown,
      dirLeft,
      dirRight,
      jump,
      boost
    };

    this.specialControls = { special1, special2 };
  }
}
