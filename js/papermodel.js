//
// Model for a piece of paper that can be bent and cut.
// vertices must be an array of PVector objects and faces
// must be an array of arrays of the form [i,j,k] where each
// element is the index of one of the vertices. If originalVertices
// is given, then they contain the original positions of the vertices, 
// i.e., before any operations that move vertices are applied.
//
function PaperModel(faces, vertices, originalVertices) {

	// hds is a halfedge data structure for the model
	this.hds = new HalfedgeDS (faces,vertices); 

	this.originalVertices = originalVertices;
	
	// Make a copy of vertices onto originalVertices in case this was not defined
	if (originalVertices == undefined) this.copyToOriginalVertices();
	else assert (originalVertices.length == vertices.length);

	// vecVertex is an array of vertex positions represented as THREE.Vector3 objects
	this.computeVectors();

	// edges is a collection of objects representing the edges of the paper
	// triangulation.
	this.edges = [];
	this.computeEdges();

	// Compute the components
	this.computeComponents();
}

// 
// Create a copy of vertices in originalVertices
//
PaperModel.prototype.copyToOriginalVertices = function () {
	this.originalVertices = [];
	for (var i in this.hds.vertex) 
		this.originalVertices [i] = this.hds.vertex[i].clone();
}

//
// Returns the distance between two of the paper´s vertices
//
PaperModel.prototype.vertexDistance = function (ivtx1,ivtx2) {
	return this.originalVertices[ivtx1].sub(this.originalVertices[ivtx2]).mag();
}

//
// Computes an array of vertex positions represented as THREE.Vector3 objects.
// The array is stored in the object and also returned by the function.
//
PaperModel.prototype.computeVectors = function () {
	this.vecVertex = []; 
	var obj = this;
	this.hds.allVertices (function (he,v) {
		obj.vecVertex [he.vtx] = new THREE.Vector3 (v.x, v.y, v.z);
	});
	return this.vecVertex;
}

//
// Recomputes the vecVertex array after changing the position of
// the vertices in the halfedge data structure. This makes it possible
// to obviate the recomputation of the THREE objects.
//
PaperModel.prototype.updateVectors = function () {
	var obj = this;
	this.hds.allVertices (function (he,v) {
		obj.vecVertex [he.vtx].set (v.x, v.y, v.z);
	});
}

//
// Returns a THREE.Mesh object representing the paper surface. fmaterial maps an integer
// number representing a connected component of the mesh to a material
// 
PaperModel.prototype.mesh = function (fmaterial) {

	//this.computeComponents();

	// surface is an array of THREE.Geometry object, each representing
	// a component of the paper surface
	var surface = [];
	for (var i = 0; i < this.groupCount; i++) {
		surface[i] = new THREE.Geometry();
		surface[i].vertices = this.vecVertex;
	}

	var obj = this;
	this.hds.allFaces (function (he) {
		var v0 = he.vtx;
		he = obj.hds.halfedge[he.nxt];
		var v1 = he.vtx;
		he = obj.hds.halfedge[he.nxt];
		var v2 = he.vtx;
		var igroup = obj.faceGroup[he.fac]; 
		surface[igroup].faces.push (new THREE.Face3(v0,v1,v2));
	});

	var result = new THREE.Object3D();
	for (var i = 0; i < this.groupCount; i++) {
		surface[i].computeFaceNormals();
		result.add(new THREE.Mesh( surface[i], fmaterial(i)));
	}
	return result;
}

// 
// Returns a THREE.Object3D object representing the edges of the paper
// triangulation where each edge is given a material that can be informed
// by the user using parameter fmaterial, which is a function that receives
// an edge object and returns a THREE.Material object
//
PaperModel.prototype.wireframe = function (fmaterial) {

	this.computeEdges();

	var obj = new THREE.Object3D ();
	for (var i in this.edges) {
		var e = this.edges[i];
		var line = new THREE.Line (e.geometry,fmaterial (e));
		obj.add (line);
	}

	return obj;
}

//
// Copy edge attributes to the halfedges they correspond to.
// 
PaperModel.prototype.decorateHalfedges = function () {

	if (this.edges != undefined) {
		for (var i in this.edges) {
			var e = this.edges[i];
			var he = e.halfedge;
			var ohe = this.hds.halfedge[he.opp];
			if (he.fac < 0 || ohe.fac < 0) he.type = ohe.type = "Border";
			else he.type = ohe.type = e.type;
			he.len = ohe.len = e.len;
		}
	}
}

//
// Find the hinges between components, i.e., groups of edges of the same type
// ("Ridge" or "Valley") that separate 2 triangles belonging to the same pair
// of components. In other words, A and B are in the same hinge
// if edge A separates triangles t1 and t2
// and edge B separates triangle t3 and t4, but component(t1) == component(t3) 
// and component (t2) == component (t4) or component(t1) == component(t4) 
// and component (t2) == component (t3).
// 
// Must be called only after components have been computed.
// 
PaperModel.prototype.findHinges = function () {

	this.hinges = {};
	this.hingeCount = 0;
	for (var i in this.edges) { // Visit all edges
		var e = this.edges[i];
		var he = e.halfedge;
		if (he.type == "Ridge" || he.type == "Valley") {
			var ohe = this.hds.halfedge[he.opp];
			var comp1 = this.faceGroup [ he.fac ];
			var comp2 = this.faceGroup [ ohe.fac ];
			if (comp1>comp2) { // Ensure comp1<comp2
				var tmp = comp1;
				comp1 = comp2;
				comp2 = tmp;
			}
			var hash = comp1+","+comp2;
			if (this.hinges[hash] != undefined) {
				this.hinges[hash].edges.push(i);
			}
			else {
				this.hingeCount++;
				this.hinges[hash]={ edges: [i], cgroup1:[comp1], cgroup2: [comp2] };
			}
		}
	}

}

//
// Given the graph defined by faceGroup (vertices) and hinges (edges),
// find for each hinge the set of components on each side, i.e., 
// the faces that will be rotated together when the hinge is folded.
// These are stored in fields cgroup1 and cgroup2 of each hinge.
// Also computes the set of vertices belonging to each component group,
// and stores them in fields vgroup1 and vgroup2, respectively.
// 
PaperModel.prototype.findHingeComponentGroups = function () {

	var self = this;

	// Build a dictionary mapping each faceGroup to the set of all incident hinges
	var hingeSet = [];
	for (var i in self.faceGroup) {
		hingeSet [i] = [];
		for (var h in self.hinges) {
			var fg1 = self.hinges[h].cgroup1[0];
			var fg2 = self.hinges[h].cgroup2[0];
			if (fg1 == i || fg2 == i) { hingeSet[i].push(h); }
		}
	}  


	// Starting at fatherComp, recursively visits components linked by hinges
	// and stores them in compArray, but avoiding following hinges stored in 
	// hingeArray.   
	var followHinges = function (fatherComp, compArray, hingeArray) {
		for (var ison in hingeSet [fatherComp]) {
			var son = hingeSet[fatherComp][ison];
			if (hingeArray.indexOf(son) == -1) {
				var sonHinge = self.hinges[son];
				var sonComp;
				if (sonHinge.cgroup1[0] == fatherComp) sonComp = sonHinge.cgroup2[0];
				else sonComp = sonHinge.cgroup1[0];
				if (compArray.indexOf(sonComp) == -1) {
					hingeArray.push(son);
					compArray.push(sonComp);
					followHinges(sonComp, compArray, hingeArray);
				}
			}
		}
	};

	// Build array groupFaces, where groupFace[g] is mapped to an array of all 
	// face indices that belong to connected component g.
	var groupFaces = [];
	for (var f in self.faceGroup) {
		var g = self.faceGroup[f];
		if (groupFaces[g] == undefined) groupFaces[g] = [f];
		else groupFaces[g].push(f); 
	}


	// Computes the set of all vertices for the set of components in compArray,
	// but excluding vertices in forbiddenArray 
	var componentVertexSet = function (compArray, forbiddenArray) {
		var result = [];
		for (var i in compArray) {
			var g = compArray[i];
			for (var iface in groupFaces[g]) {
				var f = groupFaces[g][iface];
				var ifhe = self.hds.faceh[f];
				var fhe = self.hds.halfedge[ifhe];
				self.hds.faceCirculator (function (he) {
					if (forbiddenArray.indexOf(he.vtx) == -1 &&
						result.indexOf(he.vtx) == -1) {
						result.push(he.vtx);
					}
				}, fhe);
			}
		}
		return result;
	}

	// Returns an array containing all vertices belonging to the set of edges 
	// whose indices are stored in edgeArray
	var edgeVertexSet = function (edgeArray) {
		var result = [];
		for (var i in edgeArray) {
			var e = edgeArray[i];
			var edge = self.edges[e];
			var he = edge.halfedge;
			if (result.indexOf(he.vtx) == -1) result.push(he.vtx);
			var ohe = self.hds.halfedge[he.opp];
			if (result.indexOf(ohe.vtx) == -1) result.push(ohe.vtx);
		}
		return result;
	}


	for (var h in self.hinges) {
		var hinge = self.hinges[h];
		var hingeVertices = edgeVertexSet (hinge.edges);
		self.hingeVertices = hingeVertices;

		followHinges (hinge.cgroup1[0], hinge.cgroup1, [h]);
		hinge.vgroup1 = componentVertexSet (hinge.cgroup1, hingeVertices);
		followHinges (hinge.cgroup2[0], hinge.cgroup2, [h]);
		hinge.vgroup2 = componentVertexSet (hinge.cgroup2, hingeVertices);

		// Test if hinge.vgroup1 is to the left of the first hinge edge
		var e = hinge.edges[0];
		var edge = self.edges[e];
		var nxt = edge.halfedge.nxt;
		var leftVertex = self.hds.halfedge[nxt].vtx;
		if (hinge.vgroup1.indexOf(leftVertex) == -1) {
			// swap vgroups if not
			var tmp = hinge.vgroup1;
			hinge.vgroup1 = hinge.vgroup2;
			hinge.vgroup2 = tmp;
		}
		
	}

	console.log ("Hinges");
	for (var i in this.hinges) {
		console.log (i,this.hinges[i]);
	}
}


//
// Clean up the extraneous fields we have placed in the halfedges,
// i.e., undoes decorateHalfedges.
//
PaperModel.prototype.plainHalfedges = function () {
	for (var i = 0; i < this.hds.halfedge.length; i++) {
		var he = this.hds.halfedge[i];
		if (he != undefined) {
			he.type = undefined;
			he.len = undefined;
		}
	}
}


//
// Performs an svd on an array of points in order
// to obtain a plane that approximates the cloud. Then
// returns the array of points projected onto the plane.
//
function svd (points) {
	var m = [];
	// Compute the barycenter of the point cloud
	var bary = new PVector(0,0,0);
	for (var i in points) {
		var p = points[i];
		bary = bary.add (p);
	}
	bary = bary.mult(1.0/points.length);
	// Create matrix for SVD
	for (var i in points) {
		var p = points[i].sub(bary);
		points[i] = p;
		m.push ([p.x,p.y,p.z]);
	}
	// Compute the SVD
	var r = numeric.svd(m);
	// The normal of the best fitting plane
	// is the third column of the V matrix
	var normal = new PVector (r.V[0][2],r.V[1][2],r.V[2][2]);
	normal.normalize();
	// Project all points onto plane
	for (var i in points) {
		var n = normal.mult(points[i].dot(normal));
		points [i] = bary.add(points[i].sub(n));
	}
	return points;
	// Create a PointCloud object for the projected points
	// var g = new THREE.Geometry();
	// for (var i in points) {
	// 	var p = points[i];
	// 	g.vertices.push(new THREE.Vector3(p.x,p.y,p.z));
	// }
	// return new THREE.PointCloud(g, new THREE.PointCloudMaterial ({size:4,sizeAttenuation:false}));
}

//
// Performs a SVD of the vertices in each component of the model.
//
PaperModel.prototype.componentSVD = function () {
	var self = this;
	var newpos = [];
	for (var i = 0; i < this.groupCount; i++) {
		var v = [];
		var iv = [];
		self.hds.allVertices(function (he) {
			var flag = false;
			self.hds.vertexCirculator(function (vhe) {
				if (vhe.fac >= 0 && self.faceGroup[vhe.fac] == i) {
					flag = true;
					return true;
				}
			}, he);
			if (flag) {
				v.push (self.hds.vertex[he.vtx]);
				iv.push (he.vtx);
			}
		});
		// console.log ("group "+i+" with "+v.length+ " vertices");
		v = svd(v);
		for (var j in v) {
			var k = iv[j];
			if (newpos[k] == undefined) newpos [k] = [];
			newpos [k].push (v[j]);
		}
	}
	for (var i in newpos) {
		var p = newpos[i];
		if (p == undefined) continue;
		var q = new PVector(0,0,0);
		for (var j in p) {
			q = q.add (p[j]);
		}
		q = q.mult(1.0/p.length);
		self.hds.vertex[i] = q;
	}
	self.updateVectors();
}

//
// Compute connected components for the halfedge faces, i.e., consider
// border,ridge and valley edges as fences between the components. 
// The result is stored in array faceGroup, where faceGroup[f] maps
// face f to the connected component index it belongs to. Also
// computes groupCount, which is the total number of connected components
// detected.
// 
PaperModel.prototype.computeComponents = function () {

	var self = this;
	self.faceGroup = [];
	var fg = self.faceGroup;
	self.decorateHalfedges();

	// Put the first face in the queue
	var faceStack = [];
	var groupCount = 0;
	self.hds.allFaces(function (fhe) {
		var iface = fhe.fac;
		if (fg[iface] != undefined) return; // Face already visited!
		faceStack.push(iface);
		while (faceStack.length>0) {
			var j = faceStack.pop();
			if (fg [j] == undefined) { // Not visited yet
				fg [j] = groupCount;
				var jhe = self.hds.halfedge[self.hds.faceh[j]];
				self.hds.faceCirculator(function (he) {
					if (he.type == "Flat") {
						var ohe = self.hds.halfedge[he.opp];
						var neighbor = ohe.fac;
						if (fg [neighbor] == undefined) {
							faceStack.push(neighbor);
						}
					}
				}, jhe);
			}
		}
		groupCount++;
	});
	console.log (groupCount+" components");
	self.groupCount = groupCount;
	self.findHinges();
	self.findHingeComponentGroups();
}

//
// Computes/recomputes the edges data structure of the paper model
//
PaperModel.prototype.computeEdges = function () {

	// Remember edge attributes by copying them to the halfedges
	this.decorateHalfedges(); 

	this.edges = [];
	var obj = this;
	this.hds.allEdges (function (he,phe) {
		var ohe = obj.hds.halfedge[he.opp];
		var v0 = obj.vecVertex[he.vtx];
		var v1 = obj.vecVertex[phe.vtx];
		var g = new THREE.Geometry ();
		g.vertices.push (v0,v1);
		g.computeLineDistances();
		var t = he.type;
		if (t == undefined) t = ohe.type;
		if (t == undefined) t = he.fac < 0 || ohe.fac < 0 ? "Border" : "Flat";
		var l = he.len;
		if (l == undefined) l = ohe.len;
		if (l == undefined) l = //obj.hds.vertex[he.vtx].sub(obj.hds.vertex[phe.vtx]).mag(); 
		                        obj.vertexDistance(he.vtx,ohe.vtx);
		obj.edges.push ({
			halfedge: he,   // One of the halfedges of this edge
			type: t, // A string representing the type of this edge
			geometry: g, // A Geometry object for this edge
			len: l // The nominal length of this edge
		})
	});

}

//
// Alters the model's halfedge data structure to reflect cuts made in the paper
// i.e., edges of type "Cut".
//
PaperModel.prototype.processCuts = function () {
	var vtxToSnip = [];
	var cutCount = 0;
	// First cut the edges
	for (var i in this.edges) {
		var e = this.edges[i];
		if (e.type == "Cut") {
			e.type = "Flat";
			var opposite = this.hds.halfedge[e.halfedge.opp];
			var v0 = e.halfedge.vtx;
			var v1 = opposite.vtx;
			check_hds(this.hds);
			cutEdge (this.hds, e.halfedge);
			cutCount++;
			if (vtxToSnip.indexOf(v0) < 0) vtxToSnip.push (v0);
			if (vtxToSnip.indexOf(v1) < 0) vtxToSnip.push (v1);
		}
	}
	// Next, separate the vertices of consecutive cut edges
	var snipCount = 0;
	while (vtxToSnip.length > 0) {
		var newvtx_h;
		var i = vtxToSnip[0];
		vtxToSnip.splice(0,1);
		while (newvtx_h = snipVertex(this.hds,i)) {
			this.originalVertices[newvtx_h.vtx] = this.hds.vertex[newvtx_h.vtx].clone();
			snipCount++;
			if (vtxToSnip.indexOf(newvtx_h.vtx) < 0) vtxToSnip.push(newvtx_h.vtx);
		}
	}

	if (cutCount > 0) {
		// If cuts were made, the paper topology has changed and thus the
		// other data structures must be recomputed
		console.log (cutCount+" Cuts and "+snipCount+" Snips");
		this.computeVectors();
		this.computeEdges(true);
	}
}

//
// Computes the linear and dihedral constraints for the paper. 
// Call this before the first call to relaxOneStep
//
PaperModel.prototype.computeConstraints = function () {

	// First make sure that all cuts are processed
	this.processCuts();
	this.computeComponents();

	this.lc = [];   // Linear constraints
	this.dc = [];   // Dihedral constraints
	this.fc = [];   // Dihedral constraints for flat edges
	var angsum = 0, linsum = 0;
	for (var i in this.edges) {
		var e = this.edges[i];
		var he = e.halfedge;
		var ohe = this.hds.halfedge[he.opp];
		var v0 = this.hds.vertex[he.vtx];
		var v1 = this.hds.vertex[ohe.vtx];
		var constraint = new LinearConstraint (v0,v1,e.len);
		linsum += constraint.discrepancy();
		this.lc.push (constraint);
		if (he.fac >= 0 && ohe.fac >= 0) {
			var iv2 = this.hds.halfedge[he.nxt].vtx;
			var v2 = this.hds.vertex[iv2];
			var iv3 = this.hds.halfedge[ohe.nxt].vtx;
			var v3 = this.hds.vertex[iv3];
			var angle = (e.type == "Ridge") ? Math.PI / 2 :
						(e.type == "Valley") ? -Math.PI / 2:
						0;
			constraint = new DihedralConstraint (v0,v1,v2,v3,angle); 
			angsum += constraint.discrepancy();
			if (angle == 0) {
				this.fc.push (constraint);
				// Add a linear constraint between the opposite vertices of
				// a flat dihedral constraint
                constraint = new LinearConstraint(v2,v3,this.vertexDistance(iv2,iv3));
                linsum += constraint.discrepancy();
                this.lc.push (constraint);
            } else {
            	this.dc.push (constraint);
            }
		}
	};
	console.log ("linear discrepancy "+linsum+", angular discrepancy "+angsum);
}

//
// Sorts constraint array c in decreasing order of discrepancy so that
// higher discrepancies are relaxed earlier. Returns the total discrepancy
//
function sortByDiscrepancy (c) {
    var sum = 0;
    for (var i = 0; i < c.length; i++) {
        c[i].disc = c[i].discrepancy();
        sum += c[i].disc;
    }
    c.sort(function (a,b) { 
        return a.disc < b.disc ? 1 : (a.disc > b.disc ? -1 : 1); 
    });
    return sum;    
}

//
// Performs one step of the relaxation process. Whenever the edges data
// structure is changed, constraints must be created using the computeConstraints
// function and then this function must be called repeatedly
// to achieve the paper's final shape. One call to this function will
// cause nrepeat repetitions of the relaxation, where each repetition
// is comprised of ndihedral relaxations of dihedral constraints that have
// angle != 0, nflat repetitions of dihedral constraints with angle == 0 and
// nlinear repetitions of linear constraints
//
PaperModel.prototype.relaxOneStep = function (nrepeat, ndihedral, nflat, nlinear) {
	// Process defaults
	if (nrepeat == undefined) nrepeat = 5;
	if (ndihedral == undefined) ndihedral = 1;
	if (nflat == undefined) nflat = 1;
	if (nlinear == undefined) nlinear = 5;
	// The constraints
	var lc = this.lc, dc = this.dc, fc = this.fc;
	for (var k = 0; k < nrepeat; k++) {
		var f = /*0.5 */ (k+1) / (nrepeat);
		sortByDiscrepancy(dc);
		for (var j = 0; j < ndihedral; j++) {
			for (var i = 0; i < dc.length; i++) {
				dc[i].relax(f);
			}
		}
		sortByDiscrepancy(fc);
		for (var j = 0; j < nflat; j++) {
			for (var i = 0; i < fc.length; i++) {
				fc[i].relax(0.5);
			}
		}
		var s = sortByDiscrepancy(lc);	
		for (var j = 0; j < nlinear; j++) {
			for (var i = 0; i < lc.length; i++) {
				lc[i].relax(0.5);
			}
		}
	}
	this.updateVectors();
}

// Debug code to fold one hinge at a time
var stepHingeFold = false;
var doneHinges = [];

//
// Visits all computed hinges applying rotations to each side.
// The rotation angle is a fraction (a value between 0 and 1)
// of the needed amount to reach the goal dihedral angle for the hinge.
//
PaperModel.prototype.foldHinges = function (fraction) {

	var self = this;

	// Rotates all vertices in vgroup around axis v0-v1 by ang
	function rotateVertices (vgroup,v0,v1,ang) {
		for (var i in vgroup) {
			var iv = vgroup [i];
			var v = self.hds.vertex[iv];
			var vnew = rotateAroundAxis (v0,v1,v,ang);
			v.set(vnew);
		}
	}

	for (var i in self.hinges) {
	    if (stepHingeFold && doneHinges.indexOf(i) != -1) continue;
		var hinge = self.hinges[i];
		var edge = self.edges [hinge.edges[0]];
		var he = edge.halfedge;
		var ohe = self.hds.halfedge[he.opp];
		// Axis vertices
		var v0 = self.hds.vertex[he.vtx];
		var v1 = self.hds.vertex[ohe.vtx];
		// Opposite vertices
		var v2 = self.hds.vertex[self.hds.halfedge[he.nxt].vtx];
		var v3 = self.hds.vertex[self.hds.halfedge[ohe.nxt].vtx];
		// Current dihedral angle for this hinge
		var curAngle = dihedralAngle(v0,v1,v2,v3);
		var goalAngle = (edge.type == "Ridge") ? Math.PI / 2 :
						(edge.type == "Valley") ? -Math.PI / 2:
						0;
		var rotAngle = (goalAngle-curAngle) / 2 * fraction;
		console.log ("Folding hinge",i,"type",edge.type,"with angle",
			         curAngle/Math.PI*180,"by",
			         rotAngle/Math.PI*180);
		rotateVertices (hinge.vgroup1, v0, v1, -rotAngle);
		rotateVertices (hinge.vgroup2, v0, v1, rotAngle);
		if (stepHingeFold) {
			doneHinges.push(i);
			break;
		}
	}

	if (stepHingeFold && doneHinges.length == self.hingeCount) doneHinges = [];

	self.updateVectors();
}


//
// Subdivides flat edges. Function fsubdivide is a predicate that takes an edge object 
// and returns true if the edge must be subdivided.
//
PaperModel.prototype.subdivideEdges = function (fsubdivide) {

	var visitedVertices = [];
	this.decorateHalfedges();
	var nsub = 0;
	var saveEdges = [];
	for (var i in this.edges) {
		var paperedge = this.edges[i];
		var he = paperedge.halfedge;
		if (he.type == "Flat" && fsubdivide(paperedge)) {
			var ohe = this.hds.halfedge[he.opp];
			var v0 = he.vtx;
			var v1 = ohe.vtx;
			if (!visitedVertices[v0] || !visitedVertices[v1]) {
				visitedVertices[v0] = visitedVertices[v1] = true;
				var v2 = this.hds.halfedge[he.nxt].vtx;
				var v3 = this.hds.halfedge[ohe.nxt].vtx;
				visitedVertices[v2] = visitedVertices[v3] = true;
				var newhe = subdivideEdge (this.hds,he);
				this.originalVertices [newhe.vtx] = this.hds.vertex[newhe.vtx].clone();
				nsub++;
			}
		}
		else {
			saveEdges.push(paperedge);
		}
	}
	console.log (nsub+" subdivided edges");
	this.computeVectors();
	this.edges = saveEdges;
	this.plainHalfedges();
	this.computeEdges();
}

//
// Flip edges that are not Delaunay
//

PaperModel.prototype.flipEdges = function () {

	var nflip = 0;
	var saveEdges = [];
	for (var i in this.edges) {
		var paperedge = this.edges[i];
		var he = paperedge.halfedge;
		if (he.type == "Flat") {
			var ohe = this.hds.halfedge[he.opp];
			var v0 = he.vtx;
			var v1 = ohe.vtx;
			var henxt = this.hds.halfedge[he.nxt];
			var v2 = henxt.vtx;
			var ohenxt = this.hds.halfedge[ohe.nxt];
			var v3 = ohenxt.vtx;
			if (!isDelaunay(this.hds.vertex[v0],this.hds.vertex[v1],
				            this.hds.vertex[v2],this.hds.vertex[v3]) && 
				isFlippable(this.hds.vertex[v0],this.hds.vertex[v1],
				            this.hds.vertex[v2],this.hds.vertex[v3])) {
				flipEdge (this.hds, he);
				nflip++;
			}
		}
		else {
			saveEdges.push(paperedge);
		}
	}
	console.log (nflip+" flips");
	this.edges = saveEdges;
	this.plainHalfedges();
	this.computeEdges();
}

// 
// Visits all vertices internal to the components and perform a 
// laplacian smooth step on them. 
//
PaperModel.prototype.laplacianSmooth = function () {
	var self = this;
	self.decorateHalfedges();
	var saveEdges = [];
	for (var i in this.edges) { 
		var e = this.edges[i];
		if (e.type != "Flat") {
			saveEdges.push(e);
		}
	}
	for (var nsteps = 5; nsteps>0; nsteps--) {
		var visitedVertices = [];
		var nmoved = 0;
		self.hds.allVertices(function(he) {
			var n = 0;
			var pos = new PVector(0,0,0);
			var ok = true;
			var neighbor = [];
			self.hds.vertexCirculator (function (vhe) {
				var ovtx = self.hds.halfedge[vhe.opp].vtx;
				neighbor.push(ovtx);
				ok = ok && /*!visitedVertices[ovtx] && */ vhe.type == "Flat";
				pos = pos.add(self.hds.vertex[ovtx]);
				n++;
			}, he);
			if (ok) {
				pos = pos.mult(1.0/n);
				if (pos.sub(self.hds.vertex[he.vtx]).mag()>1e-5) {
					self.hds.vertex[he.vtx] = pos;
					visitedVertices[he.vtx] = true;
					for (var i in neighbor) visitedVertices [neighbor[i]] = true;
					nmoved++;
				}
			}
		});
		console.log (nmoved+ " vertices moved");
	}
	this.copyToOriginalVertices();
	this.computeVectors();
	this.edges = saveEdges;
	this.plainHalfedges();
	this.computeEdges();
}

//
// Function to build a json object from a PaperModel object
//
function paperModelToJson (paper) {
	var vtxmap = [];
	var vtx = [];
	var orig = [];
	var fac = [];
	var edg = [];
	paper.hds.allVertices (function (he,v) {
		vtxmap[he.vtx] = vtx.length;
		vtx.push ({x: v.x, y:v.y, z: v.z});
		var o = paper.originalVertices[he.vtx];
		orig.push ({x: o.x, y:o.y, z: o.z});
	});
	paper.hds.allFaces (function (he) {
		var heface = [];
		paper.hds.faceCirculator (function (fhe) {
			heface.push (vtxmap[fhe.vtx]);
		}, he);
		fac.push (heface);
	});
	for (var i in paper.edges) {
		var e = paper.edges[i];
		var he = e.halfedge;
		edg.push ({
			v0 : vtxmap [he.vtx],
			v1 : vtxmap [paper.hds.halfedge[he.opp].vtx],
			type : e.type
		})
	}
	return {
		vertices : vtx,
		originalVertices: orig,
		faces : fac,
		edges : edg
	}
}



// 
// Function to build a PaperModel from a json object
//
function jsonToPaperModel (json) {
	var vtx = [];
	var fac = json.faces;
	for (var i in json.vertices) {
		var v = json.vertices[i];
		vtx.push (new PVector (v.x, v.y, v.z))
	}
	var orig;
	if (json.originalVertices != undefined) {
		orig = [];
		for (var i in json.originalVertices) {
			var v = json.originalVertices[i];
			orig.push (new PVector (v.x, v.y, v.z))
		}
	}
	// console.log (fac,vtx,orig);
	var paper = new PaperModel (fac,vtx,orig);

	var n = 0;
	for (var i in json.edges) {
		var edg = json.edges[i];
		for (var j in paper.edges) {
			var e = paper.edges[j];
			var v0 = e.halfedge.vtx;
			var v1 = paper.hds.halfedge[e.halfedge.opp].vtx;
			if ((v0 == edg.v0 && v1 == edg.v1) || (v1 == edg.v0 && v0 == edg.v1)) {
				e.type = edg.type;
				n++;
				break;
			}
		}
	}
	paper.computeEdges();
	return paper;
}