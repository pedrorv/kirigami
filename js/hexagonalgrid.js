    //
    // An hexagonal grid class.
    // x0, y0:  center of the hexagon in the upper left corner of the grid.
    // radius : the radius of a circle inscribing each hexagon.
    // rows: number of rows of the grid.
    // columns: number of columns of the grid.
    //
    function HexagonalGrid (x0, y0, radius, rows, columns) {
        this.radius = radius;
        this.rows = rows;
        this.columns = columns;
        this.x0 = x0;
        this.y0 = y0;
        // Two neighbor hexagons in the same row are separated by dx
        this.dx = radius * Math.sqrt(3);
        // Two rows are separated by dy
        this.dy = radius * 1.5;
        // An array that contains the state of each hexagon
        this.state = [];
        for (var irow = 0; irow < rows; irow++) {
            var staterow = [];
            var cols = (irow % 2 === 0) ? columns : columns - 1;
            for (var icol = 0; icol < cols; icol++) {
                staterow.push ({
                    rotation:0,
                    pentagonSelected: [false,false],
                });
            }
            this.state.push (staterow);
        }
        // A vertex table (maps hashes to vertex positions)
        this.vtxTable = {};
        // A vertex index table (maps hashes to vertex indices)
        this.vtxIdxTable = {};
    }

    //
    // Returns the coordinates of the center of hexagon irow,icol
    //
    HexagonalGrid.prototype.hexagonCenter = function (irow, icol) {
        return [this.x0 + icol * this.dx + (irow % 2 == 1 ? this.dx/2 : 0),
                this.y0 + irow * this.dy];
    }

    //
    // Computes the coordinates of the hexagon vertex ivtx, ivtx
    // being a value between 0 and 5. If scale is given, then the radius of the
    // hexagon is scaled by that scale factor
    //
    HexagonalGrid.prototype.hexagonVertexCoords = function (irow,icol,ivtx, scale) {
        var r = this.radius;
        if (scale) r *= scale;
        var center = this.hexagonCenter(irow,icol);
        var cx = center[0],cy=center[1];
        var ang = Math.PI * (-0.5 + ivtx / 3.0); // Angle around the circle
        return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    }

    //
    // Returns a proper index (hash) to the vertex table given
    // the cell (irow,icol) and the vertex number (ivtx), taking into
    // account the vertex sharing topology of the grid.
    //
    HexagonalGrid.prototype.vertexHash = function (irow,icol,ivtx) {
        // Look up vertex in the table
        var hash = irow+","+icol+","+ivtx;
        var oddRow = (irow % 2);

        if (ivtx >= 2 && ivtx <= 3 && icol+1 < this.columns) {
            // Vertex is shared with the cell at the right
            hash = irow+","+(icol+1)+","+(12-ivtx);
        } else if (ivtx >= 4 && ivtx <= 6 && irow+1 < this.rows && icol+oddRow < this.columns) {
            // Vertex is shared with cell below and to the right
            hash = (irow+1)+","+(icol+oddRow)+","+((16-ivtx)%12);
        } else if (ivtx >= 7 && ivtx <= 8 && irow+1 < this.rows && icol+oddRow-1 >= 0) {
            // Vertex is shared with cell below and to the left
            hash = (irow+1)+","+(icol+oddRow-1)+","+(8-ivtx);
        }
        return hash;
    }

    //
    // Returns an array with the coordinates of vertex ivtx for
    // the hexagon at row irow, column icol of the grid.
    // ivtx must be a number between 0 and 12, where 0 is
    // the top vertex, 2, 4, 6, 8, 10 are the indices of the
    // remaining vertices in clockwise order, 1, 3, 5, 7, 9, 11 are
    // the indices of edge midpoint vertices (1 between 0 and 2, for instance),
    // and 12 is a vertex at the center of the hexagon.
    //
    HexagonalGrid.prototype.vertex = function (irow,icol,ivtx) {
        // Look up vertex in the table
        var hash = this.vertexHash(irow,icol,ivtx);
        var result = this.vtxTable[hash];
        if (result != undefined) return result;
        // center vertex?
        if (ivtx == 12) {
            result = this.hexagonCenter(irow,icol);
        }
        else if (ivtx % 2 == 0) {
            // corner vertex?
            result = this.hexagonVertexCoords(irow,icol,Math.floor(ivtx/2));
        }
        else {
            // otherwise, midpoint vertex
            var a = this.hexagonVertexCoords(irow,icol,Math.floor(ivtx/2));  // previous vtx
            var b = this.hexagonVertexCoords(irow,icol,Math.ceil(ivtx/2) % 12); // next vtx
            result = [(a[0]+b[0])/2,(a[1]+b[1])/2];
        }
        this.vtxTable[hash] = result;
        return result;
    }

    //
    // Returns a path specification for hexagon at position irow,icol of the grid
    //
    HexagonalGrid.prototype.hexagonPath = function (irow, icol) {
        var s = "";
        for (var i = 0; i < 6; i++) {
            s += i == 0 ? "M" : " L";
            var v = this.hexagonVertexCoords(irow,icol,i,0.88);
            s += v[0]+","+v[1];
        }
        return s+"z";
    }


    //
    // Returns a path specification for one of the two half-pentagons (ipenta = 0 or 1)
    // at position irow,icol of the grid
    //
    HexagonalGrid.prototype.pentagonPath = function (irow, icol, ipenta) {

        // Index of first vertex of the pentagon
        var startVtx = ipenta == 0 ? 9 : 3;
        startVtx += this.state[irow][icol].rotation*2;

        // Use 7 vertices, starting at a midpoint vertex
        var s = "";
        for (var i = 0; i < 7; i++) {
            var j = (startVtx + i) % 12;
            s += i == 0 ? "M" : " L";
            var v = this.vertex(irow,icol,j);
            s += v[0]+","+v[1];
        }
        var v = this.vertex(irow,icol,12);
        s += "L" + v[0]+","+v[1];
        return s+"z";
    }

    //
    // Returns a list of hashes for each vertex of a pentagon of the grid
    // determined by irow,icol,ipenta
    //
    HexagonalGrid.prototype.pentagonPathHashList = function (irow, icol, ipenta) {

        // Index of first vertex of the pentagon
        var startVtx = ipenta == 0 ? 9 : 3;
        startVtx += this.state[irow][icol].rotation*2;

        // Use 7 vertices, starting at a midpoint vertex
        var result = [];
        for (var i = 0; i < 7; i++) {
            var j = (startVtx + i) % 12;
            result.push (this.vertexHash(irow,icol,j));
        }
        return result;
    }

    //
    // Generate a mesh object from colored pentagons
    //
    HexagonalGrid.prototype.pentagonMesh = function () {
        var self = this;

        // The object representing the mesh
        var obj = {
            vertices: [],
            faces: [],
            edges: []
        };
        // Maps a vertex hash to the index of an element of obj.vertices
        var vtxIdx = {};
        // Total number of vertices in obj.vertices
        var nvtx = 0;
        // Function that returns vtxIdx[h], making sure it exists
        var emitVertex = function (h) {
            if (vtxIdx[h] == undefined) {
                vtxIdx[h] = nvtx++;
                var vtx = self.vtxTable[h];
                obj.vertices.push ({x:vtx[0], y:vtx[1], z:0});
            }
            return vtxIdx[h];
        };
        // Visit all colored pentagons
        for (var irow = 0; irow < this.rows; irow++) {
            var cols = (irow % 2 === 0) ? this.columns : this.columns - 1;
            for (var icol = 0; icol < cols; icol++) {
                for (ipenta = 0; ipenta<2; ipenta++) {
                    if (this.state[irow][icol].pentagonSelected[ipenta]) {
                        // Hash of the center vertex
                        var h = this.vertexHash(irow,icol,12);
                        // Generate one triangle for a fan of vertices rooted at the center of the hexagon
                        var hlist = this.pentagonPathHashList (irow,icol,ipenta);
                        for (var ih = 0; ih+1<hlist.length; ih++) {
                            obj.faces.push ([emitVertex(h),emitVertex(hlist[ih]),emitVertex(hlist[ih+1])]);
                            obj.edges.push ({
                               "v0":emitVertex(hlist[ih]),
                               "v1":emitVertex(hlist[ih+1]),
                            });
                        }
                    }
                }
            }
        }
        return obj;
    }
