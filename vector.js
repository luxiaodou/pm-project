export function dot3 (v1,v2) {
	return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
}

export function add3 (v1, v2) {
	return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]]
}

export function sub3 (v1, v2) {
	return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]]
}

export function multi(v, scalar) {
	for (let i = 0; i< 3; i++) {
		v[i] *= scalar
	}
}

export function divide(v, scalar) {
	multi(v, 1 / scalar)
}

export function getLength (v) {
	return Math.sqrt(dot3(v,v))
}

export function normalize(v) {
	const length = getLength(v)
	if (length === 0)
		return
	for(let i = 0; i<3; i++) {
		v[i] /= length
	}
}

export function cross(v1, v2) {
	return [
		v1[1] * v2[2] - v1[2] * v2[1],
		v1[2] * v2[0] - v1[0] * v2[2],
		v1[0] * v2[1] - v1[1] * v2[0]
	]
}

export function reverse(v) {
	return [-v[0], -v[1], -v[2]]
}

