import * as vector from 'vector.js'
import * as intersectinfo from 'intersectInfo.js'

const eye = [0, 0, 0];
const FOV = 1.0;
const xs = 512, ys = 512;
const nrTypes = 2;                  //2 Object Types (Sphere = 0, Plane = 1)
const nrObjects = [2,5];
const spheres = [[1.0,0.0,4.0,0.5],[-0.6,-1.0,4.5,0.5]];
const planes  = [[0, 1.5],[1, -1.5], [0, -1.5], [1, 1.5], [2,5.0]];
//plane
let inters_info = new intersectinfo(-1, -1, 999999)
function intersectSphere(index, ray, origin) {
    let center = spheres[index].slice(0, 3)
    let dir = vector.normalize(ray)
    let radius = spheres[index][3]
    let oc = vector.sub3(origin, spheres[index])
    let b = vector.dot3(oc, dir) * -2
    let a = 1
    let c = vector.dot3(oc, oc) - radius * radius
    let delta = b * b - 4 * a * c
    if (delta > 0) {
        let sign = (c < 0) ? 1 : -1
        let distance = (-b + sign * Math.sqrt(delta)) / (2 * a)
        inters_info.checkDistance(0, index, distance)
    }

}
function intersectPlane(index,ray,origin){
    function sameSide(A, B, C, P) {
        let AB = vector.sub3(B, A)
        let AC = vector.sub3(C, A)
        let AP = vector.sub3(P, A)

        let v1 = vector.cross(AB, AC)
        let v2 = vector.cross(AB, AP)
        return vector.dot3(v1, v2) >= 0
    }
    let norm = vector.cross(vector.sub3(planes[index][0], planes[index][1]), vector.sub3(planes[index][0], planes[index][1]))
    let d = -(norm[0] * planes[index][0][0] + norm[1] * planes[index][0][1] + norm[2] * planes[index][0][2])
    let dir = vector.normalize(ray)
    let distance = -(norm[0] * origin[0] + norm[1] * origin[1] + norm[2] * origin[2]) / (norm[0] * dir[0] + norm[1] * dir[1] + norm[2] * dir[2])
    if (distance > 0) {
        let p = vector.add3(origin, vector.multi(dir, distance))
        if (sameSide(planes[index][0], planes[index][1], planes[index][2], p)
            && sameSide(planes[index][1], planes[index][2], planes[index][0], p)
            && sameSide(planes[index][2], planes[index][0], planes[index][1], p) ) {
            inters_info.checkDistance(1, index, distance)
        }
    }
}



function intersectObject(type, index, ray, origin) { //type 类型，index 序号
    if (type == 0) {
        intersectSphere(index, ray, origin)
    } else if (type == 1) {
        intersectPlane(index, ray, origin)
    }
}
function rayTrace(ray, origin) { //ray 射线，origin 出发点
    for (let i = 0; i < nrTypes; i ++) {
        for (let j = 0; j < nrObjects[i]; j ++) {
            intersectObject(i, j, ray, origin)
        }
    }
}
function computePixelColor(x, y) {
    let ray = [x/xs - 0.5, -(y/ys - 0.5), FOV]
}
