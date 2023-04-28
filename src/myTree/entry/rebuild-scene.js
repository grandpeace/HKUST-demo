import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { TreeBuilder } from "../TreeBuilder";
import { getTrees } from "../AxiosApi";
import { CustomizeTree } from "../CustomizeTree";

async function main() {
  const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ canvas: canvas });
  // renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0xffffff, 1.0);

  const scene = new THREE.Scene();

  const fov = 45;
  const aspect = 2;
  const near = 0.1;
  const far = 10000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(100, 70, 0);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 10, 0);
  controls.update();

  const color = 0xffffff;
  const intensity = 1;
  const amLight = new THREE.AmbientLight(color, intensity);
  scene.add(amLight);

  const planeSize = 16000;

  const axesHelper = new THREE.AxesHelper(1000);
  scene.add(axesHelper);

  const plainGeometry = new THREE.PlaneGeometry(planeSize, planeSize, 10, 10);
  plainGeometry.rotateX(-Math.PI / 2);
  const plain = new THREE.Mesh(
    plainGeometry,
    new THREE.MeshLambertMaterial({
      wireframe: true,
      color: "black",
    })
  );

  scene.add(plain);

  const builder = new TreeBuilder();

  const buildInstancedMeshGroup = function (singleTree, matrices) {
    const instancedMeshGroup = new THREE.Group();
    const instancedMeshes = [];
    // singleTree is a THREE.Group
    singleTree.children.forEach((child) => {
      instancedMeshes.push(
        new THREE.InstancedMesh(child.geometry, child.material, matrices.length)
      );
    });
    matrices.forEach((matrix, index) => {
      instancedMeshes.forEach((instancedMesh) => {
        instancedMesh.setMatrixAt(index, new THREE.Matrix4().fromArray(matrix));
      });
    });
    instancedMeshGroup.add(...instancedMeshes);
    return instancedMeshGroup;
  };

  // 5) 服务端把场景中的所有保存的骨架传回客户端
  console.time("request");
  const trees = await getTrees();
  console.timeEnd("request");
  console.log(trees);

  const customizeTree = new CustomizeTree();
  const treeObj = customizeTree.getTree("香樟");

  // 6) 客户端对骨架进行离线渲染
  console.time("rebuild and render");
  trees.forEach((tree) => {
    builder.init(treeObj, false);
    let singleTree = builder.buildTree(tree.skeleton);

    if (tree.isInstanced) {
      let instancedTree = buildInstancedMeshGroup(singleTree, tree.matrices);
      scene.add(instancedTree);
    } else {
      singleTree.applyMatrix4(new THREE.Matrix4().fromArray(tree.matrix));
      scene.add(singleTree);
    }
    builder.clearMesh();
  });
  console.timeEnd("rebuild and render");

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
    // 图像不随屏幕拉伸改变
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
}

main();
