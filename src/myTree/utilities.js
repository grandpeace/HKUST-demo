import * as THREE from "three";

const randomRangeLinear = (min, max) => {
  return Math.random() * (max - min) + min;
};

const disturbedCurveNode = (start, end, disturb, gravity) => {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const d = start.distanceTo(end);
  const l = d * disturb;
  // 不受重力影响
  if (gravity === 0) {
    mid.add(
      new THREE.Vector3(
        Math.random() * 2 * l - l,
        Math.random() * 2 * l - l,
        Math.random() * 2 * l - l
      )
    );
  }
  // 受重力影响，g与枝条长度成正比
  else {
    mid.add(
      new THREE.Vector3(
        Math.random() * 2 * l - l,
        Math.random() * l * gravity,
        Math.random() * 2 * l - l
      )
    );
  }
  return [start, mid, end];
};

const makeVector3 = (vector) => {
  return new THREE.Vector3(vector.x, vector.y, vector.z);
};

const makeVectors = (positions) => {
  // positions 是长度一定能被3整除的数组
  const vectors = [];
  let l = positions.length;
  for (let i = 0; i < l; i += 3) {
    vectors.push(new THREE.Vector3().fromArray(positions, i));
  }
  return vectors;
};

const drawLine = (skeleton, fatherLine) => {
  const vectors = makeVectors(skeleton.positions);
  const curve = new THREE.CatmullRomCurve3(vectors);
  const points = curve.getPoints(10);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: "red",
    linewidth: 100,
  });
  const curveObject = new THREE.Line(geometry, material);
  curveObject.start = vectors[0];
  fatherLine.add(curveObject);
  skeleton.children.forEach((child) => {
    drawLine(child, curveObject);
  });
};

const lookAt = (obj, camera, controls) => {
  const frameArea = (sizeToFitOnScreen, boxSize, boxCenter, camera) => {
    const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
    const halfFovY = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);
    const direction = new THREE.Vector3()
      .subVectors(camera.position, boxCenter)
      .multiply(new THREE.Vector3(1, 0, 1))
      .normalize();
    // move the camera
    camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));
    // pick some near and far values for the frustum that will contain the box.
    camera.near = boxSize / 100;
    camera.far = boxSize * 100;
    camera.updateProjectionMatrix();
    // point the camera to look at the center of the box
    camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
  };

  // compute the box that contains all the stuff from root and below
  const box = new THREE.Box3().setFromObject(obj);
  const boxSize = box.getSize(new THREE.Vector3()).length();
  const boxCenter = box.getCenter(new THREE.Vector3());
  // set the camera to frame the box
  frameArea(boxSize * 0.5, boxSize, boxCenter, camera);
  // update the Trackball controls to handle the new size
  controls.maxDistance = boxSize * 10;
  controls.target.copy(boxCenter);
  controls.update();
};

export {
  randomRangeLinear,
  disturbedCurveNode,
  makeVector3,
  makeVectors,
  drawLine,
  lookAt,
};
