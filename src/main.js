import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import JSZip from 'jszip';
import {GLTFExporter} from "three/examples/jsm/exporters/GLTFExporter";
import {MyUI} from "./MyUI";
import {WanderControl} from "./WanderControl";
import {Water} from "three/examples/jsm/objects/Water";
import {Sky} from "three/examples/jsm/objects/Sky";
import {CustomizeTree} from "./myTree/CustomizeTree";
import {TreeBuilder} from "./myTree/TreeBuilder";

// branch test

class Loader{
    constructor(body){
        this.body = body
        this.canvas = document.getElementById('myCanvas')
        this.canvas.width = this.body.clientWidth
        this.canvas.height = this.body.clientHeight

        this.meshes = new Array(529)
        this.waterList = []

        this.initScene()
    }
    animate(){
        requestAnimationFrame(this.animate)
        if(this.stats) this.stats.update()

        for(let i=0; i<this.waterList.length; i++){
            let water = this.waterList[i]
            water.material.uniforms['sunDirection'].value.copy(new THREE.Vector3(-200,800,-600)).normalize()
            water.material.uniforms['time'].value += 1.0/120.0
        }

        this.renderer.clear()
        this.renderer.render(this.scene, this.camera)
    }
    resize(){
        const {clientHeight, clientWidth} = this.body.parentElement
        this.camera.aspect = clientWidth / clientHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(clientWidth, clientHeight)
    }
    initScene(){
        this.renderer = new THREE.WebGLRenderer({
            alpha:true,
            antialias: true,
            canvas:this.canvas,
            preserveDrawingBuffer:true,
            toneMapping:THREE.ACESFilmicToneMapping,
            toneMappingExposure:0.1
        })
        this.renderer.setSize(this.body.clientWidth,this.body.clientHeight)
        this.body.appendChild(this.renderer.domElement)

        window.addEventListener('resize', this.resize.bind(this), false)

        // this.stats = new Stats();
        // var statsContainer = document.createElement('div')
        // statsContainer.id = 'stats-container'
        // statsContainer.appendChild(this.stats.domElement)
        // this.body.appendChild(statsContainer)

        this.scene = new THREE.Scene()

        this.camera = new THREE.PerspectiveCamera(60,this.body.clientWidth/this.body.clientHeight,1,3000)
        this.camera.position.copy(new THREE.Vector3(-325.6,193.7,557.7))
        this.camera.lookAt(0,0,0)
        this.scene.add(this.camera)

        this.orbitControl = new OrbitControls(this.camera,this.renderer.domElement)
        this.orbitControl.target = new THREE.Vector3(0,0,0)

        var self = this
        setInterval(function(){
            var s = "new Vector3("
            s += self.camera.position.x.toFixed(1).toString()
            s += ","
            s += self.camera.position.y.toFixed(1).toString()
            s += ","
            s += self.camera.position.z.toFixed(1).toString()
            s += "),"
            // console.log(s)
        }, 2000)

        // var directionalLight = new THREE.DirectionalLight(0xffffff,1.0)
        // directionalLight.position.set(-200,800,-600)
        // this.scene.add(directionalLight)
        var ambientLight = new THREE.AmbientLight(0xffffff,0.7)
        this.scene.add(ambientLight)

        this.sky = new Sky()
        this.sky.scale.setScalar(100000)
        this.scene.add(this.sky)

        this.sky.material.uniforms[ 'turbidity' ].value = 20
        this.sky.material.uniforms[ 'rayleigh' ].value = 1
        this.sky.material.uniforms[ 'mieCoefficient' ].value = 0.0005
        this.sky.material.uniforms[ 'mieDirectionalG' ].value = 1

        let elevation = 12
        let azimuth = -45
        let phi = THREE.MathUtils.degToRad(90-elevation)
        let theta = THREE.MathUtils.degToRad(azimuth)
        let sun = new THREE.Vector3().setFromSphericalCoords(1,phi,theta)
        this.sky.material.uniforms['sunPosition'].value.copy(sun)
        if(this.renderTarget!==undefined) this.renderTarget.dispose()
        let pmremGenerator = new THREE.PMREMGenerator(this.renderer)
        this.renderTarget = pmremGenerator.fromScene(this.sky)
        this.scene.environment = this.renderTarget.texture

        this.animate = this.animate.bind(this)
        requestAnimationFrame(this.animate)

        this.addMyUI()
        this.loadAssets()
        this.buildTree()

        // new THREE.FileLoader().load("assets/structdesc.json",(json)=>{
        //     let struct_list = JSON.parse(json)
        //     new THREE.FileLoader().load("assets/smatrix.json",(json)=>{
        //         let matrix_list = JSON.parse(json)
        //         let result = {}
        //         for(let i=0; i<struct_list.length; i++){
        //             result[i] = matrix_list[struct_list[i][0].n].it
        //         }
        //         var myBlob=new Blob([JSON.stringify(result)], { type: 'text/plain' })
        //         let link = document.createElement('a')
        //         link.href = URL.createObjectURL(myBlob)
        //         link.download = "instance_info.json"
        //         link.click()
        //     })
        // })
    }
    loadAssets(){
        var self = this
        const file_count = 111
        new THREE.FileLoader().load("assets/instance_info.json",(json)=>{
            let instance_info = JSON.parse(json)
            for(let i=0; i<file_count; i++){
                self.loadZip(i, instance_info)
            }
        })

        var element1 = document.createElement("p")
        this.body.appendChild(element1)
        element1.style.position = "fixed"
        element1.style.left = 20+"px"
        element1.style.top = 10+"px"
        element1.style.fontSize = window.innerHeight/40+"px"
        element1.style.fontWeight = "bolder"

        var loadTextFresh = setInterval(function(){
            var count = 0
            for(let i=0; i<self.meshes.length; i++){
                if(self.meshes[i]){
                    count++
                }
            }
            element1.innerText = (count/self.meshes.length*100).toFixed(2)+"%"
            if(count===self.meshes.length){
                // let color_json = []
                // let scene = new THREE.Scene()
                // for(let k=0; k<self.meshes.length; k++){
                //     let r = Math.floor(256*Math.random())
                //     let g = Math.floor(256*Math.random())
                //     let b = Math.floor(256*Math.random())
                //     let color = `rgb(${r},${g},${b})`
                //     color_json.push([r,g,b])
                //     self.meshes[k].material = new THREE.MeshBasicMaterial({color:new THREE.Color(color)})
                //     scene.add(self.meshes[k].clone())
                // }
                // let myBlob=new Blob([JSON.stringify(color_json)], { type: 'text/plain' })
                // let link = document.createElement('a')
                // link.href = URL.createObjectURL(myBlob)
                // link.download = "color_info.json"
                // link.click()
                // exportToGLTF(scene, "gkd.gltf")

                clearInterval(loadTextFresh)
                setTimeout(function(){
                    self.body.removeChild(element1)
                },5000)
            }
        },500)
    }
    loadZip(index, instance_info){
        var self = this
        var url = "assets/model"+index.toString()+".zip"
        var promise = JSZip.external.Promise
        var baseUrl = "blob:"+THREE.LoaderUtils.extractUrlBase(url)
        new promise(function(resolve,reject){
            var loader = new THREE.FileLoader(THREE.DefaultLoadingManager)
            loader.setResponseType('arraybuffer')
            loader.load(url,resolve,()=>{},reject)
        }).then(function(buffer){
            return JSZip.loadAsync(buffer)
        }).then(function(zip){
            var fileMap = {}
            var pendings = []
            for (var file in zip.files){
                var entry = zip.file(file)
                if(entry===null) continue
                pendings.push(entry.async("blob").then(function(file,blob){
                    fileMap[baseUrl+file] = URL.createObjectURL(blob)
                }.bind(this,file)))
            }
            return promise.all(pendings).then(function(){
                return fileMap
            })
        }).then(function(fileMap){
            return {
                urlResolver:function(url){
                    return fileMap[url]?fileMap[url]:url
                }}
        }).then(function(zip){
            var manager = new THREE.LoadingManager()
            manager.setURLModifier(zip.urlResolver)
            return manager
        }).then(function(manager){
            new GLTFLoader(manager).load("blob:assets/model"+index.toString()+".glb",(gltf)=>{
                let meshes = gltf.scene.children[0].children
                for(let i=0; i<meshes.length; i++){
                    // self.scene.add(meshes[i].clone())
                    let ind = meshes[i].name
                    self.addModel(meshes[i],instance_info[ind])
                }
            })
        })
    }
    addModel(mesh,instance_info){
        instance_info.push([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0])
        mesh.material.side = 2
        var instance_mesh = new THREE.InstancedMesh(mesh.geometry,mesh.material,instance_info.length)
        for(let i=0; i<instance_info.length; i++){
            let mat = instance_info[i]
            let instance_matrix = new THREE.Matrix4().set(
                mat[0], mat[1], mat[2], mat[3],
                mat[4], mat[5], mat[6], mat[7],
                mat[8], mat[9], mat[10], mat[11],
                0, 0, 0, 1)
            instance_mesh.setMatrixAt(i,instance_matrix)
        }
        if(mesh.name!=="175" && mesh.name!=="180"){
            // if(mesh.material.name==="草地-181"){
            //     this.buildTree(mesh)
            // }
            this.scene.add(instance_mesh)
        }else{
            var water = new Water(mesh.geometry,{
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg',function(texture){
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: false
            })
            this.scene.add(water)
            this.waterList.push(water)
        }
        this.meshes[Number(mesh.name)] = instance_mesh
    }
    exportGLTF(){
        // new THREE.FileLoader().load("assets/structdesc.json",(json)=>{
        //     let struct_list = JSON.parse(json)
        //     console.log(struct_list)
        //     let new_struct_list = []
        //     for(let i=0; i<struct_list.length; i++)
        //         for(let j=0; j<struct_list[i].length; j++)
        //             new_struct_list.push(struct_list[i][j])
        //     console.log(new_struct_list)
        // })
        var self = this
        new GLTFLoader().load("assets/output.glb",(gltf)=>{
            let meshes = gltf.scene.children[0].children
            console.log(meshes)
            self.scene.add(gltf.scene)
            let meshI = []
            let meshP = []
            for(let i=0; i<meshes.length; i++){
                // let mesh = meshes[i].clone()
                // let scene = new THREE.Scene()
                // let group = new THREE.Group()
                // group.add(mesh)
                // scene.add(group)
                // exportToGLTF(scene,"model"+i.toString()+".gltf")
                meshes[i].name = i.toString()
                meshI.push(i)
                meshes[i].geometry.computeBoundingBox()
                let box = meshes[i].geometry.boundingBox.clone()
                let p = (box.max.x-box.min.x)*(box.max.y-box.min.y)+(box.max.x-box.min.x)*(box.max.z-box.min.z)+(box.max.z-box.min.z)*(box.max.y-box.min.y)
                meshP.push(p)
            }
            quickSort(meshP,meshes,0,meshes.length-1)
            console.log(meshP)
            console.log(meshI)

            self.newMeshList = meshes
            self.fileSize = 1024*1024

            var file_size_list = []
            self.sizeCalculate(0,file_size_list)
        })
    }
    sizeCalculate(i,file_size_list){                    // 构件文件大小计算
        if(i>=this.newMeshList.length){//this.newMeshList.length
            console.log("size calculate over")
            this.pack_size(file_size_list)
            return
        }else if(i%1000===0){
            console.log(i+"/"+this.newMeshList.length)
        }
        var self = this
        var mesh = this.newMeshList[i].clone()
        var group = new THREE.Group()
        group.add(mesh)
        var scene = new THREE.Scene()
        scene.add(group)
        new GLTFExporter().parse(scene,function(result){
            var myBlob=new Blob([JSON.stringify(result)], { type: 'text/plain' })
            file_size_list.push(myBlob.size)
            self.sizeCalculate(i+1,file_size_list)
        })
    }
    pack_size(file_size_list){                          // 按构件文件大小划分数据包
        var groups = [[0]]
        var groups_size = [file_size_list[0]]
        for(let i=1; i<file_size_list.length; i++){
            var size = file_size_list[i]
            var the_group_size = groups_size[groups_size.length-1]
            if(the_group_size+size>this.fileSize){
                groups.push([i])
                groups_size.push(file_size_list[i])
            }else{
                groups[groups.length-1].push(i)
                groups_size[groups_size.length-1]+=file_size_list[i]
            }
        }
        console.log("groups calculate over")
        // console.log(groups)
        // console.log(groups_size)
        var self = this
        var index = -1
        var pack = setInterval(function(){
            if(++index===groups.length){//groups.length
                console.log("export over")
                clearInterval(pack)
                return
            }
            console.log(index+"/"+groups.length)
            var pack_group = groups[index]
            var group = new THREE.Group()
            for(let i=0; i<pack_group.length; i++){
                var p = pack_group[i]
                group.add(self.newMeshList[p].clone())
            }
            var scene = new THREE.Scene()
            scene.add(group)
            exportToGLTF(scene,"model"+index.toString()+".gltf")
        },300)
    }
    addMyUI(){
        var ui = new MyUI()
        var width = window.innerWidth
        var height = window.innerHeight

        var camera_pos = [
            new THREE.Vector3(-325.6,193.7,557.7),
            new THREE.Vector3(363.8,100.5,153.3),
            new THREE.Vector3(-273.2,62.1,241.5),
            new THREE.Vector3(-35.3,96.7,-176.7),
            new THREE.Vector3(252.5,142.7,310.6),
            new THREE.Vector3(287.0,69.8,-295.7),
            new THREE.Vector3(-718.8,47.5,-250.5),
        ]
        var camera_tar = [
            new THREE.Vector3(0,0,0),
            new THREE.Vector3(302.4,35.3,191.6),
            new THREE.Vector3(-254.0,35.3,207.0),
            new THREE.Vector3(-158.1,35.3,45.8),
            new THREE.Vector3(168.1,35.3,456.4),
            new THREE.Vector3(191.1,35.3,-184.4),
            new THREE.Vector3(-599.3,35.3,-222.8),
        ]
        var inf = {
            '1st':0,
            '2nd':1,
            '3rd':2,
            '4th':3,
            '5th':4,
            '6th':5,
            '7th':6
        }

        var self = this
        var names = Object.keys(inf)
        for(let i=0; i<names.length; i++){
            new ui.Button(names[i], "#666666", '#444444', '#DDDDDD',
                height/30, width/150,
                width/12, height/20,
                height/90,height*(14-names.length+i)/15,()=>{
                    var id = inf[names[i]]
                    self.camera.position.copy(camera_pos[id].clone())
                    self.camera.lookAt(camera_tar[id].clone())
                    self.orbitControl.target = camera_tar[id].clone()
                })
        }

        var route = [
            new THREE.Vector3(53.0,16.1,-272.6),
            new THREE.Vector3(148.9,16.1,-257.8),
            new THREE.Vector3(264.0,16.1,-195.6),
            new THREE.Vector3(333.1,16.1,-103.7),
            new THREE.Vector3(367.6,16.1,-3.9),
            new THREE.Vector3(390.6,16.1,122.6),
            new THREE.Vector3(363.8,16.1,329.8),
            new THREE.Vector3(313.9,16.1,521.6),
            new THREE.Vector3(183.4,16.1,479.4),
            new THREE.Vector3(37.6,16.1,398.8),
            new THREE.Vector3(-100.5,16.1,314.4),
            new THREE.Vector3(-215.6,16.1,241.5),
            new THREE.Vector3(-227.2,16.1,184.0),
            new THREE.Vector3(-219.5,16.1,91.9),
            new THREE.Vector3(-161.9,16.1,-11.7),
            new THREE.Vector3(-146.6,16.1,-61.6),
            new THREE.Vector3(-238.7,16.1,-153.7),
            new THREE.Vector3(-204.1,16.1,-207.4),
            new THREE.Vector3(-403.7,16.1,-341.7),
            new THREE.Vector3(-649.2,16.1,-383.9),
            new THREE.Vector3(-645.4,16.1,-218.9),
            new THREE.Vector3(-561.0,16.1,134.1),
            new THREE.Vector3(459.7,169.6,-238.1),
            new THREE.Vector3(6.9,35.3,95.7)
        ]

        this.wanderControl = new WanderControl(this.camera, route, 5)

        new ui.Button("自动漫游", "#CC8800", '#AA8800', '#DDCC44',
            height/30, width/150,
            width/12, height/20,
            height/90,height/15*14,()=>{
                if(!this.wanderControl.wander){
                    this.wanderControl.init()
                    this.wanderControl.startWander()
                }
                else{
                    this.wanderControl.wander = false
                }
            })
    }
    buildTree(){
        // let cells = []
        // let trees = []
        //
        // const customizeTree = new CustomizeTree()
        // const treeObj = customizeTree.getTree("法国梧桐")
        // const builder = new TreeBuilder(treeObj, true)
        //
        // let index_arr = mesh.geometry.index.array
        // let position_arr = mesh.geometry.attributes.position.array
        // for(let i=0; i<index_arr.length; i+=3){
        //     let p1 = new THREE.Vector3(position_arr[index_arr[i]*3], position_arr[index_arr[i]*3+1], position_arr[index_arr[i]*3+2])
        //     let p2 = new THREE.Vector3(position_arr[index_arr[i+1]*3], position_arr[index_arr[i+1]*3+1], position_arr[index_arr[i+1]*3+2])
        //     let p3 = new THREE.Vector3(position_arr[index_arr[i+2]*3], position_arr[index_arr[i+2]*3+1], position_arr[index_arr[i+2]*3+2])
        //     let triangle = new THREE.Triangle(p1,p2,p3)
        //     let l12 = p2.clone().sub(p1)
        //     let l13 = p3.clone().sub(p1)
        //     let area = triangle.getArea()/200
        //     for(let j=0; j<area && area>1; j++){
        //         if(j+Math.random()<area){
        //             let x = Math.random()
        //             let y = Math.random()
        //             if(x+y>1){
        //                 x = 1-x
        //                 y = 1-y
        //             }
        //             let point = p1.clone().add(l12.clone().multiplyScalar(x)).add(l13.clone().multiplyScalar(y))
        //             // let skeleton = builder.buildSkeleton()
        //             // let tree = builder.buildTree(skeleton)
        //             // tree.position.copy(point)
        //             // tree.scale.set(0.06,0.06,0.06)
        //             // this.scene.add(tree)
        //             cells.push(point)
        //             // trees.push(tree)
        //         }
        //     }
        // }
        // // console.log(cells.length)
        //
        // let skeleton = builder.buildSkeleton()
        // let tree = builder.buildTree(skeleton)
        // // console.log(tree)
        // let instancedMeshGroup = new THREE.Group()
        // let instancedMeshes = []
        // tree.children.forEach((child) => {
        //     // console.log(child.material.alphaTest)
        //     child.material.alphaTest = 0.25
        //     instancedMeshes.push(
        //         new THREE.InstancedMesh(child.geometry, child.material, cells.length)
        //     )
        // })
        // for(let i=0; i<cells.length; i++){
        //     let matrix = new THREE.Matrix4()
        //     matrix.makeRotationY(Math.random()*Math.PI)
        //     matrix.multiply(new THREE.Matrix4().makeScale(0.06,0.06,0.06))
        //     matrix.setPosition(cells[i].x, cells[i].y, cells[i].z)
        //     instancedMeshes.forEach((instancedMesh) => {
        //         instancedMesh.setMatrixAt(i, matrix)
        //     })
        // }
        // instancedMeshGroup.add(...instancedMeshes)
        // this.scene.add(instancedMeshGroup)
        //
        // document.addEventListener('dblclick', (event)=>{
        //     let pointer = new THREE.Vector2().set(
        //         (event.clientX / window.innerWidth) * 2 - 1,
        //         -(event.clientY / window.innerHeight) * 2 + 1
        //     )
        //     let raycaster = new THREE.Raycaster()
        //     raycaster.setFromCamera(pointer, this.camera)
        //     const intersects = raycaster.intersectObjects(this.scene.children, false)
        //     if(intersects.length > 0){
        //         let cell = intersects[0].point
        //         // console.log("new THREE.Vector3("+cell.x.toFixed(2)+","+cell.y.toFixed(2)+","+cell.z.toFixed(2)+"),")
        //         let skeleton = builder.buildSkeleton()
        //         let tree = builder.buildTree(skeleton)
        //         tree.position.copy(intersects[0].point)
        //         tree.scale.set(0.06,0.06,0.06)
        //         this.scene.add(tree)
        //         cells.push(cell)
        //         trees.push(tree)
        //     }
        // })
        // window.back=()=>{
        //     let index = cells.length-1
        //     this.scene.remove(trees[index])
        //     cells.splice(index,1)
        //     trees.splice(index,1)
        // }
        // window.exportCells=()=>{
        //     for(let i=0; i<cells.length; i++){
        //         let cell = cells[i]
        //         let raycaster = new THREE.Raycaster(cell.clone().add(new THREE.Vector3(0,1,0)),new THREE.Vector3(0,1,0))
        //         let result = raycaster.intersectObjects(this.meshes)
        //         if(result.length){
        //             cells.splice(i,1)
        //             i--
        //         }
        //     }
        //
        //     let myBlob=new Blob([JSON.stringify(cells)], { type: 'text/plain' })
        //     let link = document.createElement('a')
        //     link.href = URL.createObjectURL(myBlob)
        //     link.download = "tree_pos.json"
        //     link.click()
        // }

        var self = this
        new THREE.FileLoader().load("assets/tree_pos.json", (json)=>{
            let cells = JSON.parse(json)

            const customizeTree = new CustomizeTree()
            const treeObj = customizeTree.getTree("法国梧桐")
            const builder = new TreeBuilder(treeObj, true)

            let skeleton = builder.buildSkeleton()
            let tree = builder.buildTree(skeleton)
            console.log(tree)
            let instancedMeshGroup = new THREE.Group()
            let instancedMeshes = []
            tree.children.forEach((child) => {
                // console.log(child.material.alphaTest)
                child.material.alphaTest = 0.25
                instancedMeshes.push(
                    new THREE.InstancedMesh(child.geometry, child.material, cells.length)
                )
            })
            for(let i=0; i<cells.length; i++){
                let matrix = new THREE.Matrix4()
                matrix.makeRotationY(Math.random()*Math.PI)
                matrix.multiply(new THREE.Matrix4().makeScale(0.06,0.06,0.06))
                matrix.setPosition(cells[i].x, cells[i].y, cells[i].z)
                instancedMeshes.forEach((instancedMesh) => {
                    instancedMesh.setMatrixAt(i, matrix)
                })
                instancedMeshes[0].setColorAt(i, new THREE.Color(0.4+Math.random()*0.2,0.3+Math.random()*0.2,0.1+Math.random()*0.1))
                instancedMeshes[1].setColorAt(i, new THREE.Color(0,0.4+Math.random()*0.4,0))
            }
            instancedMeshGroup.add(...instancedMeshes)
            self.scene.add(instancedMeshGroup)
        })
    }
}

function quickSort(arr_1, arr_2, begin, end) {
    if(begin >= end)
        return;
    var l = begin;
    var r = end;
    var temp = arr_1[begin];
    while(l < r) {
        while(l < r && arr_1[r] <= temp)
            r --;
        while(l < r && arr_1[l] >= temp)
            l ++;
        [arr_1[l], arr_1[r]] = [arr_1[r], arr_1[l]];
        [arr_2[l], arr_2[r]] = [arr_2[r], arr_2[l]];
    }
    [arr_1[begin], arr_1[l]] = [arr_1[l], arr_1[begin]];
    [arr_2[begin], arr_2[l]] = [arr_2[l], arr_2[begin]];
    quickSort(arr_1, arr_2, begin, l - 1);
    quickSort(arr_1, arr_2, l + 1, end);
}

function exportToGLTF(scene,name){
    new GLTFExporter().parse(scene,function(result){
        var myBlob=new Blob([JSON.stringify(result)], { type: 'text/plain' })
        let link = document.createElement('a')
        link.href = URL.createObjectURL(myBlob)
        link.download = name
        link.click()
    })
}

document.addEventListener('DOMContentLoaded', () => {
    new Loader(document.body)
})
