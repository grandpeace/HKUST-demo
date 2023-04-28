import { DBSCAN } from "../lib/Cluster";
import { TreeBuilder } from "../TreeBuilder";
import { CustomizeTree } from "../CustomizeTree";

const customizeTrees = new CustomizeTree();
const treeObj = customizeTrees.getTree("香樟");
const builder = new TreeBuilder(treeObj, true);

self.addEventListener(
  "message",
  (event) => {
    const inner_data = event.data.input;

    // console.time("db timer");
    // const denoise_data = DBSCAN(inner_data, 20, 50);
    // console.timeEnd("db timer");

    console.time("kmeans skeleton timer");
    const skeleton = builder.buildKmeansSkeleton(inner_data, 0);
    console.timeEnd("kmeans skeleton timer");

    self.postMessage(skeleton);

    console.log("finish computing!");
  },
  false
);
