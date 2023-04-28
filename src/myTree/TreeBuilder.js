import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  randomRangeLinear,
  disturbedCurveNode,
  makeVector3,
  makeVectors,
} from "./utilities";
import { Leaf } from "./leaf/Leaf";
import { TreeSkeleton } from "./TreeSkeleton";
import { BranchGeometry } from "./lib/BranchGeometry";
import { loadData, kMeans } from "./lib/Cluster";
/*************************************************************************************
 * CLASS NAME:  TreeBuilder
 * DESCRIPTION: A novel tree editor & generator on the webpage.
 * NOTE:        I'm a piece of shit not knowing to use THREE.TubeGeometry!
 *              (Anyway, at least I tried.😂)
 *
 *************************************************************************************/
class TreeBuilder {
  constructor(treeObj, mergeLeaves = true) {
    this.treeObj = treeObj;
    this.branchGeometries = [];
    this.cnt = 0; // 叶子计数器
    this.y_axis = new THREE.Vector3(0, 1, 0); // 世界坐标下的y轴
    this.mergeLeaves = mergeLeaves;
    if (mergeLeaves) this.matrices = [];
  }

  init(treeObj, mergeLeaves) {
    this.treeObj = treeObj;
    this.mergeLeaves = mergeLeaves;
    if (mergeLeaves) this.matrices = [];
  }

  setModelPrecision(segment) {
    this.treeObj.segment = segment;
  }

  addConvex(convex) {
    this.convex = convex;
  }

  clearMesh() {
    this.branchGeometries = [];
    this.cnt = 0;
    if (this.mergeLeaves) this.matrices = [];
  }

  randomizeMatrix(curve, points) {
    const pointsLength = points.length;
    let lastBranch = this.treeObj.branches.at(-1);
    const fork_min = lastBranch.fork.min,
      fork_max = lastBranch.fork.max;
    const base = Math.floor(
      pointsLength * randomRangeLinear(fork_min, fork_max)
    );
    const basePosition = points[base];
    const tan_vector = new THREE.Vector3(),
      incre_vector = new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(Math.sin(this.treeObj.angle));
    curve.getTangent(0.5, tan_vector);
    const dir_vector = new THREE.Vector3()
      .addVectors(tan_vector, incre_vector)
      .normalize();

    const rot_angle = this.y_axis.angleTo(dir_vector);
    const rot_axis = new THREE.Vector3()
      .crossVectors(this.y_axis, dir_vector)
      .normalize();

    const trans = new THREE.Matrix4().makeTranslation(
      basePosition.x,
      basePosition.y,
      basePosition.z
    );
    let s = this.treeObj.leaves.scale;
    const scl = new THREE.Matrix4().makeScale(s, s, s);
    const rot1 = new THREE.Matrix4().makeRotationY(Math.random() * 2 * Math.PI), // (0,2pi)
      rot2 = new THREE.Matrix4().makeRotationAxis(rot_axis, rot_angle);
    const rot = new THREE.Matrix4().multiply(rot2).multiply(rot1);
    const matrix = new THREE.Matrix4();
    matrix.multiply(trans).multiply(rot).multiply(scl);
    return matrix;
  }

  buildSkeletonRec(start, end, disturb, fatherSkeleton, depth = 0) {
    if (depth > this.treeObj.depth) return;
    if (depth === this.treeObj.depth) disturb = 0;

    const nodes = disturbedCurveNode(
      makeVector3(start),
      makeVector3(end),
      disturb,
      this.treeObj.gravity
    );
    const curSkeleton = new TreeSkeleton(nodes);
    fatherSkeleton.add(curSkeleton);

    const curve = new THREE.CatmullRomCurve3(nodes);
    const points = curve.getPoints(50);

    const pointsLength = points.length;
    const cur_node = this.treeObj.branches[depth],
      next_node = this.treeObj.branches[depth + 1];
    if (!next_node) return;

    const fork_min = cur_node.fork.min,
      fork_max = cur_node.fork.max,
      branchLength = next_node.length;
    const branchNumber = next_node.number;
    let theta = this.treeObj.angle;

    let base = 0;
    const tan_vector = new THREE.Vector3();
    curve.getTangent(0.5, tan_vector);
    let incre_vector, dir_vector;
    do {
      incre_vector = new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(Math.sin(theta));
      dir_vector = new THREE.Vector3()
        .addVectors(tan_vector, incre_vector)
        .normalize();
    } while (tan_vector.angleTo(dir_vector) < theta / 2); // 让树枝尽量的散开，不要挤在一起
    for (let i = 0; i < branchNumber; i++) {
      base = Math.floor(pointsLength * randomRangeLinear(fork_min, fork_max));
      if (i > 0)
        dir_vector
          .applyAxisAngle(tan_vector, (2 * Math.PI) / branchNumber)
          .normalize();
      const s = points[base];
      let min_length = branchLength.min,
        max_length = branchLength.max;
      let end_point;
      if (this.convex && depth === this.treeObj.depth - 2) {
        const ray = new THREE.Raycaster(s, dir_vector);
        const target = ray.intersectObject(this.convex, false);
        console.log(target);
        // if (target.length === 0) return; // 直接剪枝剪掉算了
        if (target[0] /*&& target[0].distance <= max_length*/) {
          end_point = target[0].point;
        }
      }
      const e = end_point
        ? end_point
        : new THREE.Vector3().addVectors(
            s,
            dir_vector.multiplyScalar(randomRangeLinear(min_length, max_length))
          );
      this.buildSkeletonRec(s, e, disturb, curSkeleton, depth + 1);
    }
  }

  buildTreeRec(skeleton, radius, depth = 0) {
    if (depth > this.treeObj.depth) return;

    radius = radius <= 0.1 ? 0.1 : radius;

    const curve = new THREE.CatmullRomCurve3(makeVectors(skeleton.positions));
    const points = curve.getPoints(50);
    const segment = this.treeObj.segment; // 树干分成的段数

    if (skeleton.children.length === 0) {
      // 叶子节点
      const each = this.treeObj.leaves.each,
        total = this.treeObj.leaves.total;
      if (this.mergeLeaves) {
        for (let i = 0; i < each; i++, this.cnt++) {
          if (this.cnt < total) {
            const matrix = this.randomizeMatrix(curve, points);
            this.matrices.push(matrix);
          }
        }
      } else {
        for (let i = 0; i < each; i++, this.cnt++) {
          if (this.cnt < total) {
            const matrix = this.randomizeMatrix(curve, points);
            this.leaf.setMatrixAt(this.cnt, matrix);
          }
        }
      }
    }
    // console.log(segment, radius, 5, false, this.treeObj.shrink.single)
    const branchGeometry = new BranchGeometry(
      curve,
      1,
      radius,
      3,
      false,
      this.treeObj.shrink.single
    );
    // console.log(branchGeometry)
    this.branchGeometries.push(branchGeometry);
    skeleton.children.forEach((child) => {
      this.buildTreeRec(child, radius * this.treeObj.shrink.multi, depth + 1);
    });
  }

  buildKmeansSkeletonRec(
    data,
    fatherSkeleton,
    baseY = 0,
    startArray = [],
    depth = 0
  ) {
    let totalDepth = this.treeObj.depth;
    if (depth > totalDepth || data.length < 100) return;

    let { centroids, clusters } = kMeans(
      data,
      depth > 0 ? this.treeObj.branches[depth].number : 1
    );
    let l = centroids.length;
    let startVector, centroidVector, endVector;
    let disturb = this.treeObj.disturb,
      gravity = this.treeObj.gravity,
      fork_min = this.treeObj.branches[depth].fork.min,
      fork_max = this.treeObj.branches[depth].fork.max;

    for (let i = 0; i < l; i += 3) {
      let nextStartArray = [];
      centroidVector = new THREE.Vector3().fromArray(centroids, i);
      startVector =
        startArray.length > 0
          ? startArray[i / 3]
          : new THREE.Vector3(centroidVector.x, baseY, centroidVector.z);
      endVector = new THREE.Vector3()
        .addVectors(startVector, centroidVector)
        .divideScalar(2);
      if (depth === totalDepth)
        endVector.setX(centroidVector.x).setZ(centroidVector.z);

      // 存储骨架
      let treeNodes = disturbedCurveNode(
        startVector,
        endVector,
        disturb,
        gravity
      );
      let curSkeleton = new TreeSkeleton(treeNodes);
      fatherSkeleton.add(curSkeleton);

      // 生成下次递归的开始节点
      if (depth + 1 <= totalDepth) {
        let curve = new THREE.CatmullRomCurve3(treeNodes);
        let points = curve.getPoints(50);
        let pointsLength = points.length;
        for (let j = 0; j < this.treeObj.branches[depth + 1].number; j++) {
          let base = Math.floor(
            pointsLength * randomRangeLinear(fork_min, fork_max)
          );
          nextStartArray.push(points[base]);
        }
      }

      this.buildKmeansSkeletonRec(
        clusters.get(i / 3),
        curSkeleton,
        baseY,
        nextStartArray,
        depth + 1
      );
    }
  }

  // public
  buildSkeleton() {
    const { treeObj } = this;
    const trunk = treeObj.branches[0];
    const treeSkeleton = new TreeSkeleton();
    this.buildSkeletonRec(
      trunk.start,
      trunk.end,
      treeObj.disturb,
      treeSkeleton
    );
    treeSkeleton.setTreeObj(treeObj);
    return treeSkeleton;
  }

  // public
  buildKmeansSkeleton(data, baseY) {
    const { treeObj } = this;
    const treeSkeleton = new TreeSkeleton();
    this.buildKmeansSkeletonRec(data, treeSkeleton, baseY);
    treeSkeleton.setTreeObj(treeObj);
    return treeSkeleton;
  }

  // public
  buildTree(skeleton) {
    const { treeObj, branchGeometries, mergeLeaves, matrices } = this;

    const loader = new THREE.TextureLoader();
    const g = treeObj.leaves.geometry;
    const leafMaterial = new THREE.MeshLambertMaterial({
      map: loader.load(treeObj.path + "leaf_base_standard.png"),
      normalMap: loader.load(treeObj.path + "leaf_normal_standard.png"),
      side: THREE.DoubleSide,
      alphaTest: treeObj.leaves.alphaTest,
    });
    // 1. 实例化方式做树叶，递归函数前创建mesh
    if (!mergeLeaves) {
      this.leaf = new THREE.InstancedMesh(
        new Leaf(g.style, g.width, g.height, g.foldDegree).generate(),
        leafMaterial,
        treeObj.leaves.total
      );
    }
    // 2. 执行递归
    const trunk = treeObj.branches[0];
    this.buildTreeRec(skeleton.children[0], trunk.radius);
    // 3. 合并方式做树叶，递归函数后创建mesh
    if (mergeLeaves) {
      const leafGeometries = [];
      matrices.forEach((matrix) => {
        leafGeometries.push(
          new Leaf(g.style, g.width, g.height, g.foldDegree)
            .generate()
            .applyMatrix4(matrix)
        );
      });
      const mergedLeavesGeometry = BufferGeometryUtils.mergeBufferGeometries(
        leafGeometries,
        false
      );
      this.leaf = new THREE.Mesh(mergedLeavesGeometry, leafMaterial);
    }
    // 4. 枝干
    const treeGeometry = BufferGeometryUtils.mergeBufferGeometries(
      branchGeometries,
      false
    );
    const treeTexture = loader.load(treeObj.path + "tree_base_standard.png");
    const treeNormalTexture = loader.load(
      treeObj.path + "tree_normal_standard.png"
    );
    treeTexture.wrapS = treeNormalTexture.wrapS = THREE.RepeatWrapping;
    treeTexture.repeat.set(2, 1);
    treeNormalTexture.repeat.set(2, 1);
    const treeMaterial = new THREE.MeshLambertMaterial({
      map: treeTexture,
      normalMap: treeNormalTexture,
    });
    const tree = new THREE.Mesh(treeGeometry, treeMaterial);
    const group = new THREE.Group();
    group.add(tree, this.leaf);
    return group;
  }
}

export { TreeBuilder };
