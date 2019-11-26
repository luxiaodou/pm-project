export class PhotonMap {
	constructor () {
		let points = []
		let distance = function(a, b){
			return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2);
		}
		this.tree = new kdTree(points, distance, ["x", "y", "z"]);

	}
}
