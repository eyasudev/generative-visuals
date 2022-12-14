const RND = require('../util/random');
const clamp = require('clamp');
const newArray = require('new-array');
const anime = require('animejs');
const colliderCircle = require('../util/colliderCircle');
const touches = require('touches');
const defined = require('defined');
const Shape = require('../object/Shape');
const pickColors = require('../util/pickColors');
const noop = () => {};

const shapeTypes = [
  { weight: 100, value: 'circle-blob' },
  { weight: 100, value: 'rectangle-blob' },
  { weight: 30, value: 'triangle' },
  { weight: 5, value: 'circle' },
  { weight: 10, value: 'square' },
  { weight: 40, value: 'svg-heart' },
  { weight: 40, value: 'svg-feather' },
  { weight: 10, value: 'svg-lightning' }
];

// Other types:
// 'squiggle', 'ring',
// 'eye', 'feather', 'lightning', 'heart'

const makeMaterialTypesWeights = (mode) => {
  return [
    { weight: mode === 'ambient' ? 5 : 100, value: 'fill' },
    { weight: 50, value: 'texture-pattern' }
    // { weight: 50, value: 'shader-pattern' }
    // { weight: 25, value: 'fill-texture-pattern' }
  ];
};

const makeScale = ({ mode, materialType }) => {
  if (mode !== 'ambient') return RND.randomFloat(0.5, 4.0);

  // white fill in ambient mode only looks good for small shapes
  return materialType === 'fill' ? RND.randomFloat(0.5, 0.75) : RND.randomFloat(0.5, 4.0);
};

// const scales = [
//   { weight: 50, value: () => RND.randomFloat(2.5, 4) },
//   { weight: 100, value: () => RND.randomFloat(1.5, 2.5) },
//   { weight: 50, value: () => RND.randomFloat(0.75, 1.5) },
//   { weight: 25, value: () => RND.randomFloat(0.5, 0.75) }
// ]

// const effects = {
//   dropShadow: true, // only works with certain geom types?
//   sharpEdges: false // rounded edges or not for things like triangle/etc
// }

const getRandomMaterialProps = (preset) => {
  const { color, altColor } = pickColors(preset.colors);

  // Randomize the object and its materials
  const shapeType = RND.weighted(shapeTypes);
  const materialType = RND.weighted(makeMaterialTypesWeights(preset.mode));
  return { shapeType, materialType, altColor, color };
};

module.exports = class MainScene extends THREE.Object3D {
  constructor(app) {
    super();
    this.app = app;
    this.presetTweens = [];
    this.tweens = [];

    const maxCapacity = 100;

    this.poolContainer = new THREE.Group();
    this.add(this.poolContainer);
    this.pool = newArray(maxCapacity).map(() => {
      const mesh = new Shape(app);
      mesh.visible = false;
      this.poolContainer.add(mesh);
      return mesh;
    });

    this.textCollider = colliderCircle({ radius: 1.75 });
    if (this.textCollider.mesh) this.add(this.textCollider.mesh);
  }

  clear() {
    // reset pool to initial state
    this.pool.forEach(p => {
      p.visible = false;
      p.active = false;
      p.onFinishMovement = noop;
    });
    this.clearPresetTweens();
  }

  clearPresetTweens () {
    this.presetTweens.forEach(p => p.pause());
    this.presetTweens.length = 0;
  }

  start(opt = {}) {
    this.clearPresetTweens();

    const app = this.app;
    const pool = this.pool;

    const getRandomPosition = () => {
      const edges = [
        [new THREE.Vector2(-1, -1), new THREE.Vector2(1, -1)],
        [new THREE.Vector2(1, -1), new THREE.Vector2(1, 1)],
        [new THREE.Vector2(1, 1), new THREE.Vector2(-1, 1)],
        [new THREE.Vector2(-1, 1), new THREE.Vector2(-1, -1)]
      ];
      const edgeIndex = RND.randomInt(edges.length);
      const isTopOrBottom = edgeIndex === 0 || edgeIndex === 2;
      const edge = edges[edgeIndex];
      // const t = RND.randomFloat(0, 1)
      const t = isTopOrBottom
        ? RND.randomBoolean()
          ? RND.randomFloat(0.0, 0.35)
          : RND.randomFloat(0.65, 1)
        : RND.randomFloat(0, 1);
      const vec = edge[0].clone().lerp(edge[1], t);
      vec.x *= RND.randomFloat(1.0, 1.2);
      vec.y *= RND.randomFloat(1.0, 1.25);
      vec.multiply(app.unitScale);
      return vec;
    };

    const findAvailableObject = () => {
      const activeCount = pool.filter(p => p.active).length;
      if (activeCount >= this.app.preset.capacity) return;

      return RND.shuffle(pool).find(p => !p.active);
    };

    const next = (params = {}) => {
      // Get unused mesh
      const object = findAvailableObject();

      // No free meshes
      if (!object) return;
      const preset = app.preset;

      // Now in scene, no longer in pool
      object.active = true;
      // But initially hidden until we animate in
      object.visible = false;

      const materialProps = getRandomMaterialProps(preset);
      object.reset({ mode: preset.mode }); // reset time properties
      object.randomize(materialProps); // reset color/etc

      // randomize position and scale
      const scale = makeScale({ mode: preset.mode, materialType: materialProps.materialType });
      // const scale = RND.weighted(scales)()
      object.scale.setScalar(scale * (1 / 3) * app.targetScale);

      let p = getRandomPosition();
      if (preset.mode === 'intro') {
        // const scalar = RND.randomFloat(0.5, 1);
        // p.multiplyScalar(scalar);
      } else {
      }
      object.position.set(p.x, p.y, 0);

      const randomDirection = new THREE.Vector2().fromArray(RND.randomCircle([], 1));

      // const randomLength = RND.randomFloat(0.25, 5);
      // randomDirection.y /= app.unitScale.x;
      // other.addScaledVector(randomDirection, 1);
      // other.addScaledVector(randomDirection, randomLength);

      const heading = object.position
        .clone()
        .normalize()
        .negate();
      const rotStrength = RND.randomFloat(0, 1);
      heading.addScaledVector(randomDirection, rotStrength).normalize();

      // start at zero
      const animation = { value: 0 };
      object.setAnimation(animation.value);
      const updateAnimation = () => {
        object.setAnimation(animation.value);
      };

      let animationDuration;
      if (preset.mode === 'ambient') animationDuration = RND.randomFloat(16000, 32000);
      else if (preset.mode === 'intro') animationDuration = RND.randomFloat(4000, 8000);
      else animationDuration = RND.randomFloat(4000, 8000);

      const durationMod = app.targetScale;
      object.velocity.setScalar(0);
      object.velocity.addScaledVector(heading, 0.001 * durationMod);

      // const newAngle = object.rotation.z + RND.randomFloat(-1, 1) * Math.PI * 2 * 0.25
      let defaultDelay = RND.randomFloat(0, 8000);
      if (preset.mode === 'intro') {
        defaultDelay = RND.randomFloat(0, 500);
      }
      let startDelay = defined(params.startDelay, defaultDelay);
      const animIn = anime({
        targets: animation,
        value: 1,
        update: updateAnimation,
        easing: 'easeOutExpo',
        delay: startDelay,
        begin: () => {
          object.running = true;
          object.visible = true;
        },
        duration: animationDuration
      });

      this.tweens.push(animIn);
      object.onFinishMovement = () => {
        object.onFinishMovement = noop;
        animIn.pause();
        const animOut = anime({
          targets: animation,
          update: updateAnimation,
          value: 0,
          complete: () => {
            // Hide completely
            object.onFinishMovement = null;
            object.visible = false;
            object.running = false;
            // Place back in pool for re-use
            object.active = false;
            next();
          },
          easing: 'easeOutQuad',
          duration: animationDuration
        });
        this.tweens.push(animOut);
      };
    };

    this.next = next;
    this.emitInitial();
  }

  stop () {
    this.tweens.forEach(t => t.pause());
    this.tweens.length = 0;
    this.clear();
  }

  emitInitial () {
    // if (this.app.preset.mode === 'intro') {
    //   this.next();
    // } else {
    for (let i = 0; i < this.app.preset.initialCapacity; i++) {
      this.next();
    }
    // }
  }

  beat () {
    this.next();
  }

  trimCapacity () {
    const active = this.pool.filter(p => p.active);
    if (active.length <= this.app.preset.capacity) {
      // Less than initial, let's fill things up
      const remainder = Math.max(0, Math.min(this.app.preset.capacity, this.app.preset.initialCapacity - active.length));
      for (let i = 0; i < remainder; i++) {
        this.next();
      }
    } else {
      const toKill = RND.shuffle(active).slice(this.app.preset.capacity);
      toKill.forEach(k => k.onFinishMovement());
    }
  }

  onPresetChanged (preset, oldPreset) {
    // Preset has 'hard' changed, i.e. flash to new content
    this.pool.forEach(shape => {
      if (!shape.active) return;
      const newProps = getRandomMaterialProps(preset);
      shape.randomize(newProps);
    });
    this.stop(); // cancel all waiting tweens!
    this.emitInitial();
  }

  onPresetTransition (preset, oldPreset) {
    // kill old tweens
    this.clearPresetTweens();

    // Transition colors to new features
    this.pool.forEach(shape => {
      if (!shape.active) return;
      shape.resetSpeeds({ mode: preset.mode });
      const newProps = getRandomMaterialProps(preset);

      const oldColor = shape.mesh.material.uniforms.color.value.clone();
      const newColor = newProps.color.clone();
      const tween = { value: 0 };
      const t = anime({
        targets: tween,
        duration: 5000,
        value: 1,
        update: () => {
          const color = shape.mesh.material.uniforms.color.value;
          color.copy(oldColor).lerp(newColor, tween.value);
        }
      });
      this.presetTweens.push(t);
    });

    // Set new capacity without killing existing
    this.trimCapacity();
  }

  onTrigger(event, args) {
    const app = this.app;
    if (event === 'randomize') {
      // this.pool.forEach(p => {
      //   p.renderOrder = RND.randomInt(-10, 10);
      // });
      // console.log('sort');
      // this.poolContainer.children.sort((a, b) => {
      //   return a.renderOrder - b.renderOrder;
      // });
      // this.pool.forEach(shape => {
      //   if (!shape.active) return;
      //   const { color, shapeType, materialType, altColor } = getRandomMaterialProps({
      //     colors: app.colorPalette.colors,
      //     paletteName: app.colorPalette.name
      //   });
      //   shape.randomize({ color, shapeType, materialType, altColor });
      // })
    } else if (event === 'palette') {
      // force shapes to animate out, this will call next() again, and make them re-appear with proper colors
      this.pool.forEach(shape => {
        if (shape.active) {
          shape.onFinishMovement();
        }
      });
    } else if (event === 'clear') {
      this.clear();
    } else if (event === 'start') {
      this.start();
    } else if (event === 'switchMode') {
      
    } else if (event === 'colliderPosition') {
      this.textCollider.center.x = args.x;
      this.textCollider.center.y = args.y;
      if (args.radius) this.textCollider.radius = args.radius;
    } else if (event === 'beat' && this.app.preset.mode === 'intro') {
      this.beat();
    }
  }

  update(time, dt) {
    this.textCollider.update();

    const tmpVec2 = new THREE.Vector2();
    const tmpVec3 = new THREE.Vector3();

    this.pool.forEach(shape => {
      if (!shape.active || !shape.running) return;

      const a = shape.collisionArea.getWorldSphere(shape);
      const b = this.textCollider.getWorldSphere(this);

      const size = shape.scale.x / this.app.targetScale * 3;

      if (a.intersectsSphere(b)) {
        tmpVec3.copy(a.center).sub(b.center);
        const bounce = 0.000025 * (4 / size);
        shape.velocity.addScaledVector(tmpVec2.copy(tmpVec3), bounce);
      }
    });
  }
};

function circlesCollide(a, b) {
  const delta = a.center.distanceToSquared(b.center);
  const r = a.radius + b.radius;
  return delta <= r * r;
}
