import * as THREE from "three";
import { Octree } from "./Octree";

/* 不属于 kmeans 算法的工具函数 */

// 从数组中获取一个三维坐标
const extract = (arr, index) => {
  return [arr[index], arr[index + 1], arr[index + 2]];
};

// 计算两点间的欧氏距离
const euclideanDistance = (n1, n2) => {
  return Math.sqrt(
    (n1[0] - n2[0]) ** 2 + (n1[1] - n2[1]) ** 2 + (n1[2] - n2[2]) ** 2
  );
};

// 计算三维点集的平均点坐标
const mean = (data) => {
  let x = 0,
    y = 0,
    z = 0;
  let l = data.length;
  for (let i = 0; i < l; i += 3) {
    x += data[i];
    y += data[i + 1];
    z += data[i + 2];
  }
  x /= l / 3;
  y /= l / 3;
  z /= l / 3;
  return [x, y, z];
};

// 计算点云的包围盒，点云以数组形式存储
const getBoundingBox = (data) => {
  let l = data.length;
  let minx = +Infinity,
    miny = +Infinity,
    minz = +Infinity,
    maxx = -Infinity,
    maxy = -Infinity,
    maxz = -Infinity;
  for (let i = 0; i < l; i += 3) {
    minx = Math.min(data[i], minx);
    miny = Math.min(data[i + 1], miny);
    minz = Math.min(data[i + 2], minz);
    maxx = Math.max(data[i], maxx);
    maxy = Math.max(data[i + 1], maxy);
    maxz = Math.max(data[i + 2], maxz);
  }
  let minVector = new THREE.Vector3(minx, miny, minz);
  let maxVector = new THREE.Vector3(maxx, maxy, maxz);
  return new THREE.Box3(minVector, maxVector);
};

/* kmeans++ 选择初始聚类中心，每个聚类中心要离的相对较远 */

const getClosestDist = (point, kCentroids, dist) => {
  let minDist = +Infinity;
  let k = kCentroids.length;
  for (let i = 0; i < k; i += 3) {
    let centroid = extract(kCentroids, i);
    let d = dist(centroid, point);
    if (d < minDist) minDist = d;
  }
  return minDist;
};

const initKppCentroids = (data, k, dist) => {
  let kCentroids = [];
  let dataLength = data.length;
  let idx = Math.floor(Math.random() * (dataLength / 3));
  kCentroids.push(data[idx * 3], data[idx * 3 + 1], data[idx * 3 + 2]);
  let D = new Array(dataLength / 3);
  for (let _ = 1; _ < k; _++) {
    let total = 0;
    for (let i = 0; i < dataLength; i += 3) {
      let point = extract(data, i);
      let idx = i / 3;
      D[idx] = getClosestDist(point, kCentroids, dist);
      total += D[idx];
    }
    total *= Math.random();
    for (let i = 0; i < D.length; i++) {
      total -= D[i];
      if (total > 0) continue;
      kCentroids.push(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
      break;
    }
  }
  return kCentroids;
};

/* kmeans 算法包含的函数 */

const loadData = (points) => {
  let data = [];
  if (Array.isArray(points)) {
    points.forEach((p) => {
      let particals = p.geometry.attributes.position.array;
      data.push(...particals);
    });
  } else data = points.geometry.attributes.position.array;
  return data;
};

const initKCentroids = (data, k) => {
  let kCentroids = [];
  let num = data.length / 3;
  let idxSet = new Set();
  while (idxSet.size < k) {
    let idx = 3 * Math.floor(Math.random() * num);
    if (idxSet.has(idx)) continue;
    idxSet.add(idx);
    kCentroids.push(data[idx], data[idx + 1], data[idx + 2]);
  }
  return kCentroids;
};

const divideClusters = (data, kCentroids, dist) => {
  let clusters = new Map();
  let k = kCentroids.length,
    datalength = data.length;
  for (let i = 0; i < datalength; i += 3) {
    let node = extract(data, i);
    let clusterIdx = -1;
    let minDist = +Infinity;
    for (let j = 0; j < k; j += 3) {
      let centroid = extract(kCentroids, j);
      let distance = dist(node, centroid);
      if (distance < minDist) {
        minDist = distance;
        clusterIdx = j / 3;
      }
    }
    if (!clusters.get(clusterIdx)) clusters.set(clusterIdx, []);

    clusters.get(clusterIdx).push(...node);
  }
  return clusters;
};

const getKCentroids = (clusters) => {
  let newKCentroids = [];
  clusters.forEach((v, k) => {
    let newCentroid = mean(v);
    newKCentroids.push(...newCentroid);
  });
  return newKCentroids;
};

const sse = (centroid, cluster, dist) => {
  let l = cluster.length;
  let res = 0;
  for (let i = 0; i < l; i += 3) {
    let p = extract(cluster, i);
    res += dist(centroid, p) ** 2;
  }
  return res;
};

const calVariance = (kCentroids, clusters, dist) => {
  let sum = 0;
  clusters.forEach((cluster, k) => {
    let centroid = extract(kCentroids, k);
    let SSE = sse(centroid, cluster, dist);
    sum += SSE;
  });
  return sum;
};

/* DBSCAN 算法包含的函数 */

const identifyPoint = (point, epslon, minPts, octree) => {
  let sphere = new THREE.Sphere(point, epslon);
  let boundingBox = new THREE.Box3();
  sphere.getBoundingBox(boundingBox);

  let found = [];
  octree.queryBySphere(sphere, boundingBox, found);

  if (found.length >= minPts) return { type: "core", neighbors: found };
  else if (found.length > 0) return { type: "border", neighbors: found };
  else return { type: "noise", neighbors: found };
};

const distSchema = new Map([["euclidean", euclideanDistance]]);

const methodSchema = new Map([
  ["random", initKCentroids],
  ["kmeans++", initKppCentroids],
]);

const kMeans = (
  data,
  k,
  distString = "euclidean", // 欧式距离
  createCentString = "kmeans++", // kmeans++初始聚类
  scene = null
) => {
  let dist = distSchema.get(distString);
  let createCent = methodSchema.get(createCentString);
  let centroids = createCent(data, k, dist);
  let clusters = divideClusters(data, centroids, dist);
  let newVar = calVariance(centroids, clusters, dist);
  let oldVar = 1;

  while (Math.abs(newVar - oldVar) > 1e-6) {
    centroids = getKCentroids(clusters);
    clusters = divideClusters(data, centroids, dist);
    oldVar = newVar;
    newVar = calVariance(centroids, clusters, dist);
  }

  // print centroids
  /*
  let r = Math.floor(Math.random() * 256);
  let g = Math.floor(Math.random() * 256);
  let b = Math.floor(Math.random() * 256);
  for (let i = 0; i < centroids.length; i += 3) {
    let ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 2, 2),
      new THREE.MeshBasicMaterial({ color: `rgb(${r},${g},${b})` })
    );
    ball.position.set(...extract(centroids, i));
    scene.add(ball);
  }*/

  // print clusters
  if (scene) {
    clusters.forEach((v, k) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(v), 3)
      );
      let r = Math.floor(Math.random() * 256);
      let g = Math.floor(Math.random() * 256);
      let b = Math.floor(Math.random() * 256);
      const material = new THREE.PointsMaterial({
        color: `rgb(${r},${g},${b})`,
        size: 0.05,
      });
      const p = new THREE.Points(geometry, material);
      scene.add(p);
    });
  }
  return { centroids, clusters };
};

const bikMeans = (
  data,
  k,
  distString = "euclidean",
  createCentString = "kmeans++",
  scene = null
) => {
  let dist = distSchema.get(distString);
  const clusters = [];
  let centroid = mean(data);
  let SSE = sse(centroid, data, dist);
  let maxSSE = SSE,
    maxidx = 0;
  clusters.push({ points: data, centroid: centroid, sse: SSE });

  while (clusters.length < k) {
    let cluster = clusters[maxidx];
    let { centroids: split_centroids, clusters: split_clusters } = kMeans(
      cluster.points,
      2,
      distString,
      createCentString,
      scene
    );

    let centroid1 = extract(split_centroids, 0),
      centroid2 = extract(split_centroids, 3);
    let points1 = split_clusters.get(0),
      points2 = split_clusters.get(1);
    let SSE1 = sse(centroid1, points1, dist),
      SSE2 = sse(centroid2, points2, dist);
    clusters.splice(
      maxidx,
      1,
      { points: points1, centroid: centroid1, sse: SSE1 },
      { points: points2, centroid: centroid2, sse: SSE2 }
    ); // 这导致 clusters 数组长度 +1
    // 重新寻找最大的 SSE
    maxSSE = 0;
    maxidx = -1;
    clusters.forEach((cluster, index) => {
      if (maxSSE < cluster.sse) {
        maxSSE = cluster.sse;
        maxidx = index;
      }
    });
  }
  return clusters;
};

const DBSCAN = (data, epslon, minPts) => {
  const box3 = getBoundingBox(data);
  const n = minPts;
  const octree = new Octree(box3, n);

  const vectors = octree.buildFromPointCloud(data);
  const stack = []; // js array to simulate a stack
  const clusters = [];
  const totalNum = vectors.length;
  const unvisitedIndex = new Array(totalNum);
  for (let i = 0; i < totalNum; i++) unvisitedIndex[i] = i;

  while (unvisitedIndex.length > 0) {
    // let isFirstPoint = true;
    // 从未访问点中选取一个新点，默认为第一个
    let idx = unvisitedIndex[0];
    let new_point = vectors[idx];

    new_point.visited = true;
    unvisitedIndex.splice(unvisitedIndex.indexOf(idx), 1);

    let cur_cluster = [new_point.x, new_point.y, new_point.z];
    clusters.push(cur_cluster);
    stack.push(idx); // 入栈，栈内存下标

    // console.log(unvisitedIndex.length);

    while (stack.length > 0) {
      let cur_idx = stack.pop();
      let cur_point = vectors[cur_idx];
      cur_cluster.push(cur_point.x, cur_point.y, cur_point.z); // 加入聚类
      unvisitedIndex.splice(unvisitedIndex.indexOf(cur_idx), 1); // 从未访问点中删除
      let { type, neighbors } = identifyPoint(
        cur_point,
        epslon,
        minPts,
        octree
      );

      if (type === "core") {
        neighbors.forEach((neighbor_point) => {
          if (neighbor_point.visited === false) {
            neighbor_point.visited = true;
            stack.push(neighbor_point.index); // 入栈
          }
        });
      } /*else if (type === "border") {
        neighbors.forEach((neighbor_point) => {
          if (neighbor_point.visited === false) {
            neighbor_point.visited = true;
            if (isFirstPoint) {
              stack.push(neighbor_point.index);
              isFirstPoint = false;
            }
          }
        });
      } else if (type === "noise") {
      }*/
    }
    // 此聚类结束，进入下一次循环
    let cur_cluster_points_num = cur_cluster.length / 3;
    if (cur_cluster_points_num > totalNum / 2) {
      // 如果此聚类中点的个数超过总数的一半，即认为这就是树木的点云，剩下的全是噪声
      return cur_cluster;
    }
  }
  return clusters;
};

const connectedComponent = (pcd, r) => {
  const octree = new Octree(pcd.geometry.boundingBox, 10, 0);

  console.time("build octree");
  const vectors = octree.buildFromPointCloud(pcd);
  console.timeEnd("build octree");

  const stack = [];
  const totalNum = vectors.length;

  console.log("点云包含点的个数:", totalNum);

  const unvisitedIndex = new Array(totalNum);
  for (let i = 0; i < totalNum; i++) unvisitedIndex[i] = i;

  let sphere = new THREE.Sphere();
  sphere.radius = r;

  const clusters = [];

  console.time("compute connected component");
  while (unvisitedIndex.length > 0) {
    let idx = unvisitedIndex[0];
    let new_point = vectors[idx];
    new_point.visited = true;
    unvisitedIndex.splice(unvisitedIndex.indexOf(idx), 1);
    stack.push(idx); // 入栈，栈内存下标

    let cur_cluster = [new_point.x, new_point.y, new_point.z];
    clusters.push(cur_cluster);

    while (stack.length > 0) {
      let cur_idx = stack.pop();
      let cur_point = vectors[cur_idx];
      cur_cluster.push(cur_point.x, cur_point.y, cur_point.z); // 加入聚类
      unvisitedIndex.splice(unvisitedIndex.indexOf(cur_idx), 1); // 从未访问点中删除
      // look for its neighbors
      sphere.center = cur_point;
      let neighbors = octree.queryBySphere(sphere);

      neighbors.forEach((neighbor) => {
        if (!neighbor.visited) {
          neighbor.visited = true;
          stack.push(neighbor.index); // 入栈
        }
      });
    }
    // stack is empty
  }
  console.timeEnd("compute connected component");
  return clusters;
};

export { loadData, kMeans, bikMeans, DBSCAN, connectedComponent };
