// var points = [
// 	{x: 1, y: 2},
// 	{x: 3, y: 4},
// 	{x: 5, y: 6},
// 	{x: 7, y: 8}
// ];
//
// var distance = function(a, b){
// 	return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2);
// }
//
// var tree = new kdTree(points, distance, ["x", "y"]);
//
// var nearest = tree.nearest({ x: 5, y: 5 }, 2);
//
// console.log(nearest);
import * as vector from './vector.js'
import {IntersectInfo} from './intersectInfo.js'
import {Draw} from './draw.js'

const eye = [0, 0, 0];
const FOV = 1.0;
const xs = 512, ys = 512;
const nrTypes = 2;                  //2 Object Types (Sphere = 0, Plane = 1)
const nrObjects = [2,2];
const spheres = [[1.0,0.0,4.0,0.5],[-0.6,-1.0,4.5,0.5]];
//const planes  = [[0, 1.5],[1, -1.5], [0, -1.5], [1, 1.5], [2,5.0]];
const planes = [
                // [[1.5, -1.5, 5], [-1.5, -1.5, 5], [1.5, 1.5, 5]],
                // [[1.5, 1.5, 5], [-1.5, -1.5, 5], [-1.5, 1.5, 5]],
                [[1.5, -1.5, 5], [1.5, 1.5, 5], [1.5, -1.5, 0]],
                [[1.5, -1.5, 0], [1.5, 1.5, 5], [1.5, 1.5, 0]],
                // [[-1.5, -1.5, 5], [-1.5, 1.5, 5], [-1.5, -1.5, 0]],
                // [[-1.5, -1.5, 0], [-1.5, 1.5, 5], [-1.5, 1.5, 0]],
                // [[1.5, 1.5, 5], [-1.5, 1.5, 5], [1.5, 1.5, 0]],
                // [[1.5, 1.5, 0], [-1.5, 1.5, 5], [-1.5, 1.5, 0]],
                // [[1.5, -1.5, 5], [-1.5, -1.5, 5], [1.5, -1.5, 0]],
                // [[1.5, -1.5, 0], [-1.5, -1.5, 5], [-1.5, -1.5, 0]]
]
const light = [0.0, 1.2, 3.75]
const ambient = 0.1
let inters_info = new IntersectInfo(-1, -1, 999999)
let draw = new Draw(xs, ys)
function intersectSphere(index, ray, origin) {
    let dir = vector.normalize(ray)
    let radius = spheres[index][3]
    let oc = vector.sub3(spheres[index], origin)
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
    let norm = vector.cross(vector.sub3(planes[index][0], planes[index][1]), vector.sub3(planes[index][0], planes[index][2]))
    norm = vector.normalize(norm)
    let d = -(norm[0] * planes[index][0][0] + norm[1] * planes[index][0][1] + norm[2] * planes[index][0][2])
    let dir = vector.normalize(ray)

    let distance = (vector.dot3(norm, origin) + d) / Math.abs(vector.dot3(dir, norm))
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
    if (type === 0) {
        intersectSphere(index, ray, origin)
    } else if (type === 1) {
        intersectPlane(index, ray, origin)
    }
}
function rayTrace(ray, origin) { //ray 射线，origin 出发点
    inters_info = new IntersectInfo(-1, -1, 999999)
    for (let i = 0; i < nrTypes; i ++) {
        for (let j = 0; j < nrObjects[i]; j ++) {
            intersectObject(i, j, ray, origin)
        }
    }
}
function computePixelColor(x, y) {
    let color = [0, 0, 0]
    let ray = [x/xs - 0.5, -(y/ys - 0.5), FOV]
    rayTrace(ray, eye)

    if (inters_info.index !== -1) {
        ray = vector.normalize(ray)
        let point = vector.add3(eye, vector.multi(ray, inters_info.distance))
        let c = ambient
        let eye_trace_index = inters_info.index
        let eye_trace_type = inters_info.type
        rayTrace(vector.sub3(point, light), light)
        if (eye_trace_index === inters_info.index && eye_trace_type === inters_info.type)
            c = lightOnObject(eye_trace_type, eye_trace_index, point)
        color[0] = color[1] = color[2] = c
        color = getColor(color,eye_trace_type,eye_trace_index);
    }
    return color
}
function getNormal(type, index, p) {
    if (type === 0) {
        return vector.normalize(vector.sub3(p, spheres[index]))
    } else {
        let AB = vector.sub3(planes[index][0], planes[index][1])
        let AC = vector.sub3(planes[index][0], planes[index][2])
        let norm = vector.normalize(vector.cross(AB, AC))
        return norm
    }
}
function lightOnObject(type, index, p) {
    let i = diffuseLight(getNormal(type, index, p), p, type)
    return Math.min(1.0, Math.max(i, ambient))
}
function diffuseLight(n, p, type) {
    let l = vector.normalize(vector.sub3(light, p))
    if (type === 0)
        return vector.dot3(n, l)
    else {
        let e = vector.normalize(vector.sub3(eye, p))
        let nl = vector.dot3(n, l)
        let ne = vector.dot3(n, e)
        if (nl * ne > 0 && nl > 0)
            return nl
        else if (nl * ne > 0 && nl < 0)
            return -nl
        else
            return 0
    }

}
function filterColor(rgbIn, r, g, b) { //e.g. White Light Hits Red Wall
    let rgbOut = [r, g, b];
    for (let c=0; c<3; c++)
        rgbOut[c] = Math.min(rgbOut[c],rgbIn[c]); //Absorb Some Wavelengths (R,G,B)
    return rgbOut;
}

function getColor(rgbIn, type, index){ //Specifies Material Color of Each Object
    // if (type === 1 && index === 0) {
    //     return filterColor(rgbIn, 0.0, 1.0, 0.0);
    // } else if (type === 1 && index === 2) {
    //     return filterColor(rgbIn, 1.0, 0.0, 0.0);
    // } else {
    //     return filterColor(rgbIn, 1.0, 1.0, 1.0);
    // }
    return filterColor(rgbIn, 1.0, 1.0, 1.0)
}
function render() {
    for (let i = 0; i < xs; i ++) {
        for (let j = 0; j < ys; j ++) {
            let preColor = computePixelColor(i,j)
            let rgb = vector.multi(preColor, 255.0);
            draw.stroke(rgb[0],rgb[1],rgb[2]);
            draw.fill(rgb[0],rgb[1],rgb[2]);  //Stroke & Fill
            draw.rect(i,j,i + 1,j + 1);

        }
    }
}

render()
