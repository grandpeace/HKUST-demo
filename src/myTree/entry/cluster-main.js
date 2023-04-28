import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader.js";
import { CustomizeTree } from "../CustomizeTree";
import {
  loadData,
  kMeans,
  bikMeans,
  DBSCAN,
  connectedComponent,
} from "../lib/Cluster";
import { createTree } from "../AxiosApi";
import { drawLine } from "../utilities";

const main = () => {
  const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ canvas: canvas });
  // renderer.outputEncoding = THREE.sRGBEncoding;
  // renderer.setClearColor(0xffffff, 1.0);

  const scene = new THREE.Scene();

  const fov = 45;
  const aspect = 2;
  const near = 0.1;
  const far = 50000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(1000, 1000, 1000);
  camera.lookAt(0, 0, 0);

  {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.AmbientLight(color, intensity);
    scene.add(light);
  }

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.update();

  scene.add(new THREE.AxesHelper(1000));

  const loader = new PCDLoader();
  const customizeTrees = new CustomizeTree();
  const treeObj = customizeTrees.getTree("香樟");

  let left = 21;
  for (let i = 0; i <= 20; i++) {
    loader.load(`resources/urban3d/off-ground points-1/CC${i}.pcd`, (pcd) => {
      pcd.geometry.rotateX(-Math.PI / 2);
      // pcd.geometry.scale(10, 10, 10);
      pcd.geometry.translate(0, 0, 1000);
      // scene.add(pcd);

      // 重建
      console.log("computing:" + i);
      const inner_data = loadData(pcd);
      const worker = new Worker(
        new URL("./cluster-worker.js", import.meta.url),
        { type: "module" }
      );
      worker.onmessage = (event) => {
        const skeleton = event.data;
        const matrixArr = new THREE.Matrix4().elements;
        createTree(skeleton, false, matrixArr, []);
        // const rootLine = new THREE.Group();
        // drawLine(skeleton.children[0], rootLine);
        // scene.add(rootLine);
        worker.terminate();
        console.log("CC" + i + " Done!");
        left--;
        if (left === 0) console.log("All clear!");
      };
      worker.postMessage({ input: inner_data });
    });
  }

  /*loader.load("resources/Zaghetto.pcd", (pcd) => {
    pcd.geometry.center();
    pcd.geometry.rotateX(Math.PI);
    pcd.geometry.scale(100, 100, 100);

    // scene.add(points);
    // scene.add(pcd);

    const clusters = connectedComponent(pcd, 2);

    clusters.forEach((v, i) => {
      console.log(`第 ${i} 个连通分量有 ${v.length / 3} 个点`);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
      let r = Math.floor(Math.random() * 256);
      let g = Math.floor(Math.random() * 256);
      let b = Math.floor(Math.random() * 256);
      const material = new THREE.PointsMaterial({
        color: `rgb(${r},${g},${b})`,
        size: 0.2,
      });
      const p = new THREE.Points(geometry, material);
      scene.add(p);
    });

    // 重建
    let cnt = clusters.length;
    clusters.forEach((cluster, index) => {
      console.log("computing: " + index);
      const inner_data = cluster.points;
      const worker = new Worker(
        new URL("./cluster-worker.js", import.meta.url),
        { type: "module" }
      );
      worker.onmessage = (event) => {
        const skeleton = event.data;
        const rootLine = new THREE.Group();
        drawLine(skeleton.children[0], rootLine);
        scene.add(rootLine);
        worker.terminate();
        cnt--;
        if (cnt === 0) console.log("Done!");
      };
      worker.postMessage({ input: inner_data });
    });

    // clusters.forEach((cluster, index) => {
    //   console.log("computing: " + index);
    //   const inner_data = cluster.points;

    //   console.time("db timer");
    //   const denoise_data = DBSCAN(inner_data, 20, 50);
    //   console.timeEnd("db timer");

    //   // console.log(denoise_data);

    //   console.time("kmeans skeleton timer");
    //   const skeleton = builder.buildKmeansSkeleton(denoise_data, 130);
    //   console.timeEnd("kmeans skeleton timer");

    //   // console.log(skeleton);
    //   const rootLine = new THREE.Group();
    //   drawLine(skeleton.children[0], rootLine);
    //   scene.add(rootLine);
    //   // const tree = builder.buildTree(skeleton);
    //   // scene.add(tree);
    //   // builder.clearMesh();
    // });
    // console.log("Done!");
  });*/

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = (canvas.clientWidth * pixelRatio) | 0;
    const height = (canvas.clientHeight * pixelRatio) | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
  }
  animate();
};

main();
