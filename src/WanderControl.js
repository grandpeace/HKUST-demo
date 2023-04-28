import {Vector3} from 'three';

class WanderControl{
    constructor(camera, route, speed) {
        this.camera = camera
        this.route = route
        this.speed = speed
        this.wander = false
        this.color = []
        this.pointNum = []
        this.cal_depth_map = null
        this.target = 0
        this.remainTime = 0
        this.direction = new Vector3()
        this.rotate = false
        this.rotateTime1 = 0
        this.rotateTime2 = 0
        this.lookDir = new Vector3()
        this.rotateDir = new Vector3()
    }
    init(){
        //console.log(this.speed)
        this.wander = true
        this.target = 1
        var dx = this.route[this.target].x - this.route[this.target-1].x
        var dy = this.route[this.target].y - this.route[this.target-1].y
        var dz = this.route[this.target].z - this.route[this.target-1].z
        var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        this.remainTime = 60*distance/this.speed
        this.direction = new Vector3(dx/this.remainTime, dy/this.remainTime, dz/this.remainTime)
        this.rotate = false
        this.rotateTime1 = 0
        this.rotateTime2 = 0
        this.lookDir = new Vector3()
        this.rotateDir = new Vector3()
    }
    startWander(){
        var self = this
        if(self.route.length<3){
            console.log("Route Error")
            return
        }
        self.camera.position.copy(self.route[0])
        self.camera.lookAt(self.route[1])
        function wandering(){
            if(!self.wander)
                return
            if(self.remainTime<=0){
                if(self.target+1<self.route.length-2){
                    self.rotate = true
                    var v1 = self.route[self.target].clone().sub(self.route[self.target-1]).normalize()
                    var v2 = self.route[self.target+1].clone().sub(self.route[self.target])
                    v1 = new Vector3(v1.x*v2.length(),v1.y*v2.length(),v1.z*v2.length())

                    var v21 = v2.clone(); v21.y = v1.y
                    var v12 = v1.clone(); v12.x = v2.x; v12.z = v2.z

                    var CosineValue1 = v1.dot( v21 ) /(v1.length()*v21.length())
                    self.rotateTime1 = Math.acos(CosineValue1)*180/Math.PI*2
                    var CosineValue2 = v12.dot( v2 ) /(v12.length()*v2.length())
                    self.rotateTime2 = Math.acos(CosineValue2)*180/Math.PI*2
                    self.lookDir = new Vector3(
                        self.route[self.target].x+v1.x,
                        self.route[self.target].y+v1.y,
                        self.route[self.target].z+v1.z
                    )
                    self.camera.lookAt(self.lookDir)
                    self.rotateDir = v2.clone().sub(v1)
                    self.rotateDir.x /= self.rotateTime1
                    self.rotateDir.y /= self.rotateTime2
                    self.rotateDir.z /= self.rotateTime1
                    //console.log(self.rotateTime,self.rotateDir)
                    requestAnimationFrame(rotating1)
                } else {
                    console.log("end wander")
                    //clearInterval(self.cal_depth_map);
                    self.camera.position.copy(self.route[self.target+1])
                    self.camera.lookAt(self.route[self.target+2])
                    self.target = 0
                    self.wander = false
                }
            } else {
                self.camera.position.x += self.direction.x
                self.camera.position.y += self.direction.y
                self.camera.position.z += self.direction.z
                self.remainTime--
                requestAnimationFrame(wandering)
            }
        }
        function rotating1(){
            if(self.rotateTime1>0){
                self.lookDir.x += self.rotateDir.x
                // self.lookDir.y += self.rotateDir.y
                self.lookDir.z += self.rotateDir.z
                self.rotateTime1--
                self.camera.lookAt(self.lookDir)
                requestAnimationFrame(rotating1)
            } else {
                requestAnimationFrame(rotating2)
            }
        }
        function rotating2(){
            if(self.rotateTime2>0){
                self.lookDir.y += self.rotateDir.y
                self.rotateTime2--
                self.camera.lookAt(self.lookDir)
                requestAnimationFrame(rotating2)
            } else {
                self.target++
                self.camera.lookAt(self.route[self.target])
                var dx = self.route[self.target].x - self.route[self.target-1].x
                var dy = self.route[self.target].y - self.route[self.target-1].y
                var dz = self.route[self.target].z - self.route[self.target-1].z
                var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                self.remainTime = 60*distance/self.speed
                self.direction = new Vector3(dx/self.remainTime, dy/self.remainTime, dz/self.remainTime)
                requestAnimationFrame(wandering)
            }
        }
        wandering()
    }
}

export{WanderControl}
