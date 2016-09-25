var patternsDefault = [
  [
    {
      row: 0,
      col: 1,
      rotation: 0,
      which: 1
    },
    {
      row: 1,
      col: 0,
      rotation: 2,
      which: 0
    },
    {
      row: 1,
      col: 1,
      rotation: 1,
      which: 1
    }
  ],
  [
    {
      row: 1,
      col: 2,
      rotation: 2,
      which: 0
    },
    {
      row: 1,
      col: 3,
      rotation: 0,
      which: 0
    },
    {
      row: 1,
      col: 4,
      rotation: 1,
      which: 1
    }
  ],
  [
    {
      row: 1,
      col: 5,
      rotation: 1,
      which: 0
    },
    {
      row: 1,
      col: 6,
      rotation: 0,
      which: 0
    },
    {
      row: 1,
      col: 7,
      rotation: 2,
      which: 1
    }
  ],
  [
    {
      row: 2,
      col: 0,
      rotation: 2,
      which: 0
    },
    {
      row: 2,
      col: 1,
      rotation: 0,
      which: 1
    },
    {
      row: 2,
      col: 2,
      rotation: 1,
      which: 1
    },
    {
      row: 3,
      col: 0,
      rotation: 1,
      which: 0
    },
    {
      row: 3,
      col: 1,
      rotation: 0,
      which: 0
    },
    {
      row: 3,
      col: 2,
      rotation: 2,
      which: 1
    }
  ],
  [
    {
      row: 2,
      col: 4,
      rotation: 2,
      which: 0
    },
    {
      row: 3,
      col: 3,
      rotation: 1,
      which: 0
    },
    {
      row: 3,
      col: 4,
      rotation: 0,
      which: 0
    },
    {
      row: 3,
      col: 4,
      rotation: 0,
      which: 1
    },
    {
      row: 3,
      col: 5,
      rotation: 1,
      which: 1
    },
    {
      row: 4,
      col: 5,
      rotation: 2,
      which: 1
    }
  ],
  [
    {
      row: 1,
      col: 0,
      rotation: 1,
      which: 0
    },
    {
      row: 1,
      col: 1,
      rotation: 0,
      which: 1
    },
    {
      row: 1,
      col: 2,
      rotation: 2,
      which: 1
    },
    {
      row: 2,
      col: 0,
      rotation: 2,
      which: 0
    },
    {
      row: 2,
      col: 1,
      rotation: 0,
      which: 0
    },
    {
      row: 2,
      col: 2,
      rotation: 1,
      which: 1
    }
  ],
  [
    {
      row: 0,
      col: 0,
      rotation: 0,
      which: 1
    },
    {
      row: 0,
      col: 1,
      rotation: 0,
      which: 1
    },
    {
      row: 1,
      col: 0,
      rotation: 0,
      which: 0
    },
    {
      row: 1,
      col: 0,
      rotation: 0,
      which: 1
    },
    {
      row: 2,
      col: 0,
      rotation: 0,
      which: 0
    },
    {
      row: 2,
      col: 1,
      rotation: 0,
      which: 0
    }
  ]
];

// Function used to copy patterns from a pattern data structure
function copyPatterns(pattern) {
  var newPattern = [];
  for (var key1 = 0; key1 < pattern.length; key1++) {
    newPattern.push([]);
    for (var key2 = 0; key2 < pattern[key1].length; key2++) {
      var adjustment = pattern[key1][0].row % 2;
      var rowAdjustment = (adjustment) ? (adjustment + 10) : 10;
      var colCondition = (pattern[key1][key2].row > pattern[key1][0].row)
          && (pattern[key1][key2].row % 2 == 1);
      var colAdjustment = (adjustment && colCondition) ? (10 - adjustment) : 10;
      newPattern[key1].push({
        row: pattern[key1][key2].row + rowAdjustment,
        col: pattern[key1][key2].col + colAdjustment,
        rotation: pattern[key1][key2].rotation,
        which: pattern[key1][key2].which
      });
    }
  }
  return newPattern;
}

var patternsDefault2 = [[{"row":10,"col":11,"rotation":0,"which":1},{"row":11,"col":10,"rotation":2,"which":0},{"row":11,"col":11,"rotation":1,"which":1}],[{"row":11,"col":12,"rotation":2,"which":0},{"row":11,"col":13,"rotation":0,"which":0},{"row":11,"col":14,"rotation":1,"which":1}],[{"row":11,"col":15,"rotation":1,"which":0},{"row":11,"col":16,"rotation":0,"which":0},{"row":11,"col":17,"rotation":2,"which":1}],[{"row":12,"col":10,"rotation":2,"which":0},{"row":12,"col":11,"rotation":0,"which":1},{"row":12,"col":12,"rotation":1,"which":1},{"row":13,"col":10,"rotation":1,"which":0},{"row":13,"col":11,"rotation":0,"which":0},{"row":13,"col":12,"rotation":2,"which":1}],[{"row":12,"col":14,"rotation":2,"which":0},{"row":13,"col":13,"rotation":1,"which":0},{"row":13,"col":14,"rotation":0,"which":0},{"row":13,"col":14,"rotation":0,"which":1},{"row":13,"col":15,"rotation":1,"which":1},{"row":14,"col":15,"rotation":2,"which":1}],[{"row":11,"col":10,"rotation":1,"which":0},{"row":11,"col":11,"rotation":0,"which":1},{"row":11,"col":12,"rotation":2,"which":1},{"row":12,"col":10,"rotation":2,"which":0},{"row":12,"col":11,"rotation":0,"which":0},{"row":12,"col":12,"rotation":1,"which":1}],[{"row":10,"col":10,"rotation":0,"which":1},{"row":10,"col":11,"rotation":0,"which":1},{"row":11,"col":10,"rotation":0,"which":0},{"row":11,"col":10,"rotation":0,"which":1},{"row":12,"col":10,"rotation":0,"which":0},{"row":12,"col":11,"rotation":0,"which":0}]];
var patternsDefault3 = [[{"row":10,"col":11,"rotation":0,"which":1},{"row":11,"col":10,"rotation":2,"which":0},{"row":11,"col":11,"rotation":1,"which":1}],[{"row":12,"col":13,"rotation":2,"which":0},{"row":12,"col":14,"rotation":0,"which":0},{"row":12,"col":15,"rotation":1,"which":1}],[{"row":12,"col":16,"rotation":1,"which":0},{"row":12,"col":17,"rotation":0,"which":0},{"row":12,"col":18,"rotation":2,"which":1}],[{"row":12,"col":10,"rotation":2,"which":0},{"row":12,"col":11,"rotation":0,"which":1},{"row":12,"col":12,"rotation":1,"which":1},{"row":13,"col":10,"rotation":1,"which":0},{"row":13,"col":11,"rotation":0,"which":0},{"row":13,"col":12,"rotation":2,"which":1}],[{"row":12,"col":14,"rotation":2,"which":0},{"row":13,"col":13,"rotation":1,"which":0},{"row":13,"col":14,"rotation":0,"which":0},{"row":13,"col":14,"rotation":0,"which":1},{"row":13,"col":15,"rotation":1,"which":1},{"row":14,"col":15,"rotation":2,"which":1}],[{"row":12,"col":11,"rotation":1,"which":0},{"row":12,"col":12,"rotation":0,"which":1},{"row":12,"col":13,"rotation":2,"which":1},{"row":13,"col":11,"rotation":2,"which":0},{"row":13,"col":12,"rotation":0,"which":0},{"row":13,"col":13,"rotation":1,"which":1}],[{"row":10,"col":10,"rotation":0,"which":1},{"row":10,"col":11,"rotation":0,"which":1},{"row":11,"col":10,"rotation":0,"which":0},{"row":11,"col":10,"rotation":0,"which":1},{"row":12,"col":10,"rotation":0,"which":0},{"row":12,"col":11,"rotation":0,"which":0}]];

var patternsArray = copyPatterns(patternsDefault);
