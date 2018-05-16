const rightNow = require('right-now');
const defined = require('defined');
const loadAssets = require('./util/loadAssets');
const TestScene = require('./scene/TestScene');

const canvas = document.querySelector('#canvas');

function startApplication () {
  const targetAspect = 7680 / 1080;
  const useTargetAspect = true;

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setClearColor('#FBF9F3', 1);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
  const scene = new THREE.Scene();

  const app = {
    camera,
    scene,
    unitScale: new THREE.Vector2(1, 1)
    // will contain some other properties for scenes to use, like width/height
  };

  const tickFPS = 24;

  let tickFrame = 0;
  let lastTickTime = 0;
  let elapsedTime = 0;
  let previousTime = rightNow();

  const recordSettings = {
    output: 'tmp',
    fps: 24,
    duration: 1,
    enabled: false
  };

  resize();
  window.addEventListener('resize', () => resize());

  canvas.style.display = 'none';
  loadAssets({ renderer }).then(assets => {
    canvas.style.display = '';
    app.assets = assets;
    console.log('Loaded assets', app.assets);
    createScene(scene);
    if (recordSettings.enabled) record();
    else startLoop();
  });

  function resize (width, height, pixelRatio) {
    width = defined(width, window.innerWidth);
    if (useTargetAspect) {
      height = Math.floor(width / targetAspect);
    } else {
      height = defined(height, window.innerHeight);
    }
    pixelRatio = defined(pixelRatio, window.devicePixelRatio);

    if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);

    const aspect = width / height;
    // camera.scale.x = 1;
    // camera.scale.y = 1 / aspect;

    // camera.left = 0;
    // camera.top = 0;
    // camera.right = width;
    // camera.bottom = height;
    camera.scale.x = aspect;
    camera.scale.y = 1;
    app.unitScale.x = aspect;

    // if (width > height) {
    //   camera.scale.x = aspect;
    //   camera.scale.y = 1;
    // } else {
    //   camera.scale.x = aspect;
    //   camera.scale.y = 1;
    // }
    camera.updateProjectionMatrix();
    app.width = width;
    app.height = height;
    app.pixelRatio = pixelRatio;
    app.aspect = aspect;
  }

  function startLoop () {
    renderer.animate(animate);
  }

  function record () {
    if (!window.TEXEL) {
      throw new Error('Exporting is not yet supported by budo...');
    }
    const fps = recordSettings.fps;
    const frameInterval = 1 / fps;
    const duration = recordSettings.duration;
    let deltaTime = 0;
    let frame = 0;
    let totalFrames = Math.floor(fps * duration);
    const tick = () => {
      resize(recordSettings.width, recordSettings.height, 1);
      render(elapsedTime, deltaTime);

      const dataURL = window.TEXEL.getCanvasDataURL(canvas, recordSettings);
      resize();
      render(elapsedTime, 0);
      return window.TEXEL.saveDataURL(dataURL, Object.assign({}, recordSettings, {
        frame,
        totalFrames: Math.max(1000, totalFrames)
      })).then(() => {
        console.log(`Saved Frame ${frame}`);
        frame++;
        if (frame < totalFrames) {
          elapsedTime += frameInterval;
          deltaTime = frameInterval;
          window.requestAnimationFrame(tick);
        } else {
          console.log('Finished recording');
          elapsedTime = 0;
          startLoop();
        }
      });
    };
    window.requestAnimationFrame(tick);
  }

  function animate () {
    const now = rightNow();
    const deltaTime = (now - previousTime) / 1000;
    elapsedTime += deltaTime;
    previousTime = now;

    render(elapsedTime, deltaTime);
  }

  function render (time, deltaTime) {
    const frameInterval = 1 / tickFPS;
    const deltaSinceTick = time - lastTickTime;
    if (deltaSinceTick > frameInterval) {
      lastTickTime = time - (deltaSinceTick % frameInterval);
      traverse('frame', tickFrame++, time);
    }

    traverse('update', time, deltaTime);
    renderer.render(scene, camera);
  }

  function traverse (fn, ...args) {
    scene.traverse(t => {
      if (typeof t[fn] === 'function') {
        t[fn](...args);
      }
    });
  }

  function createScene (scene) {
    scene.add(new TestScene(app));
  }
}

startApplication();
