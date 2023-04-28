import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { TreeBuilder } from "../TreeBuilder";
import { CustomizeTree } from "../CustomizeTree";

const main = () => {
  const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ canvas: canvas });
  // renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0xffffff, 1.0);

  const scene = new THREE.Scene();

  const fov = 45;
  const aspect = 2;
  const near = 0.1;
  const far = 50000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 5000, 0);
  camera.lookAt(0, 10, 0);

  {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.AmbientLight(color, intensity);
    scene.add(light);
    const dirlight = new THREE.DirectionalLight(color, intensity);
    dirlight.position.set(0, 100, 0);
    scene.add(dirlight);
  }

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 10, 0);
  controls.update();

  const size = 10000;
  const segment = 100;
  const unit = size / segment;

  scene.add(new THREE.AxesHelper(size));

  const gridHelper = new THREE.GridHelper(size, segment);
  scene.add(gridHelper);

  const geometry = new THREE.PlaneGeometry(size, size);
  geometry.rotateX(-Math.PI / 2);

  const plane = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  scene.add(plane);

  const customizeTree = new CustomizeTree();
  const treeObj = customizeTree.getTree("法国梧桐");
  const builder = new TreeBuilder(treeObj, true);

  const raycaster = new THREE.Raycaster();
  let pointer = new THREE.Vector2();
  let points = [];
  let cells = [];
  let timer, interval_timer, isDaubing;
  const pointgeo = new THREE.BoxGeometry(50, 50, 50);
  const pointmat = new THREE.MeshBasicMaterial({ color: "red" });
  const pointergeo = new THREE.CircleGeometry(50, 32);
  pointergeo.rotateX(Math.PI / 2);
  const pointermat = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide,
  });
  const circle = new THREE.Mesh(pointergeo, pointermat);

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
        instancedMesh.setMatrixAt(index, matrix);
      });
    });
    instancedMeshGroup.add(...instancedMeshes);
    return instancedMeshGroup;
  };

  const intersecting = (event, object) => {
    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(object, false);
    if (intersects.length > 0) return intersects[0].point.setY(0);
    return;
  };

  const onPointerMove = (event) => {
    if (isDaubing) {
      let point = intersecting(event, plane);
      if (point) {
        circle.position.set(point.x, 10, point.z);
        points.push(point);
      }
    }
  };

  const onPointerDown = (event) => {
    console.log("pointer down");
    timer = setTimeout(() => {
      let point = intersecting(event, plane);
      if (point) {
        circle.position.set(point.x, 10, point.z);
        scene.add(circle);
        isDaubing = true;
      }
      console.log("长按开始");
    }, 1000);
  };

  const onPointerUp = (event) => {
    clearTimeout(timer);
    clearInterval(interval_timer);
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    scene.remove(circle);
    isDaubing = false;
    console.log("pointer up");

    // rasterization
    let lastcell = new THREE.Vector3().addScalar(Infinity);
    points.forEach((point) => {
      let cell = point
        .divideScalar(unit)
        .floor()
        .multiplyScalar(unit)
        .addScalar(unit / 2)
        .setY(0);
      if (!lastcell.equals(cell)) cells.push(cell);
      lastcell = cell;
    });

    let skeleton = builder.buildSkeleton();
    let tree = builder.buildTree(skeleton);
    builder.clearMesh();
    const matrices = [];
    cells.forEach((cell) => {
      matrices.push(new THREE.Matrix4().setPosition(cell));
    });

    let instancedTree = buildInstancedMeshGroup(tree, matrices);
    console.log(instancedTree);
    scene.add(instancedTree);
  };

  const onClick = (event) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      let point = intersecting(event, plane);
      if (point) {
        points.push(point);
        let pointmesh = new THREE.Mesh(pointgeo, pointmat);
        pointmesh.position.set(point.x, 25, point.z);
        scene.add(pointmesh);
      }
    }, 100);
  };

  const onDoubleClick = (event) => {
    clearTimeout(timer);
    let point = intersecting(event, plane);
    if (point) {
      points.push(point);
      let pointmesh = new THREE.Mesh(pointgeo, pointmat);
      pointmesh.position.copy(point);
      scene.add(pointmesh);
      document.removeEventListener("click", onClick);
      document.removeEventListener("dblclick", onDoubleClick);

      let curve = new THREE.CatmullRomCurve3(points);
      let curvepoints = curve.getPoints(100);
      let linemat = new THREE.LineBasicMaterial({
        color: 0x0000ff,
      });
      let linegeo = new THREE.BufferGeometry().setFromPoints(curvepoints);
      let line = new THREE.Line(linegeo, linemat);
      scene.add(line);

      // rasterization
      let lastcell = new THREE.Vector3().addScalar(Infinity);
      curvepoints.forEach((point) => {
        let cell = point
          .divideScalar(unit)
          .floor()
          .multiplyScalar(unit)
          .addScalar(unit / 2)
          .setY(0);
        if (!lastcell.equals(cell)) cells.push(cell);
        lastcell = cell;
      });

      cells.forEach((cell) => {
        let skeleton = builder.buildSkeleton();
        let tree = builder.buildTree(skeleton);
        builder.clearMesh();
        tree.position.copy(cell);
        scene.add(tree);
      });
    }
  };

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

  /////////////////////////////////////////////////////////////////////////////////
  // GUI
  const guiobj = {
    set_key_points() {
      document.addEventListener("click", onClick);
      document.addEventListener("dblclick", onDoubleClick);
    },
    daub() {
      controls.enabled = false;
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointermove", onPointerMove);
    },
    view_mode() {
      points = [];
      cells = [];
      controls.enabled = true;
    },
  };
  const gui = new GUI();
  gui.add(guiobj, "set_key_points");
  gui.add(guiobj, "daub");
  gui.add(guiobj, "view_mode");

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
  // document.addEventListener("click", onClick);
  // document.addEventListener("dblclick", onDoubleClick);
};

main();
