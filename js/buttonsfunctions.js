// Buttons

//
// this is a function of two arguments: data and filename. It
// sends the data as a file to the user
//
var saveDataD3 = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    return function (data, fileName) {
        var blob = new Blob([data], {
                type: "application/xml"
            }),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
    }());

//
// Saves the current paper model onto a file
//
function saveFileD3 () {
    //saveDataD3(generateJSON(), "paper.json");
    generateJSON();
    foldingInterface();
}


// Displays drawing interface and hides folding interface
function drawingInterface() {
    trackballControls.enabled = false;
    d3.select("canvas").classed("hide", true);
    d3.selectAll(".gui").classed("hide", true);
    d3.selectAll(".guiButton").classed("hide", true);
    d3.select(".d3int").classed("hide", false);
    d3.select("header").classed("hide", true);
}

// Displays folding interface and hides drawing interface
function foldingInterface() {
    trackballControls.enabled = true;
    d3.select(".d3int").classed("hide", true);
    d3.select("header").classed("hide", true);
    d3.select("canvas").classed("hide", false);
    d3.selectAll(".gui").classed("hide", false);
    d3.selectAll(".guiButton").classed("hide", false);
}

// Changes the coordinate system from the D3 interface to the ThreeJS Interface
function coordinateChange(obj) {
  var maxX = d3.max(obj["vertices"], function(d) {
      return d.x;
  });
  var minX = d3.min(obj["vertices"], function(d) {
      return d.x;
  });
  var maxY = d3.max(obj["vertices"], function(d) {
      return d.y;
  });
  var minY = d3.min(obj["vertices"], function(d) {
      return d.y;
  });
  var xRatio = (maxX + minX) / 2;
  var yRatio = (maxY + minY) / 2;
  for (var i = 0, x = obj["vertices"].length; i < x; i++) {
      obj["vertices"][i]["x"] -= xRatio;
      obj["vertices"][i]["y"] -= yRatio;
      obj["vertices"][i]["y"] *= -1;
  }
}

// Generate JSON edge interaction

function generateJSONEdges() {
  var obj = grid.pentagonMesh();
  paperJSON = obj;
  d3.selectAll("line.edgesInteraction").remove();
  d3.select("svg")
    .selectAll("line")
    .data(obj["edges"])
    .enter()
    .append("line")
    .attr("class", "edgesInteraction")
    .attr("x1", function(d) { return obj["vertices"][d["v0"]].x; })
    .attr("y1", function(d) { return obj["vertices"][d["v0"]].y; })
    .attr("x2", function(d) { return obj["vertices"][d["v1"]].x; })
    .attr("y2", function(d) { return obj["vertices"][d["v1"]].y; })
    .attr("v0", function(d) { return d["v0"]; })
    .attr("v1", function(d) { return d["v1"]; })
    .attr("stroke", "black")
    .attr("stroke-width", 5);
}

// Generates the JSON adapted to coordinate system of folding interface.
function generateJSON() {
    var obj = grid.pentagonMesh();
    coordinateChange(obj);
    paperJSON = obj;
    resetObjects2();
    return JSON.stringify(obj);
}

// Function used to add new patterns made by the user to the patterns data structure. After saving the pattern it redraws
// the miniatures and the zoomed displays
function addNewPattern() {
  if (patternsArray.length < 11) {
    patternsArray.push([]);
    var lastPosition = patternsArray.length - 1;
    for (var key1 in grid.state) {
      for (var key2 in grid.state[key1]) {
        for (var key3 in grid.state[key1][key2]["pentagonSelected"]) {
          if (grid.state[key1][key2]["pentagonSelected"][key3]) {
            patternsArray[lastPosition].push({
              row: parseInt(key1) + 10,
              col: parseInt(key2) + 10,
              rotation: grid.state[key1][key2].rotation,
              which: parseInt(key3)
            });
          }
        }
      }
    }
    var adjustment = patternsArray[lastPosition][0].row % 2;
    for (var i = 0; i < patternsArray[lastPosition].length; i++) {
      if (adjustment == 1) {
        patternsArray[lastPosition][i].row++;
        if ((patternsArray[lastPosition][i].row > patternsArray[lastPosition][0].row)
            && (patternsArray[lastPosition][i].row % 2 == 1)) {
          patternsArray[lastPosition][i].col--;
        }
      }
    }
    drawPatternsMiniaturesAndZoom();
  }
  else {
    alert("Can't save another pattern");
  }
}

// Function used to reset the hexagonal grid to initial state
function resetHexagonalGrid() {
  for (var key1 in grid.state) {
    for (var key2 in grid.state[key1]) {
      for (var key3 in grid.state[key1][key2]["pentagonSelected"]) {
        grid.state[key1][key2].rotation = 0;
        grid.state[key1][key2]["pentagonSelected"][key3] = false;
        var updatedCell = d3.selectAll("g.cell[row='"+key1+"'][col='"+key2+"']");
        var updatedPentagon = updatedCell.selectAll("path.pentagon");
        updatedCell.selectAll("path.pentagon")
            .transition()
            .duration(500)
            .attr ("d", function (d,i,j) {
                return grid.pentagonPath(key1,key2,d);
            });
        updatedCell[0][0].attributes.rotation.value = 0;
        updatedPentagon[0][key3].attributes.fill.value = "#eeeeee";
        updatedPentagon[0][key3].attributes.class.nodeValue = "pentagon";
        updatedPentagon[0][key3].attributes.originalColor.value = "#eeeeee";
      }
    }
  }
}

// Function used to reset patterns saved to initial state
// deletes all the user created patterns from the patterns data structure
function resetPatternsSelector() {
  patternsArray = copyPatterns(patternsDefault);
  drawPatternsMiniaturesAndZoom();
  patternSelected = 0;
  d3.select("circle.selectedPatternZoom").transition().duration(300).attr("r", 0);
  d3.selectAll("path.pentagonPattern").classed("zoomed", false).transition().duration(300).attr("fill", "transparent").attr("stroke", "transparent");
  d3.selectAll("rect.selectedPattern").attr("stroke", "#151515");
  d3.select("rect#selectedPattern" + (patternSelected)).attr("stroke", "red");
}

// Function prototype to rotate patternsDefault
function rotate60(row,col) {
	var i = row;
	var j = col - Math.floor(row/2);
	var newi = i+j;
	var newj = -i;
	var newrow = newi;
	var newcol = newj + Math.floor(newi/2);
	return [newrow,newcol];
}

function patternRotation() {
  // Cell rotation formula. Needs to implement cell position formula.
  for (var k = 0; k < patternsArray.length; k++) {
    for (var w = 0; w < patternsArray[k].length; w++) {
      var irow = patternsArray[k][w].row - patternsArray[k][0].row;
      var icol = patternsArray[k][w].col - patternsArray[k][0].col;
      var rotated = rotate60(irow, icol);
      patternsArray[k][w].row = patternsArray[k][0].row + rotated[0];
      patternsArray[k][w].col = patternsArray[k][0].col + rotated[1];
      patternsArray[k][w].rotation++;
      if (patternsArray[k][w].rotation === 3) {
        patternsArray[k][w].rotation = 0;
        if (patternsArray[k][w].which === 1) patternsArray[k][w].which = 0;
        else patternsArray[k][w].which = 1;
      }
    }
  }
  drawPatternsMiniaturesAndZoom();
}


d3.select("#addPattern").on("click", addNewPattern);
d3.select("#rotatePatterns").on("click", patternRotation);
d3.select("#resetGrid").on("click", resetHexagonalGrid);
d3.select("#resetPatterns").on("click", resetPatternsSelector);
d3.select("#json").on("click", saveFileD3);
d3.select("#jsonEdges").on("click", generateJSONEdges);
