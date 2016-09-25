// SVG Part - D3 Code

var paperJSON;
var grid;

// Main

// Controls interaction mode

// Used to indicate if there is a pattern selected and which one is it
var patternSelected = 0;
// Auxiliar grid to create the patterns drawings
var patternsGrid;

// Svgs attributes
var svg = d3.select("#svgHolder").append("svg");
grid = new HexagonalGrid (60, 60, 50, 9, 9);
patternsGrid = new HexagonalGrid (60, 60, 50, 50, 50);
var width = (grid.vertex(0, grid.columns - 1, 2));
var height = (grid.vertex(grid.rows - 1, 0, 6));
svg.attr('width', width[0] + 50 + 50 + 154 + 154 + 10)
    .attr('height', height[1] + 100);

// A data array with the row and col of each grid cell
var data = [];
for (var irow = 0; irow < grid.rows; irow++) {
    var cols = (irow % 2 === 0) ? grid.columns : grid.columns - 1;
    for (var icol = 0; icol < cols; icol++) {
        data.push([irow,icol])
    }
}

// Create one cell for each hexagon and the two pentagons
var cells = svg.selectAll ("g.cell")
    .data(data)
    .enter()
    .append("g")
    .attr ("class", "cell")
    .attr("row", function(d, i) { return d[0]; })
    .attr("col", function(d, i) { return d[1]; })
    .attr("rotation", 0)
    // Show/hide the hexagon frame
    .on ("mouseover", function (d,i) {
      if (!patternSelected) {
        d3.select(this).select(".hexagonFrame").style("opacity", 1);
      }
    })
    .on ("mouseout", function (d,i) {
      if (!patternSelected) {
        d3.select(this).select(".hexagonFrame").style("opacity", 0);
      }
    });

// Returns the data used to paint each pentagon of a pattern on the hexagonal grid
function definePatternPaintingValues(cell, x) {
    var selectedCell = cell;
    var irow = parseInt(selectedCell[0][0].attributes.row.value) + patternsArray[patternSelected - 1][x].row - patternsArray[patternSelected - 1][0].row;
    var adjustment = (parseInt(selectedCell[0][0].attributes.row.value) % 2 == 1) && (patternsArray[patternSelected - 1][x].row % 2 != 0) &&
                  patternsArray[patternSelected - 1][x].row > patternsArray[patternSelected - 1][0].row ? 1 : 0;
    var icol = parseInt(selectedCell[0][0].attributes.col.value) + patternsArray[patternSelected - 1][x].col - patternsArray[patternSelected - 1][0].col + adjustment;
    if (irow % 2 === 0 && patternsArray[patternSelected - 1][x].row < patternsArray[patternSelected - 1][0].row && (parseInt(selectedCell[0][0].attributes.row.value) % 2 === 1)) {
      icol++;
    }
    var rotation = patternsArray[patternSelected - 1][x].rotation;
    var which = patternsArray[patternSelected - 1][x].which;
    var painted = (grid.state[irow] != undefined && grid.state[irow][icol] != undefined) ? grid.state[irow][icol].pentagonSelected[which] : false;
    return {
      irow: irow,
      adjustment: adjustment,
      icol: icol,
      rotation: rotation,
      which: which,
      painted: painted
    };
}

// The pentagons
cells.selectAll ("path.pentagon")
    .data([0,1])
    .enter()
    .append ("path")
    .attr ("class","pentagon")
    .attr ("d", function (d,i,j) {
        var irow = data[j][0];
        var icol = data[j][1];
        return grid.pentagonPath(irow,icol,d);
    })
    .attr("fill", "#eeeeee")
    .attr("originalColor", "#eeeeee")
    .on ("click", function (d,i,j) {
      // If no pattern is selected, paint hexagons one by one, selecting or deselecting (depending on the previous state)
      if (!patternSelected) {
        // Get row and col of pentagon, and alter it's current state
        // the attribute originalColor is used to preserve the colors when redrawing grid
        var irow = data[j][0];
        var icol = data[j][1];
        var sel = !grid.state[irow][icol].pentagonSelected[i];
        grid.state[irow][icol].pentagonSelected[i] = sel;
        d3.select(this).classed("selected", sel);
        if (sel) {
          d3.select(this).attr("fill", paintingColor);
          d3.select(this).attr("originalColor", paintingColor);
        } else {
          d3.select(this).attr("fill", "#eeeeee");
        }
      }
      // If a pattern is selected at the menu, paint the grid respecting the selected pattern
      else {
        // Select starting cell, define a variable to store if any of the pentagons that will belong to the pattern
        // is already colored. For all the pentagons that are part of the pattern, check conditions to see if they are
        // available to be painted. The definePatternPaintingValues function is used to get all the data needed to paint the patterns.
        var selectedCell = d3.select(this.parentNode);
        var alreadyPainted = false;
        for (var x = 0; x < patternsArray[patternSelected - 1].length; x++) {
          var object = definePatternPaintingValues(selectedCell, x);
          var cellToUpdate = d3.selectAll("g.cell[row='"+object.irow+"'][col='"+object.icol+"']")[0][0];
          var updatedCellRotation = (cellToUpdate === undefined) ? undefined : parseInt(cellToUpdate.attributes.rotation.value);
          if (object.painted || ((updatedCellRotation !== object.rotation) &&
             (grid.state[object.irow][object.icol].pentagonSelected[0] || grid.state[object.irow][object.icol].pentagonSelected[1]))) {
            alreadyPainted = true;
            break;
          }
        }
        // In case the pattern really fits the grid, iterate through the grid again, now coloring respecting the pattern selected
        // changing the fill, the originalColor and adding the class selected to each pentagon. In case it don't fit, clicking don't
        // alter the grid.
        if (!alreadyPainted) {
          for (var x = 0; x < patternsArray[patternSelected - 1].length; x++) {
            var object = definePatternPaintingValues(selectedCell, x);
            grid.state[object.irow][object.icol].pentagonSelected[object.which] = !object.painted;
            var updatedCell = d3.selectAll("g.cell[row='"+object.irow+"'][col='"+object.icol+"']");
            grid.state[object.irow][object.icol].rotation = object.rotation;
            updatedCell.selectAll("path.pentagon")
                .transition()
                .duration(1000)
                .attr ("d", function (d,i,j) {
                    return grid.pentagonPath(object.irow,object.icol,d);
                });
            updatedCell.attr("rotation", grid.state[object.irow][object.icol].rotation);
            updatedCell.selectAll("path.pentagon")[0][object.which].attributes.fill.value = paintingColor;
            updatedCell.selectAll("path.pentagon")[0][object.which].attributes.originalColor.value = paintingColor;
            updatedCell.selectAll("path.pentagon")[0][object.which].attributes.class.nodeValue += " selected";
          }
        }
      }
    })
    .on("mouseenter", function(d, i, j) {
      // Used to show the user a preview of the pattern selected on the grid. If the selected pattern actually fits the grid,
      // paint the pattern temporarily on the grid. For permanent painting the user has to click on the grid. In case the
      // selected pattern dont fit the grid on the current location of the mouse, color everything that is avaliable to
      // paint the pattern in red.
      if (patternSelected) {
        var objects = [];
        var fitInGrid = true;
        var selectedCell = d3.select(this.parentNode);
        for (var x = 0; x < patternsArray[patternSelected - 1].length; x++) {
          var object = definePatternPaintingValues(selectedCell, x);
          if (d3.selectAll("g.cell[row='"+object.irow+"'][col='"+object.icol+"']")[0].length > 0) {
            var updatedCellRotation = parseInt(d3.selectAll("g.cell[row='"+object.irow+"'][col='"+object.icol+"']")[0][0].attributes.rotation.value);
            objects.push(object);
            if (object.painted || ((updatedCellRotation !== object.rotation) &&
               (grid.state[object.irow][object.icol].pentagonSelected[0] || grid.state[object.irow][object.icol].pentagonSelected[1]))) {
              fitInGrid = false;
            }
          } else {
            fitInGrid = false;
          }
        }
        for (var x = 0; x < objects.length; x++) {
            var updatedCell = d3.selectAll("g.cell[row='"+objects[x].irow+"'][col='"+objects[x].icol+"']");
            grid.state[objects[x].irow][objects[x].icol].rotation = objects[x].rotation;
            updatedCell.selectAll("path.pentagon")
                .transition()
                .duration(500)
                .attr ("d", function (d,i,j) {
                    return grid.pentagonPath(objects[x].irow,objects[x].icol,d);
                });
            updatedCell.selectAll("path.pentagon")[0][objects[x].which].attributes.fill.value = (!fitInGrid) ? "red" : paintingColor;
        }
      }
    })
    .on("mouseleave", function(d, i, j) {
      // Adjust the grid to the previous state. Use the originalColor attribute to restore all pentagons of the grid
      // to the color used when they were painted
      for (var key1 in grid.state) {
        for (var key2 in grid.state[key1]) {
          for (var key3 in grid.state[key1][key2]["pentagonSelected"]) {
            var updatedCell = d3.selectAll("g.cell[row='"+key1+"'][col='"+key2+"']");
            var updatedPentagon = updatedCell.selectAll("path.pentagon");
            grid.state[key1][key2].rotation = parseInt(updatedCell[0][0].attributes.rotation.value);
            updatedCell.selectAll("path.pentagon")
                .transition()
                .duration(500)
                .attr ("d", function (d,i,j) {
                    return grid.pentagonPath(key1,key2,d);
                });
            updatedPentagon[0][key3].attributes.fill.value = "#eeeeee";
            if (updatedPentagon[0][key3].attributes.class.nodeValue == "pentagon selected") {
              updatedPentagon[0][key3].attributes.fill.value = updatedPentagon[0][key3].attributes.originalColor.value;
            }
          }
        }
      }
    });

// The hexagons
var hexa = cells.append ("path")
    .attr ("class", "hexagonFrame")
    .attr ("d", function(d,i) { return grid.hexagonPath(d[0],d[1]);})
    .on ("click", function (d,i) {
        if (!patternSelected) {
          // get the group
          var group = d3.select(this.parentNode);
          // modify rotation of the cell
          var irow = d[0];
          var icol = d[1];
          grid.state[irow][icol].rotation = (grid.state[irow][icol].rotation + 1) % 3;
          // Redraw the two pentagons
          group.selectAll("path.pentagon")
              .transition()
              .duration(1000)
              .attr ("d", function (d,i,j) {
                  return grid.pentagonPath(irow,icol,d);
              });
          group.attr("rotation", grid.state[irow][icol].rotation);
        }
    });


// Color Picker

// Colors of the color picker
var colorPallete = ["#FFFF00", "#A2F300", "#00DB00", "#00B7FF", "#1449C4", "#4117C7", "#820AC3", "#DB007C", "#FF7400"];
// Color used to paint the pentagons (individualy or as a pattern)
var paintingColor = colorPallete[0];

// Auxiliar function used to calculate rectangles width for color picker
function calcRectWidth() {
    var gridFirstElement = (grid.vertex(0, 0, 8));
    var gridLastElement = (grid.vertex(0, grid.columns - 1, 4));
    return (gridLastElement[0] - gridFirstElement[0]) / colorPallete.length;
}

// Element used to indicate the selected color on the color picker (black rectangle behind the color picker)
var selectedColor = svg.append("rect")
  .attr("class", "activeColor")
  .attr("x", function(d, i) {
    var gridFirstElement = (grid.vertex(0, 0, 8));
    return gridFirstElement[0];
  })
  .attr("y", function(d, i) {
    return height[1] + 50;
  })
  .attr("width", function(d, i) {
    return calcRectWidth();
  })
  .attr("height", 33)
  .attr("fill", "black");

// The color picker. On click change painting color to selected color and translates
// black rectangle behind it through scene to indicate selected color
var colorPicker = svg.selectAll("rect.color")
  .data(colorPallete)
  .enter()
  .append("rect")
  .attr("class", "color")
  .attr("x", function(d, i) {
    var gridFirstElement = (grid.vertex(0, 0, 8));
    var rectWidth = calcRectWidth();
    return gridFirstElement[0] + rectWidth * i;
  })
  .attr("y", function(d, i) {
    return height[1] + 50;
  })
  .attr("width", function(d, i) {
    return calcRectWidth();
  })
  .attr("height", function(d, i) {
    return 30;
  })
  .attr("fill", function(d, i) {
    return d;
  })
  .on("click", function(d, i) {
    paintingColor = d;
    d3.selectAll("path.pentagonPatternMini").transition().duration(300).attr("fill", paintingColor);
    d3.selectAll("path.zoomed").transition().duration(300).attr("fill", paintingColor);
    d3.select("rect.activeColor").transition().duration(500).attr("x", function(x, y) {
      var gridFirstElement = (grid.vertex(0, 0, 8));
      var rectWidth = calcRectWidth();
      return gridFirstElement[0] + rectWidth * i;
    });
  });



// Pattern Menu

// Visual division of hexagonal grid and pattern selector (line between grid and pattern selector)
var division = svg.append("rect")
  .attr("class", "division")
  .attr("x", function(d, i) {
    return width[0] + 49;
  })
  .attr("y", function(d, i) {
    var gridLastElement = (grid.vertex(0, grid.columns - 1, 0));
    return gridLastElement[1] + 20;
  })
  .attr("width", 2)
  .attr("height", function(d, i) {
    var gridFirstElement = (grid.vertex(0, grid.columns - 1, 0));
    var gridLastElement = (grid.vertex(grid.rows - 1, 0, 6));
    return gridLastElement[1] - gridFirstElement[1] - 40;
  })
  .attr("fill", "#bdbdbd");

// Auxiliar function to calculate centroids. Takes the centroid of the boundingBox. Used on patterns interface
function getBoundingBoxCenter(selection) {
    // get the DOM element from a D3 selection
    // you could also use "this" inside .each()
    var element = selection.node(),
        // use the native SVG interface to get the bounding box
        bbox = element.getBBox();
    // return the center of the bounding box
    return [bbox.x + bbox.width/2, bbox.y + bbox.height/2];
}

// Auxiliar function to get bBox width and height
function getBoundingBoxWidthAndHeight(selection) {
    var element = selection.node(),
        bbox = element.getBBox();
    return [bbox.width, bbox.height];
}

// Pattern selector rectangles. They are used to select the pattern the user is going to use
// to paint the hexagonal grid. Also used to show the pattern selected zoomed at the screen
var selectedPattern = svg.selectAll("rect.selectedPattern")
  .data([0,0,0,0,0,0,0,0,0,0,0,0])
  .enter()
  .append("rect")
  .attr("class", "selectedPattern")
  .attr("id", function(d, i) {
    return "selectedPattern" + i;
  })
  .attr("x", function(d, i) {
    var gridLastElement = (grid.vertex(0, grid.columns - 1, 2));
    var posicao = i % 3;
    return gridLastElement[0] + 100 + (posicao * 104);
  })
  .attr("y", function(d, i) {
    var gridLastElement = (grid.vertex(0, grid.columns - 1, 2));
    var posicao = Math.floor(i / 3);
    return gridLastElement[1] + (posicao * 104);
  })
  .on("click", function(d, i) {
    if (i != 0 && i <= patternsArray.length) {
      patternSelected = i;
      var patterns = d3.selectAll("rect.selectedPattern");
      var first = patterns[0][0];
      var last = patterns[0][patterns[0].length - 1];
      var radius = ((parseFloat(last.attributes.x.value) + parseFloat(last.attributes.width.value)) - parseFloat(first.attributes.x.value)) / 2 - 20;
      d3.select("circle.selectedPatternZoom").transition().duration(300).attr("r", function(x, y) {
        return radius;
      });
      d3.selectAll("path.pentagonPattern").classed("zoomed", false).transition().duration(300).attr("fill", "transparent").attr("stroke", "transparent");
      d3.selectAll("path#pentagonPattern" + (i-1)).classed("zoomed", true).transition().duration(300).attr("fill", paintingColor).attr("stroke", "black");
      d3.selectAll("rect.selectedPattern").attr("stroke", "#151515");
      d3.select(this).attr("stroke", "red");
    } else if (i == 0){
      patternSelected = 0;
      d3.select("circle.selectedPatternZoom").transition().duration(300).attr("r", 0);
      d3.selectAll("path.pentagonPattern").classed("zoomed", false).transition().duration(300).attr("fill", "transparent").attr("stroke", "transparent");
      d3.selectAll("rect.selectedPattern").attr("stroke", "#151515");
      d3.select(this).attr("stroke", "red");
    }
  })
  .attr("width", 100)
  .attr("height", 100)
  .attr("fill", "#eeeeee")
  .attr("stroke", function(d, i) {
    if (i == 0) return "red";
    return "#151515";
  })
  .attr("stroke-width", 2);


// Selected pattern zoom circle. It's position is calculated based on other interface elements
var selectedPatternZoom = svg.append("circle")
  .attr("class", "selectedPatternZoom")
  .attr("cx", function(d, i) {
    var patterns = d3.selectAll("rect.selectedPattern");
    var first = patterns[0][0];
    var last = patterns[0][patterns[0].length - 1];
    return parseFloat(first.attributes.x.value) + ((parseFloat(last.attributes.x.value) + parseFloat(last.attributes.width.value)) - parseFloat(first.attributes.x.value)) / 2;
  })
  .attr("cy", function(d, i) {
    var patterns = d3.selectAll("rect.selectedPattern");
    var last = patterns[0][patterns[0].length - 1];
    var end = height[1] + 50;
    var cy = parseFloat(last.attributes.y.value) + parseFloat(last.attributes.height.value) + (end - (parseFloat(last.attributes.height.value) + parseFloat(last.attributes.y.value))) / 2;
    return cy;
  })
  .attr("r", function(d, i) {
    var patterns = d3.selectAll("rect.selectedPattern");
    var first = patterns[0][0];
    var last = patterns[0][patterns[0].length - 1];
    return 0;
    return ((parseFloat(last.attributes.x.value) + parseFloat(last.attributes.width.value)) - parseFloat(first.attributes.x.value)) / 2 - 20;
  })
  .attr("fill", "#eeeeee")
  .attr("stroke", "#151515")
  .attr("stroke-width", 2);


// Function used to draw patterns miniatures into the boxes and the patterns zoom display
function drawPatternsMiniaturesAndZoom() {

  // Remove all drawn miniatures (useful when redrawing pattern interface after user alteration)
  d3.selectAll("g.gPentagonPatternMini").remove();
  for (var k = 0; k < patternsArray.length; k++) {

    // Draw pattern miniature
    var patternDraw = svg.selectAll("path.patternMini")
      .data(patternsArray[k])
      .enter()
      .append("path")
      .attr("class", "patternMini")
      .attr("d", function(d, i) {
        patternsGrid.state[d.row][d.col].rotation = d.rotation;
        return patternsGrid.pentagonPath(d.row, d.col, d.which);
      })
      .attr("fill", "purple")
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    // Combine all paths into a single path
    var combinedD = "";
    d3.selectAll("path.patternMini")
      .each(function() { combinedD += d3.select(this).attr("d"); });

    // Draw combined path
    svg.append("g")
      .attr("id", "gPentagonPatternMini" + k)
      .attr("class", "gPentagonPatternMini")
      .append("path")
      .attr("id", "pentagonPatternMini" + k)
      .attr("class", "pentagonPatternMini")
      .attr("d", combinedD)
      .attr("fill", paintingColor)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("pattern", k)
      .on("click", function(d, i) {
        patternSelected = parseInt(d3.select(this).attr("pattern")) + 1;
        var thisK = parseInt(d3.select(this).attr("pattern"));
        var patterns = d3.selectAll("rect.selectedPattern");
        var first = patterns[0][0];
        var last = patterns[0][patterns[0].length - 1];
        var radius = ((parseFloat(last.attributes.x.value) + parseFloat(last.attributes.width.value)) - parseFloat(first.attributes.x.value)) / 2 - 20;
        d3.select("circle.selectedPatternZoom").transition().duration(300).attr("r", function(x, y) {
          return radius;
        });
        d3.selectAll("path.pentagonPattern").classed("zoomed", false).transition().duration(300).attr("fill", "transparent").attr("stroke", "transparent");
        d3.selectAll("path#pentagonPattern" + thisK).classed("zoomed", true).transition().duration(300).attr("fill", paintingColor).attr("stroke", "black");
        d3.selectAll("rect.selectedPattern").attr("stroke", "#151515");
        d3.select("rect#selectedPattern" + (thisK+1)).attr("stroke", "red");
      });

    // Delete the independent paths
    d3.selectAll("path.patternMini").remove();

    // Select combined path group and the rectangle it belongs to in the interface
    var gSelection = d3.select("g#gPentagonPatternMini" + k);
    var rectSelection = d3.select("rect#selectedPattern" + (k+1));

    // Calculate their centroids based on the boundingBox
    var centroidG = getBoundingBoxCenter(gSelection);
    var centroidRect = getBoundingBoxCenter(rectSelection);

    // Get boundingBox width and height
    var pathSelection = d3.select("path#pentagonPatternMini" + k);

    var pathBBox = getBoundingBoxWidthAndHeight(pathSelection);
    var rectBBox = getBoundingBoxWidthAndHeight(rectSelection);

    var factor = 1.0;
    do {
      factor -= 0.1;
      var auxiliarPath = pathBBox.slice();
      auxiliarPath[0] *= factor;
      auxiliarPath[1] *= factor;
    } while (auxiliarPath[0] >= rectBBox[0] || auxiliarPath[1] >= rectBBox[1]);

    // Scale paths in place and move path group to center of the rectangle
    d3.select("path#pentagonPatternMini" + k).attr("transform", "translate(" + (-centroidG[0]*(factor-1)) + "," + (-centroidG[1]*(factor-1)) + ") scale("+factor+")");
    d3.select("g#gPentagonPatternMini" + k).attr("transform", "translate(" + (centroidRect[0] - centroidG[0]) + "," + (centroidRect[1] - centroidG[1]) + ")");
  }


  // Remove all drawn zoomed patterns (useful when redrawing pattern interface after user alteration)
  d3.selectAll("g.gPentagonPatternZoomed").remove();
  for (var k = 0; k < patternsArray.length; k++) {

    // Draw pattern zoomed
    var patternDraw = svg.selectAll("path.pattern")
      .data(patternsArray[k])
      .enter()
      .append("path")
      .attr("class", "pattern")
      .attr("d", function(d, i) {
        patternsGrid.state[d.row][d.col].rotation = d.rotation;
        return patternsGrid.pentagonPath(d.row, d.col, d.which);
      })
      .attr("fill", "purple")
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    // Combine all paths into a single path
    var combinedD = "";
    d3.selectAll("path.pattern")
      .each(function() { combinedD += d3.select(this).attr("d"); });

    // Draw combined path
    svg.append("g")
      .attr("id", "gPentagonPatternZoomed" + k)
      .attr("class", "gPentagonPatternZoomed")
      .append("path")
      .attr("id", "pentagonPattern" + k)
      .attr("class", "pentagonPattern")
      .attr("d", combinedD)
      .attr("fill", "transparent")
      .attr("stroke", "transparent")
      .attr("stroke-width", 1);

    // Delete the independent paths
    d3.selectAll("path.pattern").remove();

    // Select combined path and calculate it's centroid.
    // Calculates zoom circle centroid (it's center: coordenates of cx and cy)
    var gSelection = d3.select("g#gPentagonPatternZoomed" + k);
    var centroidG = getBoundingBoxCenter(gSelection);
    var centroidZoom = [parseFloat(d3.selectAll("circle.selectedPatternZoom").attr("cx")),
                        parseFloat(d3.selectAll("circle.selectedPatternZoom").attr("cy"))];

    // Get boundingBox width and height
    var pathSelection = d3.select("path#pentagonPattern" + k);
    var pathBBox = getBoundingBoxWidthAndHeight(pathSelection);
    var circleBBox = [300, 300];

    var factor = 1.1;
    do {
      factor -= 0.1;
      var auxiliarPath = pathBBox.slice();
      auxiliarPath[0] *= factor;
      auxiliarPath[1] *= factor;
    } while (auxiliarPath[0] >= circleBBox[0] || auxiliarPath[1] >= circleBBox[1]);

    factor -= 0.1;

    // Move path centroid to zoom circle center
    d3.select("path#pentagonPattern" + k).attr("transform", "translate(" + (-centroidG[0]*(factor-1)) + "," + (-centroidG[1]*(factor-1)) + ") scale("+factor+")");
    d3.select("g#gPentagonPatternZoomed" + k).attr("transform", "translate(" + (centroidZoom[0] - centroidG[0]) + "," + (centroidZoom[1] - centroidG[1]) + ")");
  }

  if (patternSelected) {
    var patterns = d3.selectAll("rect.selectedPattern");
    var first = patterns[0][0];
    var last = patterns[0][patterns[0].length - 1];
    var radius = ((parseFloat(last.attributes.x.value) + parseFloat(last.attributes.width.value)) - parseFloat(first.attributes.x.value)) / 2 - 20;
    d3.select("circle.selectedPatternZoom").transition().duration(300).attr("r", function(x, y) {
      return radius;
    });
    d3.selectAll("path.pentagonPattern").classed("zoomed", false).transition().duration(300).attr("fill", "transparent").attr("stroke", "transparent");
    d3.selectAll("path#pentagonPattern" + (patternSelected - 1)).classed("zoomed", true).transition().duration(300).attr("fill", paintingColor).attr("stroke", "black");
    d3.selectAll("rect.selectedPattern").attr("stroke", "#151515");
    d3.select("rect#selectedPattern" + (patternSelected)).attr("stroke", "red");
  }
}

drawPatternsMiniaturesAndZoom();
