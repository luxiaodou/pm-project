import * as vector from './vector.js'
import { IntersectInfo } from './intersectInfo.js'
import { Draw } from './draw.js'

const eye = [0, 0, 0]
const FOV = 1.0
const xs = 512, ys = 512
const nrTypes = 2                  //2 Object Types (Sphere = 0, Plane = 1)
const spheres = [[1.0, 0.0, 4.5, 0.5], [-0.6, -1.0, 3.5, 0.5]]
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

function recursive (ray, point) {
	let isInGlass = false
	if (inters_info.type === 0 && inters_info.index === 0) {
		ray = reflect(ray, point, inters_info.type, inters_info.index)
		rayTrace(ray, point)
		if (inters_info.index !== -1) {
			point = vector.add3(point, vector.multi(ray, inters_info.distance))
		}
		return recursive(ray, point)
	} else if (inters_info.type === 0 && inters_info.index === 1) {
		let savedRay = ray
		let savedPoint = point
		let savedType = inters_info.type
		let savedIndex = inters_info.index
		ray = reflect(ray, point, inters_info.type, inters_info.index)
		rayTrace(ray, point)
		point = vector.add3(point, vector.multi(ray, inters_info.distance))
		let color = vector.multi(recursive(ray, point), 1 - refractRatio)
		ray = savedRay
		point = savedPoint
		inters_info.type = savedType
		inters_info.index = savedIndex
		while (inters_info.type === 0 && inters_info.index === 1) {
			if (!isInGlass)
				ray = refract(ray, point, inters_info.type, inters_info.index, refractivity)
			else
				ray = refract(ray, point, inters_info.type, inters_info.index, 1 / refractivity)
			isInGlass = !isInGlass
			rayTrace(ray, point)
			point = vector.add3(point, vector.multi(ray, inters_info.distance))
		}
		return vector.add3(vector.multi(recursive(ray, point), refractRatio), color)
	} else {
		return gather(point, inters_info.type, inters_info.index)
	}
}

function computePixelColor (x, y) {
	let color = [0, 0, 0]
	let ray = [x / xs - 0.5, -(y / ys - 0.5), FOV]
    let isInGlass = false
	ray = vector.normalize(vector.sub3(ray, eye))
	rayTrace(ray, eye)

	if (inters_info.index !== -1) {
        let point = vector.add3(eye, vector.multi(ray, inters_info.distance))

		if (photonFlag) {
			// while (true) {
			// 	if (inters_info.type === 0 && inters_info.index === 0) {
			// 		ray = reflect(ray, point, inters_info.type, inters_info.index)
			// 		rayTrace(ray, point)
			// 		if (inters_info.index !== -1) {
			// 			point = vector.add3(point, vector.multi(ray, inters_info.distance))
			// 		}
			// 	} else if (inters_info.type === 0 && inters_info.index === 1) {
			// 		if (!isInGlass)
			// 			ray = refract(ray, point, inters_info.type, inters_info.index, refractivity)
			// 		else
			// 			ray = refract(ray, point, inters_info.type, inters_info.index, 1 / refractivity)
			// 		isInGlass = !isInGlass
			// 		rayTrace(ray, point)
			// 		point = vector.add3(point, vector.multi(ray, inters_info.distance))
			// 	} else break
			// }

			color = recursive(ray, point)
			//color = gather(point, inters_info.type, inters_info.index)
		} else {
			while (true) {
				if (inters_info.type === 0 && inters_info.index === 0) {
					ray = reflect(ray, point, inters_info.type, inters_info.index)
					rayTrace(ray, point)
					if (inters_info.index !== -1) {
						point = vector.add3(point, vector.multi(ray, inters_info.distance))
					}
				} else break
			}
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
		return vector.normalize(vector.cross(AB, AC))
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

// PHOTON MAPPING
let distance = function (a, b) {
	return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
}

//let tree = new KdTree([], distance, ['x', 'y', 'z'])
let tree = [[], []]
let numOfPhotons = 50000
let reflectRatio = 0.5
let refractRatio = 0.9
let refractivity = 1.5
let shadow = vector.divide([-.1, -.1, -.1], numOfPhotons / 70)

function initTree() {
    for (let i = 0; i < nrTypes; i++) {
    	if (i === 0) {
			for (let j = 0; j < nrObjects[i]; j += 1) {
				tree[i].push(new KdTree([], distance, ['x', 'y', 'z']))
			}
		}
    	else if (i === 1) {
			for (let j = 0; j < nrObjects[i]; j += 2) {
				tree[i].push(new KdTree([], distance, ['x', 'y', 'z']))
			}
		}
    }
}

function emitPhotons () {
	console.log("start")
    initTree()
	for (let i = 0; i < numOfPhotons; i++) {
		let sumEnergy = [1.0, 1.0, 1.0]
		let energy = vector.divide(sumEnergy, numOfPhotons / 70)
        let ray = vector.rand3(1.0)
		let prevPoint = light
        let inGlassFlag = false
		rayTrace(ray, prevPoint)

		while (inters_info.index !== -1) {
			let point = vector.add3(vector.multi(ray, inters_info.distance), prevPoint)
			energy = getColor(energy, inters_info.type, inters_info.index)
            if (!(inters_info.type === 0)) {
                tree[inters_info.type][parseInt(inters_info.index / 2)].insert({
                    x: point[0],
                    y: point[1],
                    z: point[2],
                    direction: ray,
                    color: energy,
                    index: inters_info.index,
                    type: inters_info.type
                })
            }
			drawPhoton(energy, point)
			// can draw photons
			let prev_type = inters_info.type
			let prev_index = inters_info.index

			let rand = Math.random()
            if (prev_type === 0 && prev_index === 1) {
                if (rand > refractRatio) {
                    shadowPhotons(ray, point)
                    ray = reflect(ray, point, prev_type, prev_index)
                    rayTrace(ray, point)
                    prevPoint = point
                }
                else {
                    if (inGlassFlag)
                        ray = refract(ray, point, prev_type, prev_index, 1 / refractivity)
                    else
                        ray = refract(ray, point, prev_type, prev_index, refractivity)
                    inGlassFlag = !inGlassFlag
                    rayTrace(ray, point)
                    prevPoint = point
                }
            }
            else {
                shadowPhotons(ray, point)
                if (rand > reflectRatio)
                    break
                else {
                    ray = reflect(ray, point, prev_type, prev_index)
                    rayTrace(ray, point)
                    prevPoint = point
                }
            }
		}
	}
}

function shadowPhotons (ray, point) {
	let newOrigin = vector.add3(point, vector.multi(ray, 0.01))
	rayTrace(ray, newOrigin)

    while (inters_info.index !== -1) {
        let shadowPoint = vector.add3(newOrigin, vector.multi(ray, inters_info.distance))
        tree[inters_info.type][parseInt(inters_info.index / 2)].insert({
            x: shadowPoint[0],
            y: shadowPoint[1],
            z: shadowPoint[2],
            direction: ray,
            color: shadow,
            index: inters_info.index,
            type: inters_info.type
        })
        let shadowEnergy = [0,0,1.0]
        drawPhoton(shadowEnergy, shadowPoint)
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

function refract(ray, point, type, index, ratio=1.5) {
    let N = getNormal(type, index, point)
    let L = ray
    if (vector.dot3(N, L) > 0)
        N = vector.reverse(N)
    let theta1_cos = -vector.dot3(N, L)
    let theta2_cos = Math.sqrt(1 - (1 - ratio * ratio) * (1 - theta1_cos * theta1_cos))
    return vector.normalize(vector.add3(vector.divide(L, ratio), vector.multi(N, theta1_cos / ratio - theta2_cos)))
	//return vector.normalize(vector.add3(vector.multi(L, -ratio), vector.multi(N, ratio * theta1_cos - Math.sqrt(1 - ratio * ratio * (1 - theta1_cos * theta1_cos)))))
}

function gather (p, type, index) {
	let color = [0, 0, 0]
	let k = 1
	let radius = 0.7
	let nearest = tree[type][parseInt(index / 2)].nearest({x: p[0], y: p[1], z: p[2]}, 500, radius * radius)
	//let N = getNormal(type, index, p)
    let maxRadius = 0
    // for (let i = 0; i < nearest.length; i ++) {
    //     maxRadius = Math.max(maxRadius, nearest[i][1])
    // }
    // radius = Math.sqrt(maxRadius)
	for (let i = 0; i < nearest.length; i ++) {
		let point = [nearest[i][0].x, nearest[i][0].y, nearest[i][0].z]
		let direction = nearest[i][0].direction
		let rgb = nearest[i][0].color
		let N = getNormal(nearest[i][0].type, nearest[i][0].index, point)
		let weight = 1 - (Math.sqrt(nearest[i][1]) / (k * radius))
		weight *= Math.abs(vector.dot3(N, direction))
		color = vector.add3(color, vector.multi(rgb, weight))
	}
	color = vector.divide(color, (1 - 2 / (3 * k)) * Math.PI * radius * radius)
	//color = vector.divide(color, Math.PI * radius * radius)
    return color
}

// display & rendering parameters
let empty = true
let photonFlag = false
let mapFlag = false
let pixelRow = 0, pixelColomn = 0, pixelInteration = 0, pixelMax = 0

function resetRender () {
	pixelRow = 0
	pixelColomn = 0
	pixelInteration = 1
	pixelMax = 2
	empty = true
	tree = [[], []]
	if (photonFlag && !mapFlag)
		emitPhotons()
}

function drawPhoton (energy, point) {
	let m = vector.findMax(energy)
	let color = [0,0,0]
	if (m > 0)
		color = vector.divide(energy, m)
	if (mapFlag && point[2] > 0) {
		let x = (xs / 2) + ((xs * point[0] / point[2]) | 0)
		let y = (ys / 2) + ((ys * -point[1] / point[2]) | 0)
		if (y <= ys) {
			draw.stroke(color[0] * 255.0, color[1] * 255.0, color[2] * 255.0)
			draw.point(x, y)
		}
	}
}

function render () {
	//console.log('rendering')
	let i = 0
	let color = [0, 0, 0]

	while (i < (dragging ? 1024 : Math.max(pixelMax, 256))) {
		if (pixelColomn >= pixelMax) {
			pixelRow++
			pixelColomn = 0
			if (pixelRow >= pixelMax) {
				pixelInteration++
				pixelRow = 0
				pixelMax = Math.pow(2, pixelInteration)
			}
		}

		let x = pixelColomn * (xs / pixelMax)
		let y = pixelRow * (ys / pixelMax)
		pixelColomn++

		color = vector.multi(computePixelColor(x, y), 255.0)
		draw.strokeVector(color)
		draw.fillVector(color)
		draw.rect(x, y, (xs / pixelMax), (ys / pixelMax))

		i++
	}

	if (pixelRow === ys - 1)
		empty = false
}

function display () {
	if (mapFlag) {
		if (empty) {
			draw.stroke(0, 0, 0)
			draw.fill(0, 0, 0)
			draw.rect(0, 0, xs - 1, ys - 1)
			emitPhotons()
			empty = false
		}
	} else {
		if (empty)
			render()
	}
}

function refresh () {
	//console.log('refreshing!')
	display()
	window.requestAnimationFrame(refresh)
}

// Interface & interaction parameters
let prevX = -9999, prevY = -9999 // history mouse location
let currX = 0, currY = 0 // current mouse location
let sphereIndex = -1 // which sphere to move
let s = 130.0 //  mouse movement ratio w.r.t. sphere
let dragging = false // drag flag

/**
 * when mouse is released, reset parameters for next operation
 */
function mouseRelease () {
	console.log('release')
	prevX = -9999
	prevY = -9999
	dragging = false
}

/**
 * check if any of the sphere is clicked
 * @param v1 mouse location
 * @param v2 sphere location
 * @param distance sphere radius
 * @returns {boolean} if the sphere is clicked
 */
function isClicked (v1, v2, distance) {
	let c = vector.sub3(v1, v2)
	let d = vector.dot3(c, c)
	return d <= distance;
}

/**
 * when mouse is pressed, record which sphere / button is click
 */
function mousePress () {
	console.log('press')
	sphereIndex = -2 // if nothing is clicked, move the light
	let mouseLocation = [(currX - xs / 2) / s, -(currY - ys / 2) / s, (spheres[0][2] + spheres[1][2]) / 2]
	if (isClicked(mouseLocation, spheres[0], spheres[0][3]))
		sphereIndex = 0
	else if (isClicked(mouseLocation, spheres[1], spheres[1][3]))
		sphereIndex = 1

	if (currY > ys)
		changeMode('0', currX)
}

/**
 * when mouse is dragged, move the location of the sphere / light
 */
function mouseDrag () {
	if (prevX !== -9999 && sphereIndex !== -1) {
		if (sphereIndex === -2) {
			light[0] += (currX - prevX) /s
			light[0] = Math.max(Math.min(1.4, light[0]), -1.4)
			light[1] -= (currY - prevY) /s
			light[1] = Math.max(Math.min(1.4, light[1]), -1.4)
		}
		else if (sphereIndex < nrObjects[0]) {
			spheres[sphereIndex][0] += (currX - prevX) / s
			spheres[sphereIndex][1] -= (currY - prevY) / s
		}
		resetRender()
	}
	prevX = currX
	prevY = currY
	dragging = true
}

function changeMode (event, x) {
	if (event === '1' || x < 230) {
		mapFlag = false
		photonFlag = false
	} else if (event === '2' || x < 283) {
		mapFlag = false
		photonFlag = true
	} else if (event === '3' || x < xs) {
		mapFlag = true
	}
	if (x > xs) // ignore clicks out of border
		return
	resetRender()
	drawInterface()
}

/**
 * draw canvas footbar interface
 * including initialize background and fill text
 */
function drawInterface () {
	draw.stroke(221, 221, 204)
	draw.fill(200, 200, 200)
	draw.rect(0, ys, xs, 48)

	draw.fill(0, 0, 0)
	draw.context.fillText('Ray Tracing', 64, ys + 28)
	draw.fill(0, 0, 0)
	draw.context.fillText('Combined', 216, ys + 28)
	draw.fill(0, 0, 0)
	draw.context.fillText('Photon Map', 368, ys + 28)
}

function setup () {
	emitPhotons()
	resetRender()
	drawInterface()
}

// Main logic
document.onkeydown = e => changeMode(e.key, 9999)
let draw = new Draw(xs, ys + 48)

// setup clicking events
draw.canvas.onmousedown = e => {
	currX = e.clientX
	currY = e.clientY
	mousePress()
}

draw.canvas.onmouseup = e => {
	currX = e.clientX
	currY = e.clientY
	mouseRelease()
}

draw.canvas.onmousemove = e => {
	currX = e.clientX
	currY = e.clientY
	if (e.buttons > 0)
		mouseDrag()
}

// start rendering and keep refreshing
setup()
refresh()
