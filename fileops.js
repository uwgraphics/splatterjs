// ## FILEOPS.js
//
// Methods to make loading files easier

// ### loadFile(text, dataStart, xCol, yCol)
//
// Given the full-text of a file, the row number the data starts at, the column numbers 
// of the x- and y-axis, parse the data and store it in the GPU.  All column and row 
// numbers are 0-indexed.  Will clear all previously-loaded data out of the GPU.

var loadFile = function(text, dataStart, xCol, yCol, grpCol) {
  dataReady = false;
  
  // if data has been previously loaded, delete any buffers
  ds.groups.forEach(function(v,i) {
    v.buf.delete();
    delete v.buf;
  });
  
  // Leave the old data to the garbage collector, and create new groups
  // (see <http://stackoverflow.com/questions/1232040/> for discussion).
  ds.groups = [];
  ds.groupNames = [];
  
  ds.groupCol = grpCol;
  var delimiter = ",";
  
  var lines = text.trim("\r").split("\n");
  for (var i = 0; i < lines.length; i++) {
    lines[i] = lines[i].split(delimiter);
  }
  
  ds.numCols = lines[dataStart].length;
  ds.numRows = lines.length;
  ds.data = [];
  
  // Set the initial bounds.
  for (var i = 0; i < 2; i++) {
    bounds[i] = [Infinity, -Infinity];
  }
  
  // Parse values into arrays, splitting on unique groupBy elements.
  var numGroups = 0;
  for (var i = dataStart; i < ds.numRows; i++) {
    // If group-by was not selected (-1), force everything into the first group.
    // Otherwise, slice data by the group-by column.
    var thisGroup = 0;
    if (grpCol != -1) {
      thisGroupName = lines[i][ds.groupCol]
      if (ds.groupNames.indexOf(thisGroupName) == -1)
        ds.groupNames.push(thisGroupName);
        
      thisGroup = ds.groupNames.indexOf(thisGroupName);
    }
    
    if (!ds.groups[thisGroup]) {
      ds.groups[thisGroup] = {};
      ds.groups[thisGroup].data = [];
      numGroups++;
    }
    
    // Iterate through all columns of the data, pulling out the relevant columns (xCol, yCol)
    var thisRow = [];
    for (var j = 0; j < ds.numCols; j++) {
      if (j == xCol) {
        thisRow[0] = lines[i][j];
      
        bounds[0][0] = Math.min(lines[i][j], bounds[0][0]);
        bounds[0][1] = Math.max(lines[i][j], bounds[0][1]);
      }
      
      // No `else`; user might have selected identity relation.
      if (j == yCol) {
        thisRow[1] = lines[i][j];
      
        bounds[1][0] = Math.min(lines[i][j], bounds[1][0]);
        bounds[1][1] = Math.max(lines[i][j], bounds[1][1]);
      }
    }
    
    // add arbitrary z- coordinate to help select particular points as outliers to show
    thisRow.push(Math.random());
    
    // push to master dataset in particular group
    ds.groups[thisGroup].data.push(thisRow);
    
  }
  
  // GL.Buffer (lightgl.js implementation) expects data in lists of lists, so
  // allocate buffers for each group.
  ds.groups.forEach(function(v,i) {
    v.buf = new GL.Buffer(gl.ARRAY_BUFFER, Float32Array);
    v.buf.data = v.data;
    v.buf.compile(gl.STATIC_DRAW);
    v.textures = v.textures || [];
  });
  
  // get colors for all the groups
  ds.colors = getColorsNew(74, numGroups);
  
  // Set flag to allow rendering to continue.
  dataReady = true;
};

// ### loadFileOld(text);
//
// Legacy function to load a datafile; currently hard-coded grouping column to the third column.
var loadFileOld = function(text) {
  dataReady = false;
  
  // The group column `groupCol` and `hasHeader` should be dynamically-/user-set
  ds.groupCol = 2;
  var hasHeader = true;

  // Split lines into arrays based on commas.
  var delimiter = ",";
  var lines = text.trim("\r").split("\n");
  for (var i = 0; i < lines.length; i++) {
    lines[i] = lines[i].split(delimiter);
  }
  
  // Parse the header rows.
  var header;
  if (lines.length > 0 && lines[0].length > 0) {
    if (hasHeader || !$.isNumeric(lines[0][0])) {
      header = lines[0];
      lines[0] = lines[lines.length - 1];
      lines.pop();
    }
  }
  
  // If no header exists, give arbitrary names to the columns.
  if (!header) {
    header = [];
    for (var i = 0; i < lines[0].length; i++) 
      header[i] = "Column" + i;
  }
  
  ds.colNames = header;
  ds.numCols = header.length;
  ds.numRows = lines.length;
  ds.data = [];
  
  // Set the initial bounds.
  for (var i = 0; i < ds.numCols; i++) {
    if (i == ds.groupCol)
      continue;

    bounds[i] = [Infinity, -Infinity];
  }
  
  // Parse values into arrays, splitting on unique groupBy elements.
  var numGroups = 0;
  for (var i = 0; i < ds.numRows; i++) {
    // Remove the grouping column from the data.
    var thisGroup = lines[i][ds.groupCol];
    if (!ds.groups[thisGroup]) {
      ds.groups[thisGroup] = {};
      ds.groups[thisGroup].data = [];
      numGroups++;
    }
    
    lines[i].splice(ds.groupCol, 1);
    // add arbitrary z- coordinate to help select particular points as outliers to show
    lines[i].push(Math.random());
    ds.groups[thisGroup].data.push(lines[i]);
  
    // calculate global bounds for the viewport
    for (var j = 0; j < ds.numCols; j++) {
      if (j == ds.groupCol)
        continue;
      
      bounds[j][0] = Math.min(lines[i][j], bounds[j][0]);
      bounds[j][1] = Math.max(lines[i][j], bounds[j][1]);
    }
  }
  
  // GL.Buffer (lightgl.js implementation) expects data in lists of lists, so
  // allocate buffers for each group.
  ds.groups.forEach(function(v,i) {
    v.buf = new GL.Buffer(gl.ARRAY_BUFFER, Float32Array);
    v.buf.data = v.data;
    v.buf.compile(gl.STATIC_DRAW);
    v.textures = [];
  });
  
  // get colors for all the groups
  ds.colors = getColorsNew(74, numGroups);
  
  // Set flag to allow rendering to continue.
  dataReady = true;
};