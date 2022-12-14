const load = require('load-asset');
const createAudio = require('./createAudio');

module.exports = function (opt = {}) {
  const renderer = opt.renderer;

  const baseSettings = {};

  const textureResolution = 512; // 512 or 1024
  const tileFiles = ['bigdot', /*'contours',*/ 'funkygerms', 'leppard', 'littlesticks', 'smalldot', 'worms'].map(f => {
    return {
      url: `assets/image/tile/${f}_${textureResolution}_.png`,
      type: loadTextureType,
      settings: {
        minFilter: THREE.LinearFilter,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        generateMipmaps: false
      }
    };
  });

  const maskFiles = ['e'].map(f => {
    return {
      url: `assets/image/mask/${f}.png`,
      type: loadTextureType,
      settings: {
        minFilter: THREE.LinearFilter,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        generateMipmaps: false
      }
    };
  });

  return load.any(
    {
      audio: createAudio(),
      masks: load.any(maskFiles, err),
      tiles: load.any(tileFiles, err)
      // Can add other named assets here
      // e.g.
      // image: 'foo.png',
      // texture: { url: 'blah.png', type: loadTextureType }
    },
    ev => {
      console.log(`[canvas] Loading Progress: ${ev.progress}`);
    }
  );

  function err (ev) {
    if (ev.error) {
    }
  }

  function loadTextureType (ev) {
    return load({ ...ev, type: 'image' }).then(image => {
      const texture = new THREE.Texture(image);
      Object.assign(texture, ev.settings || {});
      texture.needsUpdate = true;
      if (renderer) renderer.setTexture2D(texture, 0);
      return texture;
    });
  }
};
