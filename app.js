// var points = [
// 	{x: 1, y: 2, z: 3, rgb: [1,1,1]},
// 	{x: 3, y: 4, z: 3, rgb: [1,1,1]},
// 	{x: 5, y: 6, z: 4, rgb: [1,1,1]},
// 	{x: 7, y: 8, z: 4, rgb: [1,1,1]}
// ];
//
// var distance = function(a, b){
// 	return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2);
// }
//
// var tree = new kdTree(points, distance, ["x", "y", "z"]);
//
// var nearest = tree.nearest({ x: 5, y: 5, z: 5 }, 2, 15);
//
// console.log(nearest);
import * as vector from './vector.js'
import { IntersectInfo } from './intersectInfo.js'
import { Draw } from './draw.js'

const eye = [0, 0, 0]
const FOV = 1.0
const xs = 512, ys = 512
const nrTypes = 2                  //2 Object Types (Sphere = 0, Plane = 1)
const spheres = [[1.0, 0.0, 4.0, 0.5], [-0.6, -1.0, 4.5, 0.5]]
const nrObjects = [2, 12]
const planes = [
	[[1.5, -1.5, 5], [-1.5, -1.5, 5], [1.5, 1.5, 5]],
	[[1.5, 1.5, 5], [-1.5, -1.5, 5], [-1.5, 1.5, 5]],
	[[1.5, -1.5, 5], [1.5, 1.5, 5], [1.5, -1.5, 0]],
	[[1.5, -1.5, 0], [1.5, 1.5, 5], [1.5, 1.5, 0]],
	[[-1.5, -1.5, 5], [-1.5, 1.5, 5], [-1.5, -1.5, 0]],
	[[-1.5, -1.5, 0], [-1.5, 1.5, 5], [-1.5, 1.5, 0]],
	[[1.5, 1.5, 5], [-1.5, 1.5, 5], [1.5, 1.5, 0]],
	[[1.5, 1.5, 0], [-1.5, 1.5, 5], [-1.5, 1.5, 0]],
	[[1.5, -1.5, 5], [-1.5, -1.5, 5], [1.5, -1.5, 0]],
	[[1.5, -1.5, 0], [-1.5, -1.5, 5], [-1.5, -1.5, 0]],
	[[1.5, 1.5, 0], [-1.5, -1.5, 0], [1.5, -1.5, 0]],
	[[1.5, 1.5, 0], [-1.5, -1.5, 0], [-1.5, 1.5, 0]],
]
// const nrObjects = [2,2];
//
// const planes = [
//     [[-1.5, -1.5, 5], [-1.5, 1.5, 5], [-1.5, -1.5, 0]],
//     [[-1.5, -1.5, 0], [-1.5, 1.5, 5], [-1.5, 1.5, 0]],
// ]
const light = [0.0, 1.2, 3.75]
const ambient = 0.1
let inters_info = new IntersectInfo(-1, -1, 999999)
let isPhotonMap = false

let drawMapFlag = false
let photonFlag = false

function intersectSphere (index, ray, origin) {
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

function intersectPlane (index, ray, origin) {
	function sameSide (A, B, C, P) {
		let AB = vector.sub3(B, A)
		let AC = vector.sub3(C, A)
		let AP = vector.sub3(P, A)

		let v1 = vector.cross(AB, AC)
		let v2 = vector.cross(AB, AP)
		return vector.dot3(v1, v2) >= -1e-5
	}

	let norm = vector.cross(vector.sub3(planes[index][0], planes[index][1]), vector.sub3(planes[index][0], planes[index][2]))
	norm = vector.normalize(norm)
	let d = -(norm[0] * planes[index][0][0] + norm[1] * planes[index][0][1] + norm[2] * planes[index][0][2])
	let dir = vector.normalize(ray)

	let distance = Math.abs((vector.dot3(norm, origin) + d) / vector.dot3(dir, norm))
	let point = vector.add3(origin, vector.multi(dir, distance))
	let res = vector.dot3(point, norm) + d
	if (res < 1e-5 && res > -1e-5) {
		let p = vector.add3(origin, vector.multi(dir, distance))
		if (sameSide(planes[index][0], planes[index][1], planes[index][2], p)
			&& sameSide(planes[index][1], planes[index][2], planes[index][0], p)
			&& sameSide(planes[index][2], planes[index][0], planes[index][1], p)) {
			inters_info.checkDistance(1, index, distance)
		}
	}
}

function intersectObject (type, index, ray, origin) { //type 类型，index 序号
	if (type === 0) {
		intersectSphere(index, ray, origin)
	} else if (type === 1) {
		intersectPlane(index, ray, origin)
	}
}

function rayTrace (ray, origin) { //ray 射线，origin 出发点
	inters_info = new IntersectInfo(-1, -1, 999999)
	for (let i = 0; i < nrTypes; i++) {
		for (let j = 0; j < nrObjects[i]; j++) {
			intersectObject(i, j, ray, origin)
		}
	}
}

function computePixelColor (x, y) {
	if (x === 190 && y === 44)
		console.log('stop')
	let color = [0, 0, 0]
	let ray = [x / xs - 0.5, -(y / ys - 0.5), FOV]
	ray = vector.normalize(vector.sub3(ray, eye))
	rayTrace(ray, eye)

	if (inters_info.index !== -1) {

		let point = vector.add3(eye, vector.multi(ray, inters_info.distance))
		if (isPhotonMap) {
			color = gather(point, inters_info.type, inters_info.index)
		} else {
			let c = ambient
			let eye_trace_index = inters_info.index
			let eye_trace_type = inters_info.type
			rayTrace(vector.sub3(point, light), light)
			if (eye_trace_index === inters_info.index && eye_trace_type === inters_info.type)
				c = lightOnObject(eye_trace_type, eye_trace_index, point)
			color[0] = color[1] = color[2] = c
			color = getColor(color, eye_trace_type, eye_trace_index)
		}
	}
	return color
}

function getNormal (type, index, p) {
	if (type === 0) {
		return vector.normalize(vector.sub3(p, spheres[index]))
	} else {
		let AB = vector.sub3(planes[index][0], planes[index][1])
		let AC = vector.sub3(planes[index][0], planes[index][2])
		let norm = vector.normalize(vector.cross(AB, AC))
		return norm
	}
}

function lightOnObject (type, index, p) {
	let i = diffuseLight(getNormal(type, index, p), p, type)
	return Math.min(1.0, Math.max(i, ambient))
}

function diffuseLight (n, p, type) {
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

function filterColor (rgbIn, r, g, b) { //e.g. White Light Hits Red Wall
	let rgbOut = [r, g, b]
	for (let c = 0; c < 3; c++)
		rgbOut[c] = Math.min(rgbOut[c], rgbIn[c]) //Absorb Some Wavelengths (R,G,B)
	return rgbOut
}

function getColor (rgbIn, type, index) { //Specifies Material Color of Each Object
	if (type === 1 && index === 2 || type === 1 && index === 3) {
		return filterColor(rgbIn, 0.0, 1.0, 0.0)
	} else if (type === 1 && index === 4 || type === 1 && index === 5) {
		return filterColor(rgbIn, 1.0, 0.0, 0.0)
	} else {
		return filterColor(rgbIn, 1.0, 1.0, 1.0)
	}
	// return filterColor(rgbIn, 1.0, 1.0, 1.0)
}

function render () {
	console.log('rendering')
	for (let i = 0; i < xs; i++) {
		for (let j = 0; j < ys; j++) {
			let preColor = computePixelColor(i, j)
			let rgb = vector.multi(preColor, 255.0)
			draw.stroke(rgb[0], rgb[1], rgb[2])
			draw.fill(rgb[0], rgb[1], rgb[2])  //Stroke & Fill
			draw.rect(i, j, 1, 1)
		}
	}
}

// PHOTON MAPPING
let distance = function (a, b) {
	return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
}
let tree = new KdTree([], distance, ['x', 'y', 'z'])
let numOfPhotons = 50000
let reflectRatio = 0.5
let shadow = vector.divide([-.25, -.25, -.25], numOfPhotons / 500)

function emitPhotons () {
	console.log('start')
	for (let i = 0; i < numOfPhotons; i++) {
		let sumEnergy = [1.0, 1.0, 1.0]
		let energy = vector.divide(sumEnergy, numOfPhotons / 500)
		let ray = vector.rand3(1.0)
		// while (vector.dot3(ray, ray) > 1.0) {
		// 	ray = vector.rand3(1.0)
		// }
		let prevPoint = light
		rayTrace(ray, prevPoint)

		while (inters_info.index !== -1) {
			let point = vector.add3(vector.multi(ray, inters_info.distance), prevPoint)
			energy = getColor(energy, inters_info.type, inters_info.index)
			tree.insert({
				x: point[0],
				y: point[1],
				z: point[2],
				direction: ray,
				color: energy,
				index: inters_info.index,
				type: inters_info.type
			})
			//drawPhoton(currentEnergy, point)
			// can draw photons
			let prev_type = inters_info.type
			let prev_index = inters_info.index
			shadowPhotons(ray, point)
			let rand = Math.random()
			if (rand < reflectRatio)
				break
			ray = reflect(ray, point, prev_type, prev_index)
			rayTrace(ray, point)
			prevPoint = point
		}
	}
}

function shadowPhotons (ray, point) {
	let newOrigin = vector.add3(point, vector.multi(ray, 0.01))
	rayTrace(ray, newOrigin)
	while (inters_info.index !== -1) {
		let shadowPoint = vector.add3(newOrigin, vector.multi(ray, inters_info.distance))
		tree.insert({
			x: shadowPoint[0],
			y: shadowPoint[1],
			z: shadowPoint[2],
			direction: ray,
			color: shadow,
			index: inters_info.index,
			type: inters_info.type
		})
		newOrigin = vector.add3(shadowPoint, vector.multi(ray, 0.01))
		rayTrace(ray, newOrigin)
	}
}

function reflect (ray, point, type, index) {
	let N = getNormal(type, index, point)
	let L = vector.reverse(ray)
	if (vector.dot3(N, L) < 0)
		N = vector.reverse(N)
	return vector.normalize(vector.sub3(vector.multi(N, 2 * vector.dot3(N, L)), L))
}

function gather (p, type, index) {
	let color = [0, 0, 0]
	let k = 1
	let radius = 0.7
	let nearest = tree.nearest({ x: p[0], y: p[1], z: p[2] }, 500, radius * radius)
	//let N = getNormal(type, index, p)
	for (let i = 0; i < nearest.length; i++) {
		let point = [nearest[i][0].x, nearest[i][0].y, nearest[i][0].z]
		let direction = nearest[i][0].direction
		let rgb = nearest[i][0].color
		let N = getNormal(nearest[i][0].type, nearest[i][0].index, point)
		let weight = 1 - Math.sqrt(nearest[i][1]) / (k * radius)
		weight *= Math.abs(vector.dot3(N, direction))
		color = vector.add3(color, vector.multi(rgb, weight))
	}
	color = vector.divide(color, (1 - 2 / (3 * k)) * Math.PI * radius * radius)
	return color
}

function drawPhoton (color, point) {
	if (point[2] > 0) {
		let x = (xs / 2) + ((xs * point[0] / point[2]) | 0)
		let y = (ys / 2) + ((ys * -point[1] / point[2]) | 0)
		if (y <= ys) {
			draw.stroke(color[0] * 255.0, color[1] * 255.0, color[2] * 255.0)
			draw.point(x, y)
		}
	}
}

// Interface & controlling parameters
let prevX = -9999, prevY = -9999, sphereIndex = -1
let currX = 0, currY = 0
let s = 130.0
let dragging = false

function mouseRelease () {
	console.log('release')
	prevX = -9999
	prevY = -9999
	dragging = false
}

function mousePress () {
	console.log('press')
}

function mouseDrag () {
	console.log('drag')
}

function changeMode (event, x) {
	if (i === 1 || x < 230) {

	} else if (i === 2 || x < 283) {

	} else if (i === 3 || x < xs) {

	}
}

function resetRender () {

}

function drawInterface () {
	draw.stroke(221, 221, 204)
	draw.fill(221, 221, 204)
	draw.rect(0, ys, xs, 48) //Fill Background with Page Color
}

function setup () {
	emitPhotons()
	resetRender()
	drawInterface()
}

function refresh () {
	console.log('refreshing!')
	render()
	window.requestAnimationFrame(refresh)
}

// Main logic
document.onkeydown = e => changeMode(e.key, 9999)
let draw = new Draw(xs, ys + 48)

draw.canvas.onmousedown = e => {
	currX = e.clientX
	currY = e.clientY
	mousePress()
}

draw.canvas.onmouseup = e => mouseRelease()

setup()
refresh()
