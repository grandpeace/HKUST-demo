import * as THREE from "three";

class Octree {
  constructor(box3, n, depth) {
    this.box = box3;
    this.capacity = n;
    this.divided = false;
    this.points = [];
    this.children = [];
    this.depth = depth;
  }

  subdivide() {
    const { box, capacity, depth } = this;
    let size = new THREE.Vector3().subVectors(box.max, box.min).divideScalar(2);
    let arr = [
      [0, 0, 0],
      [size.x, 0, 0],
      [0, 0, size.z],
      [size.x, 0, size.z],
      [0, size.y, 0],
      [size.x, size.y, 0],
      [0, size.y, size.z],
      [size.x, size.y, size.z],
    ];
    for (let i = 0; i < 8; i++) {
      let min = new THREE.Vector3(
        box.min.x + arr[i][0],
        box.min.y + arr[i][1],
        box.min.z + arr[i][2]
      );
      let max = new THREE.Vector3().addVectors(min, size);
      let newbox = new THREE.Box3(min, max);
      this.children.push(new Octree(newbox, capacity, depth + 1));
    }
    this.divided = true;
  }

  insert(point) {
    const { box, points, capacity, divided, children } = this;
    if (!box.containsPoint(point)) return false;

    if (points.length < capacity) {
      points.push(point);
      return true;
    } else {
      if (!divided) this.subdivide();
      for (let i = 0; i < children.length; i++) {
        if (children[i].insert(point)) return true;
      }
    }
  }

  queryByBox(boxRange, found = []) {
    if (!this.box.intersectsBox(boxRange)) {
      return found;
    } else {
      for (let p of this.points) {
        if (boxRange.containsPoint(p)) {
          found.push(p);
        }
      }
      if (this.divided) {
        this.children.forEach((child) => {
          child.queryByBox(boxRange, found);
        });
      }
      return found;
    }
  }

  queryBySphere(
    sphereRange,
    boundingBox = sphereRange.getBoundingBox(new THREE.Box3()),
    found = []
  ) {
    if (!this.box.intersectsBox(boundingBox)) {
      return found;
    } else {
      for (let p of this.points) {
        if (sphereRange.containsPoint(p)) {
          found.push(p);
        }
      }
      if (this.divided) {
        this.children.forEach((child) => {
          child.queryBySphere(sphereRange, boundingBox, found);
        });
      }
      return found;
    }
  }

  display(scene) {
    // 叶子结点
    if (!this.divided && this.points.length > 0) {
      scene.add(new THREE.Box3Helper(this.box, 0x00ff00));
      return;
    }
    this.children.forEach((child) => {
      child.display(scene);
    });
  }

  // 返回用 vector 存储的点数组
  buildFromPointCloud(points) {
    let pointsArr;
    if (points.isPoints) pointsArr = points.geometry.attributes.position.array;
    else pointsArr = points;

    let l = pointsArr.length;
    const vectors = [];
    for (let i = 0; i < l; i += 3) {
      let p = new THREE.Vector3().fromArray(pointsArr, i);
      p.index = i / 3; // 自定义index，方便根据点获取索引
      p.visited = false;
      this.insert(p);
      vectors.push(p);
    }
    return vectors;
  }
}

export { Octree };
