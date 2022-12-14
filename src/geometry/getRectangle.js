const convexHull = require('convex-hull');
const RND = require('../util/random');
const newArray = require('new-array');

module.exports = function getCircularBlob (opt = {}) {
  const size = 1;
  const min = new THREE.Vector2(-1, -1).multiplyScalar(size);
  const max = new THREE.Vector2(1, 1).multiplyScalar(size);
  let path = [
    min,
    new THREE.Vector2(max.x, min.y),
    max,
    new THREE.Vector2(min.x, max.y)
  ];

  const rotation = RND.randomFloat(-1, 1) * Math.PI * 2;
  let width, height;

  const minDim = 0.25;
  const maxDim = 1.0;
  const dimScale = RND.randomFloat(0.25, 1.5);
  width = RND.randomFloat(minDim, maxDim);
  height = RND.randomFloat(minDim, maxDim);

  const typeList = [ 0, 1, 2 ];
  const type = typeList[RND.randomInt(typeList.length)];
  if (type === 0) {
    width *= dimScale;
  } else if (type === 1) {
    height *= dimScale;
  } else {
    width = height;
  }

  const center = new THREE.Vector2(0, 0);
  path.forEach(p => {
    p.x *= width;
    p.y *= height;
    const rotationOffset = RND.randomFloat(1) > 0.5 ? 0 : RND.randomFloat(0.0, 0.25);
    p.rotateAround(center, rotation + RND.randomFloat(-1, 1) * rotationOffset);
  });
  return path;
};
