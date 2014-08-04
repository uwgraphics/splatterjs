window.onload = main;

// create the gl context using lightgl.js
var gl = GL.create({width: 800, height: 600});

// hold compiled shaders
var shaders = [];

// `timer` holds a timer variable to handle the re-calling of gl.ondraw while waiting 
// for asynchronous loads of resources.
var timer = null;

// `timings` holds a boolean value whether we should capture timing information of 
// various operations of splatterplots for instrumentation/analysis purposes.
var timings = false;

// variables that determine the current viewport of the datapoints
var screenOffset = [0,0];
var scale = 1;
var offset = [0,0];

// calculated global bounds of all data series
var dataReady = false;
var bounds = [];

// the dataset object that represents all data series
var ds = { 
  data: [],
  groups: [],  // should contain objects that have 'textures', 'data', and 'buffer' fields
  colors: [[0.0, 0.580, 0.686], [0.996, 0.325, 0.290]],
  textures: [],
  colNames: [],
  numCols: 0,
  numRows: 0,
  ready: false 
};

// holds a full quad (e.g. -1,-1 to 1,1) for texture writing
var plane; 

// holds the 'max' texture name that has the maximum value in its (0,0) coordinate
// (can change based on the size of the canvas when ping-ponging)
var maxTexName = 'max1';
var maxComputed = false;

// `maxTexture` and `maxTexture2` holds the global maximum texture
var maxTexture = [];
var maxTextureNum = -1;

// rendering variables (should be user-controlled eventually)
var sigma = 15.0;
var threshold = 0.5;
var clutterRadius = 25;
var outlierSize = 2.5;

// Helper methods for getting performance information
var timeStart = function(name) {
  if (timings) {
    console.time(name);
  }
}

var timeStop = function(name) {
  if (timings) {
    console.timeEnd(name);
  }
}

// ### setZoomPan();
//
// Sets up the transformation matrix for the incoming datapoints
var setZoomPan = function() {
  gl.loadIdentity();
  gl.translate(screenOffset[0], screenOffset[1], 0);
  gl.scale(scale, scale, 1);
  gl.translate(offset[0], offset[1], 0);
};

// ### initTextures();
//
// Instantiates the textures for first draw for each data series (group).
var textureExists = false;
var initTextures = function() {
  // globally supported by WebGL browsers, but at a loss of precision
  var options = {
    filter:    gl.NEAREST,
    format:    gl.RGBA, 
    type:      gl.UNSIGNED_BYTE
  };
  
  // Higher precision, but requires support from the OES_texture_float extension.
  var floatOpts = {
    filter:    gl.NEAREST,
    format:    gl.RGBA,
    type:      gl.FLOAT
  };

  // initialize textures given width + height
  ds.groups.forEach(function(grp,i) {
    // Textures for drawing density graphs and KDE
    grp.textures['freq0'] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
    grp.textures['freq1'] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
    
    // Textures for computing the maximum value in the blurred textures
    grp.textures['max0'] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
    grp.textures['max1'] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
    
    // Textures for computing the distance to the threshold boundary using the 
    // jump-flooding algorithm.
    grp.textures['dist0'] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
    grp.textures['dist1'] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
    
    // The final colored texture to be blended with other data series.
    grp.textures['rgb'] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
    
    // The texture that holds the selected outlier points
    grp.textures['outliers'] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
    grp.textures['outlierpts'] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
  });
  
  // Initialize the global maximum textures
  maxTexture[0] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
  maxTexture[1] = new GL.Texture(gl.canvas.width, gl.canvas.height, floatOpts);
  
  // Initialize a utility framebuffer
  ds.fbo = gl.createFramebuffer();
  
  // Clean up and unbind any bound textures/framebuffers
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  
  // Unset variable set by lightgl.js in TEXTURE.js;
  // see <http://code.google.com/p/chromium/issues/detail?id=125481>
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  
  textureExists = true;
};

// ### clearTextures(datasetGroup);
//
// On redraw, clear all values from all textures from the given dataset group (e.g. one of the 
// elements from `ds.groups`).
var clearTextures = function(grp) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, ds.fbo);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  
  for (var texture in grp.textures) {
    // Skip processing max textures so that they always contain the maximum blurred value of each dataset.
    // Set `maxComputed` to false to force rebuilding the texture.
    if (maxComputed && texture.indexOf("max") != -1) continue;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, grp.textures[texture].id, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
  
  // clear the max texture if the max has not been computed
  if (!maxComputed) {
    for (var i = 0; i < 2; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, maxTexture[i].id, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
  }
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

// ### drawPoints();
//
// Draws the points as a conventional scatterplot.  Useful to see overdraw.
var drawPoints = function() {
  if (!shaders['testlgl']) {
    if (!timer)
      timer = setTimeout("gl.ondraw()", 300);
    return;
  }
  
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  var shader = shaders['testlgl'];
  shader.uniforms({pointSize: 4});
  
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  
  // Set the transformation matrix for the incoming points
  gl.pushMatrix();
  gl.matrixMode(gl.MODELVIEW);
  setZoomPan();
  
  // Draw all data series as one color
  ds.groups.forEach(function(v,i) {
    var vertBuffer = [];
    vertBuffer['position'] = v.buf;
    shader.drawBuffers(vertBuffer, null, gl.POINTS);
  });
  
  // Remove the transformation
  gl.popMatrix();
};

// ### drawBlur();
//
// For each data series (group), compute the density at each pixel in the canvas, then 
// blur in the x- and y-directions, storing the output in `textures['max0']`.
var drawBlur = function() {
  // Determine which blur shader to use, based on the given bandwidth parameter
  var window = sigma * 3;
  var blurShader = window < 16  ? shaders['testblur16'] :
                   window < 32  ? shaders['testblur32'] :
                   window < 64  ? shaders['testblur64'] :
                   window < 128 ? shaders['testblur128'] :
                                  shaders['testblur256'];


  if (!shaders['testpt'] || !blurShader) {
    if (!timer)
      timer = setTimeout("gl.ondraw()", 300);
    return;
  }

  if (!textureExists) {
    timeStart("\tinitializing textures");
    initTextures();
    timeStop("\tinitializing textures");
  }
    
  // Clear the viewport and set a blank color for density counts.
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  ds.groups.forEach(function(grp,i) {
    timeStart("\tclearing textures");
    clearTextures(grp); 
    timeStop("\tclearing textures");
    
    // Set up point-drawing state and transformation matrix.
    gl.pushMatrix();
    gl.matrixMode(gl.MODELVIEW);
    setZoomPan();
    
    // We don't really care about a color here, we just want to make a texture that 
    // is conveying locations of points; get ready to draw points to fbo
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    
    // Draw point density to texture (`textures['freq0']`).
    timeStart("\tdrawing point density to texture");
    grp.textures['freq0'].drawTo(function() {
      var vertBuffer = [];
      vertBuffer['position'] = grp.buf;
      shaders['testpt'].uniforms({pointSize:1}).drawBuffers(vertBuffer, null, gl.POINTS);
    }); 
    timeStop("\tdrawing point density to texture");
    
    // Clean up state
    gl.bindBuffer(gl.ARRAY_BUFFER, null); // release buffer
    gl.popMatrix();
    
    var delta = [1.0 / gl.canvas.width, 1.0 / gl.canvas.height];
   
    // Start to blur points in the x direction.
    timeStart("\tbluring points in x direction");
    grp.textures['freq1'].drawTo(function() {
      grp.textures['freq0'].bind(0);
      blurShader.uniforms({
        texture: 0,
        sigma: sigma,
        offset: [1.0, 0.0],
        delta: delta
      }).draw(plane);
    });
    timeStop("\tbluring points in x direction");
    
    // Now, swap texture 2 and 1; change offset to blur in the y direction.
    timeStart("\tbluring points in y direction");
    grp.textures['freq0'].drawTo(function() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
      grp.textures['freq1'].bind(0);
      blurShader.uniforms({
        texture: 0,
        sigma: sigma,
        offset: [0.0, 1.0],
        delta: delta
      }).draw(plane);
    }); 
    timeStop("\tbluring points in y direction");
    
    // also draw to inital max texture for use there.
    timeStart("\tbluring points in y direction (repeat)");
    grp.textures['max0'].drawTo(function() {
      grp.textures['freq1'].bind(0);
      blurShader.uniforms({
        texture: 0,
        sigma: sigma,
        offset: [0.0, 1.0],
        delta: delta
      }).draw(plane);
    });
    timeStop("\tbluring points in y direction (repeat)");
  
    // clean up state
    grp.textures['freq1'].unbind(0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  });
};

// ### findMax();
//
// Use GPGPU-like minimizations to reduce the values in `textures['max0']` to the first
// two pixel values in the texture for subsequent computations.  At the end of this 
// function, the maximum value should be (0,0) of `textures['max3']`.
var findMax = function() {
  var shader = shaders['testmax'];
  if (!shader) {
    if (!timer)
      timer = setTimeout("gl.ondraw()", 300);
    return;
  }
  
  gl.disable(gl.DEPTH_TEST);
  
  var scalePerStep = 8; // shader collapses 8*8 vertices into 1
  var maxDim = Math.max(gl.canvas.width, gl.canvas.height); // default: 800px
  var numSteps = Math.floor(Math.log(maxDim) / Math.log(scalePerStep)); // default: 3 steps
  var pixAtEnd = Math.ceil(maxDim / Math.pow(scalePerStep, numSteps)); // default: 2 pixels
  
  // Calculate the maximum for each group independently.
  ds.groups.forEach(function(grp,i) {
    timeStart("\tfinding max for group " + i);
    for (var i = 0; i < numSteps; i++) {
      grp.textures['max' + (i+1) % 2].drawTo(function() {
        grp.textures['max' + i % 2].bind(0);
        shaders['testmax'].uniforms({
          texture: 0,
          delta: [1.0 / gl.canvas.width, 1.0 / gl.canvas.height]
        }).draw(plane);
        grp.textures['max' + i % 2].unbind(0);
      });
    }
    timeStop("\tfinding max for group " + i);
  });
  
  console.log("maxValue is in the max" + (numSteps % 2) + " texture, in the first " + pixAtEnd + " pixels");
  maxTexName = "max" + ((numSteps) % 2);
  maxComputed = true;
};

// ### getGlobalMax();
//
// Uses a shader to pick out the maximum value stored in all groups' textures.  
// Activated on request from the UI.
var getGlobalMax = function() {
  var shader = shaders['maxtexture'];
  if (!shader) {
    if (!timer)
      timer = setTimeout("gl.ondraw()", 300);
    return;
  }
  
  gl.disable(gl.DEPTH_TEST);
  
  var lastGrp = 0;
  ds.groups.forEach(function(grp, g) {
    maxTexture[(g + 1) % 2].drawTo(function() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
      maxTexture[g % 2].bind(0);
      grp.textures[maxTexName].bind(1);
      shader.uniforms({
        max1: 0,
        max2: 1
      }).draw(plane);
      grp.textures[maxTexName].unbind(1);
      maxTexture[g % 2].unbind(0);
    });
    
    lastGrp = (g + 1) % 2;
  });
  
  maxTextureNum = lastGrp;
};

// ### getMaxTexture();
//
// Contains logic to select the appropriate texture that holds the maximum value
// with which to determine the thresholded region for the particular group.
var getMaxTexture = function(grp) {
  if (maxTextureNum == -1) 
    return grp.textures[maxTexName];
  else 
    return maxTexture[maxTextureNum];
};

// ### getJfa();
//
// Use the jump-flooding algorithm to calculate the distance from every pixel to the
// nearest threshold boundary.
var getJfa = function() {
  if (!shaders['jfa'] || !shaders['jfainit']) {
    if (!timer)
      timer = setTimeout("gl.ondraw()", 300);
    return;
  }
  
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  
  // Execute the initialization step to prime the points in the thresholded region.
  ds.groups.forEach(function(grp, g) {
    timeStart("\tInitializing JFA for group " + g);
    grp.textures['dist0'].drawTo(function() {
      grp.textures['freq0'].bind(0); // Texture that contains the blurred density data.
      getMaxTexture(grp).bind(1); // Texture that contains the max density at (0,0)
      shaders['jfainit'].uniforms({
        texture: 0,
        maxTex: 1,
        upperLimit: threshold
      }).draw(plane);
      grp.textures['freq0'].unbind(0);
      getMaxTexture(grp).unbind(1);
    });
    timeStop("\tInitializing JFA for group " + g);
    
    // Iterate through the JFA
    var size = Math.max(gl.canvas.height, gl.canvas.width);
    var log2 = Math.log(size) / Math.log(2);
    var n = Math.ceil(log2);
    var k = Math.pow(2, n - 1);
    n = (n - 1) / 2 + 1;
    
    timeStart("\tRunning JFA for group " + g);
    for (var i = 0; i < 2 * n; i++) {
      grp.textures['dist' + (i+1) % 2].drawTo(function() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        grp.textures['dist' + i % 2].bind(0);
        shaders['jfa'].uniforms({
          kStep: k,
          delta: [1 / gl.canvas.width, 1 / gl.canvas.height],
          texture: 0
        }).draw(plane);
        grp.textures['dist' + i % 2].unbind(0);
      });
    
      k = Math.max(1, Math.round(k / 2));
      
    }
    timeStop("\tRunning JFA for group " + g);
  });
};

// ### shade();
//
// Compute the final coloring of each data series (group) independently.
var shade = function() {
  if (!shaders['shade']) {
    if (!timer)
      timer = setTimeout("gl.ondraw()", 300);
    return;
  }

  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  
  ds.groups.forEach(function(grp, i) {
    // Use the max0 texture (raw density function) and the distance texture (jfa)
    grp.textures['rgb'].drawTo(function() {
      grp.textures['outlierpts'].bind(3);
      getMaxTexture(grp).bind(2);
      grp.textures['dist0'].bind(1);
      grp.textures['freq0'].bind(0);
      shaders['shade'].uniforms({
        texture: 0,
        distances: 1,
        maxTex: 2,
        outliers: 3,
        delta: [1 / gl.canvas.width, 1 / gl.canvas.height],
        rgbColor: ds.colors[i],
        lowerLimit: 0.001,
        upperLimit: threshold
      }).draw(plane);
    });
        
    // Clean up state.
    grp.textures['freq0'].unbind(0);
    grp.textures['dist0'].unbind(1);
    getMaxTexture(grp).unbind(2);
    grp.textures['outlierpts'].bind(3);
  });
};

// ### blend();
//
// Blend the shaded datasets together into the final image, and draw to the viewport.
var blend = function() {
  if (!shaders['blend']) {
    if (!timer)
      timer = setTimeout('gl.ondraw()', 300);
    return;
  }
  
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.BLEND);
  
  // should bind other datasets here
  /*
  `for (var i = 0; i < ds.groups.length; i++) {
    ds.groups[i].textures['rgb'].bind(i);
  }`*/
  //ds.groups[0].textures['rgb'].bind(0);
  //ds.groups[1].textures['rgb'].bind(1);
  
  ds.groups.forEach(function(grp, i) {
    grp.textures['rgb'].bind(i);
  });
  
  shaders['blend'].uniforms({
    N: ds.groups.length,  // this should be the number of datasets
    lf: 0.9,
    cf: 0.95,
    texture0: 0,
    texture1: 1,
    texture2: 2,
    texture3: 3,
    texture4: 4,
    texture5: 5,
    texture6: 6,
    texture7: 7
  }).draw(plane);
  
  // clean up state
  //ds.groups[0].textures['rgb'].unbind(0);
  //ds.groups[1].textures['rgb'].unbind(1);
  ds.groups.forEach(function(grp, i) {
    grp.textures['rgb'].unbind(i);
  });
};

// ### drawOutliers();
//
// Draw the outlier points
var drawOutliers = function() {
  if (!shaders['outliers'] || !shaders['outliercombine']) {
    if (!timer)
      timer = setTimeout('gl.ondraw()', 300);
    return;
  }
  
  var minPt = [untransformX(0), untransformY(0)];
  var maxPt = [untransformX(gl.canvas.width), untransformY(gl.canvas.height)];
  var gridSize = [gl.canvas.width / clutterRadius, gl.canvas.height / clutterRadius];
  
  // get the grid size in actual coords
  for (var i = 0; i < 2; i++) {
    gridSize[i] = (maxPt[i] - minPt[i]) / gridSize[i];
  }  
  
  var resolution = [gl.canvas.width, gl.canvas.height];
  
  var gridOffset = [0,0];
  for (var i = 0; i < 2; i++) {
    gridOffset[i] = (minPt[i] / gridSize[i]) - Math.floor(minPt[i] / gridSize[i]);
    gridOffset[i] = gridOffset[i] * clutterRadius / resolution[i];
  }
  
  ds.groups.forEach(function(grp, i) {  
    grp.textures['outliers'].drawTo(function() {
      // Set up point-drawing state and transformation matrix.
      gl.pushMatrix();
      gl.matrixMode(gl.MODELVIEW);
      setZoomPan();
      
      gl.disable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.DST_ALPHA);
      
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
      
      var vertBuffer = [];
      vertBuffer['position'] = grp.buf;
      
      grp.textures['dist0'].bind(0);
      
      shaders['outliers'].uniforms({
        jfa: 0,
        gridSize: clutterRadius,
        resolution: [gl.canvas.width, gl.canvas.height],
        offset: gridOffset
      }).drawBuffers(vertBuffer, null, gl.POINTS);
      
      grp.textures['dist0'].unbind(0);
      gl.popMatrix();
    });
    
    // now, actually draw specific points out
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    
    grp.textures['outlierpts'].drawTo(function() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      grp.textures['outliers'].bind(0);
      shaders['outliercombine'].uniforms({
        grid: 0,
        gridSize: clutterRadius,
        pointRadius: outlierSize,
        resolution: [gl.canvas.width, gl.canvas.height],
        offset: gridOffset
      }).draw(plane);
      grp.textures['outliers'].unbind(0);
    });
  });
};

// ### init();
//
// Function that runs once when the data has been loaded and initialized; sets the plane
// object for screen-space textures and the values to set up the point transformation
// matrix.
var setup = false;
var init = function() {  
  plane = GL.Mesh.plane();
  setInitBounds();  
  setup = true;
};

// ### setInitBounds();
// 
// Set up 'bounding box', more like the window parameters of the graph; get the max range 
// and set a +20% margin.
var setInitBounds = function() {
  var b = bounds;
  offset = [-(b[0][0] + b[0][1]) / 2.0, -(b[1][0] + b[1][1]) / 2.0];
  
  scale = Math.max(b[0][1] - b[0][0], b[1][1] - b[1][0]) * 1.2;
  scale = gl.canvas.height / scale;
  
  screenOffset = [gl.canvas.width / 2.0, gl.canvas.height / 2.0];
  
  maxComputed = false;
};

// ### gl.ondraw();
//
// The drawing command handled by lightgl.js.  Whenever options are changed or the user
// pans or zooms, this function will be called.
gl.ondraw = function() {
  // Delay drawing until shaders and data is ready
  if (!dataReady) {
    if (!timer)
      timer = setTimeout("gl.ondraw()", 300);
    return;
  }
  
  // Cancel any subsequent timing events for this function.
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  
  // Set the timings variable
  timings = $("#dotiming").prop('checked');
  if (timings) {
    console.log("START TIMING RUN");
    console.log("=====================================");
    //timeStart("== total time elapsed");
  }
  
  // Tell the drawing operations that the maximum textures are unavilable 
  // if the 'use global maximum' checkbox is unchecked.
  if (!$("#globalmax").prop('checked'))
    maxTextureNum = -1;
  
  console.time("== total time elapsed");
  
  // On the first run, set up required parameters.
  if (!setup)
    init();
  
  if ($("#showpoints").prop('checked'))
    drawPoints();
  else if ($("#showjfa").prop('checked')) {
    drawBlur();
    findMax();
    getJfa();
    debugJfa();
  } else if ($("#hideoutliers").prop('checked')) {
    drawBlur();
    if (!maxComputed) 
      findMax();
    if ($("#globalmax").prop('checked'))
      getGlobalMax();
    getJfa();
    shade();
    blend();
  } else if ($("#showmax").prop('checked')) {
    drawBlur();
    findMax();
    debugMax();
  } else {
    if (timings) { console.time("draw blur"); }
    drawBlur();
    if (timings) { console.timeEnd("draw blur"); console.time("find max"); }
    if (!maxComputed) 
      findMax();
    if ($("#globalmax").prop('checked'))
      getGlobalMax();
    if (timings) { console.timeEnd("find max"); console.time("propagate JFA"); }
    getJfa();
    if (timings) { console.timeEnd("propagate JFA"); console.time("draw outliers"); }
    drawOutliers();
    if (timings) { console.timeEnd("draw outliers"); console.time("shade"); }
    shade();
    if (timings) { console.timeEnd("shade"); console.time("blend"); }
    blend();
    if (timings) { console.timeEnd("blend"); }
  }
  
  // draw the plot elements (axes, labels)
  timeStart("draw 2D grid");
  draw2d();
  timeStop("draw 2D grid");
  
  console.timeEnd("== total time elapsed");
  //timeStop("== total time elapsed");
};

// ## Handlers for mouse-interaction
// Handle panning the canvas.
var panX, panY;
var buttons = {};
gl.onmousedown = function(e) {
  buttons[e.which] = true;
  panX = e.x;
  panY = gl.canvas.height - e.y;
};

gl.onmousemove = function(e) {
  if (drags(e)) {
    screenOffset[0] += e.x - panX;
    screenOffset[1] += (gl.canvas.height - e.y) - panY;
    
    panX = e.x;
    panY = gl.canvas.height - e.y;
    gl.ondraw();
  }
};

gl.onmouseup = function(e) {
  buttons[e.which] = false;
  
  maxComputed = false;
  gl.ondraw();
};

var drags = function(e) {
  for (var b in buttons) {
    if (Object.prototype.hasOwnProperty.call(buttons, b) && buttons[b]) return true;
  }  
};

// Handle zooming in and out.
var mwheel = function(e, delta, deltaX, deltaY) {
  e.preventDefault();
  
  var x = e.offsetX;
  var y = gl.canvas.height - e.offsetY;
  
  offset[0] = -(untransformX(x));
  offset[1] = -(untransformY(y));
  
  scale = deltaY > 0 ? scale / 0.9 : scale * 0.9;
  
  screenOffset[0] = x;
  screenOffset[1] = y;
  
  // Force recomputation of the maximum value textures when zooming to preserve some sort of thresholded region.
  maxComputed = false;
  
  gl.ondraw();
};

/* some transforms */
var untransformX = function(x) {
  return (x - screenOffset[0]) / scale - offset[0];
};

var untransformY = function(y) {
  return (y - screenOffset[1]) / scale - offset[1];
};

var transformX = function(x) {
  return (x + offset[0]) * scale + screenOffset[0];
};

var transformY = function(y) {
  return (y + offset[1]) * scale + screenOffset[1];
};

var context2d;
var numLines = 9;
var draw2d = function() {
  //context2d.fillStyle = "#fff";
  //context2d.fillRect(0, 0, gl.canvas.width, gl.canvas.height);
  
  context2d.clearRect(0, 0, gl.canvas.width, gl.canvas.height);
  context2d.font = "25px sans-serif;";
  // context2d.fillText("TESTING", 20, 30);
  
  context2d.save();
  
  context2d.strokeStyle = "rgba(0.56,0.56,0.56,0.5)";
  context2d.lineWidth = 1;
  
  var digitDisplay = function(num, exp, d) {
    if (exp > 0)
      return "" + Math.round(num/d) * d;
    else {
      var printNum = "" + Math.round(num/d) * d;
      if (printNum.indexOf(".") == -1)
        return printNum;
      else
        return printNum.substring(0, printNum.indexOf(".") + 1 + Math.abs(exp - 1));
    }
  };
  
  // do minor lines first
  var min = untransformY(0), max = untransformY(gl.canvas.height);
  var exp = Math.floor(Math.log(max - min) / Math.log(10));
  var d = Math.pow(10, exp) * 0.1;
  
  var alpha = (1 - (150 - d * scale) / 150) 
  alpha = Math.max(0.0, Math.min(1.0, alpha)) / 2;
  context2d.globalAlpha = alpha;
  
  var graphMin = Math.floor(min / d) * d;
  var graphMax = Math.ceil(max / d) * d;
  for (var y = graphMin; y < graphMax + 0.5*d; y += d) {
    var yi = gl.canvas.height - Math.round(transformY(y));
    context2d.beginPath();
    context2d.moveTo(0, yi);
    context2d.lineTo(gl.canvas.width, yi);
    context2d.stroke();
    
    printY = digitDisplay(y, exp, d);
    context2d.strokeText(printY, 5, yi-3);
    context2d.fillText(printY, 5, yi-3);
  }
  
  // major lines
  d *= 10;
  alpha = (1 - (150 - d * scale) / 150);
  alpha = Math.max(0.0, Math.min(1.0, alpha)) / 2;
  context2d.globalAlpha = alpha;
  graphMin = Math.floor(min / d) * d;
  graphMax = Math.ceil(max / d) * d;
  for (var y = graphMin; y < graphMax + 0.5*d; y += d) {
    var yi = gl.canvas.height - Math.round(transformY(y));
    context2d.beginPath();
    context2d.moveTo(0, yi);
    context2d.lineTo(gl.canvas.width, yi);
    context2d.stroke();
    
    var printY = digitDisplay(y, exp, d);
    context2d.strokeText(printY, 5, yi-3);
    context2d.fillText(printY, 5, yi-3);
  }
  
  // now do x
  alpha = (1 - (150 - d * scale) / 150);
  alpha = Math.max(0.0, Math.min(1.0, alpha)) / 2;
  context2d.globalAlpha = alpha;
  min = untransformX(0), max = untransformX(gl.canvas.width);
  exp = Math.floor(Math.log(max - min) / Math.log(10));
  d = Math.pow(10, exp) * 0.1;
  
  graphMin = Math.floor(min / d) * d;
  graphMax = Math.ceil(max / d) * d;
  for (var x = graphMin; x < graphMax + 0.5*d; x += d) {
    var xi = Math.round(transformX(x));
    context2d.beginPath();
    context2d.moveTo(xi, 0);
    context2d.lineTo(xi, gl.canvas.height);
    context2d.stroke();
    
    var printX = digitDisplay(x, exp, d);
    context2d.strokeText(printX, xi+3, 25);
    context2d.fillText(printX, xi+3, 25);
  }
  
  // major lines
  d *= 10;
  alpha = (1 - (150 - d * scale) / 150);
  alpha = Math.max(0.0, Math.min(1.0, alpha)) / 2;
  context2d.globalAlpha = alpha;
  graphMin = Math.floor(min / d) * d;
  graphMax = Math.ceil(max / d) * d;
  for (var x = graphMin; x < graphMax + 0.5*d; x += d) {
    var xi = Math.round(transformX(x));
    context2d.beginPath();
    context2d.moveTo(xi, 0);
    context2d.lineTo(xi, gl.canvas.height);
    context2d.stroke();
    
    var printX = digitDisplay(x, exp, d);
    context2d.strokeText(printX, xi+3, 25);
    context2d.fillText(printX, xi+3, 25);
  }
  
  context2d.restore();
};

// ### takeSubset(percent)
//
// Takes the first % of data of all data groups for performance testing purposes and 
// to allow lower-performance computers to perform well
var takeSubset = function(percent) {
  if (percent > 100 || percent <= 0) {
    percent = 100;
  }
  
  var totalPointsDrawn = 0;
  
  ds.groups.forEach(function(v,i) {
    v.buf.delete();
    
    var numItems = v.data.length * 1.0 * percent / 100;
    totalPointsDrawn += numItems;
    
    v.buf = new GL.Buffer(gl.ARRAY_BUFFER, Float32Array);
    v.buf.data = v.data.slice(0, numItems);
    v.buf.compile(gl.STATIC_DRAW);
  });
  
  return totalPointsDrawn;
};

// ### resetUIForNewData();
//
// This function is meant to be called after the context has been set up, but a different
// dataset is being loaded to the splatterplot.  The viewport needs to be configured to the
// new bounds of the data, and the textures need to be re-created.
var resetUIForNewData = function() {
  setInitBounds();
  textureExists = false;
  maxComputed = false;
}

var resizeCanvas = function(width, height) {
  // only change if width or height are different
  if (gl.canvas.width != width || gl.canvas.height != height) {
    gl.canvas.width = width;
    gl.canvas.height = height;
    gl.canvas.style.width = width + "px";
    gl.canvas.style.height = height + "px";
    
    var canvas2d = document.getElementById("2dcanvas");
    canvas2d.width = width;
    canvas2d.height = height;
    
    canvas2d.style.top = "-" + ((+height) + 7) + "px";
    
    // force a rebuild (compute new bounds, force rebuild of textures)
    resetUIForNewData();
  }
  
  // Set up WebGL environment.
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  //gl.matrixMode(gl.PROJECTION);
  //gl.ortho(0, gl.canvas.width, 0, gl.canvas.height, -100, 100);
  //gl.matrixMode(gl.MODELVIEW);
  
  return width * height;
};

// ### main();
//
// Called when the document has finished loading.  Finishes the loading of the WebGL
// context and starts the asynchronous loading of shaders and data.
function main() {  
  // Add the canvas to the webpage.
  gl.canvas.id = "webglcanvas";
  document.getElementById("splatters").appendChild(gl.canvas);
  
  // add the 2d context element
  var canvas2d = document.createElement("canvas");
  canvas2d.width = gl.canvas.width;
  canvas2d.height = gl.canvas.height;
  canvas2d.id = "2dcanvas";
  canvas2d.onmousedown = gl.onmousedown;
  canvas2d.onmousemove = gl.onmousemove;
  canvas2d.onmouseup = gl.onmouseup;
  document.getElementById("splatters").appendChild(canvas2d);
  context2d = canvas2d.getContext("2d");
  
  // Set up WebGL environment.
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.matrixMode(gl.PROJECTION);
  gl.ortho(0, gl.canvas.width, 0, gl.canvas.height, -100, 100);
  gl.matrixMode(gl.MODELVIEW);
  
  // See if oes_texture_float is available (adds support for float textures), and enable
  // c.f. <https://groups.google.com/forum/#!msg/webgl-dev-list/oa_hC83oe-U/fkYbScsvA3cJ>
  var f = gl.getExtension("OES_texture_float");
  var g = gl.getExtension("OES_float_linear"); // needed?
  if (!f) {
    alert("no OES_texture_float support; writing float textures will fail");
    return;
  }
  
  // Send a request for data.
  // e.g. `$.get("blue.txt", loadFile);`
  //$.get("venn2.txt", loadFileOld);
  
  // Function to handle asynchronous loading and compilation of shaders.
  var loadShaderFromFiles = function(name, opt_vn, opt_fn) {
    var vn = opt_vn || name + '.vs';
    var fn = opt_fn || name + '.fs';
    var shaderDir = 'shaders/';
    var vd, fd;
    $.get(shaderDir + vn, function(data) {
      vd = data;
      if (fd)
        shaders[name] = new GL.Shader(vd, fd);
    });
    $.get(shaderDir + fn, function(data) {
      fd = data;
      if (vd)
        shaders[name] = new GL.Shader(vd, fd);
    });
  };
  
  // Add mousewheel listener to the canvas.
  $("canvas").mousewheel(mwheel);
  
  // Allow the user to reset the canvas viewing parameters to initial defaults.
  $("#resetview").click(function() {
    $("#subsetpercent").slider('value', 100);
    setInitBounds();
    gl.ondraw();
  });
  
  // On any option change, trigger an WebGL redraw.
  $("#showpoints").change(gl.ondraw);
  $("#showjfa").change(gl.ondraw);
  $("#hideoutliers").change(gl.ondraw);
  $("#showmax").change(gl.ondraw);
  $("#dotiming").change(gl.ondraw);
  $("#globalmax").change(gl.ondraw);
  
  // Load the required shader files.
  loadShaderFromFiles('testlgl');
  loadShaderFromFiles('testpt');
  loadShaderFromFiles('testfloat', 'testblur.vs', 'testfloat.fs');
  
  loadShaderFromFiles('testblur');
  loadShaderFromFiles('testblur16',  'testblur.vs', 'testblur16.fs');
  loadShaderFromFiles('testblur32',  'testblur.vs', 'testblur32.fs');
  loadShaderFromFiles('testblur64',  'testblur.vs', 'testblur64.fs');
  loadShaderFromFiles('testblur128', 'testblur.vs', 'testblur128.fs');
  loadShaderFromFiles('testblur256', 'testblur.vs', 'testblur256.fs');
  
  loadShaderFromFiles('testmax', 'testblur.vs', 'testmax.fs');
  loadShaderFromFiles('maxtexture', 'testblur.vs', 'maxtexture.fs');
  
  loadShaderFromFiles('jfainit', 'testblur.vs', 'jfainit.fs');
  loadShaderFromFiles('jfa', 'testblur.vs', 'jfa.fs');
  loadShaderFromFiles('shade', 'testblur.vs', 'shade.fs');
  loadShaderFromFiles('blend', 'testblur.vs', 'blend.fs');
  
  // debug
  loadShaderFromFiles('jfadebug', 'testblur.vs', 'jfadebug.fs');
  loadShaderFromFiles('maxdebug', 'testblur.vs', 'debugmax.fs');
  
  // debug outliers
  loadShaderFromFiles('outliers', 'outliers.vs', 'testpt.fs');
  loadShaderFromFiles('outliercombine', 'testblur.vs', 'outliercombine.fs');
  
  // handle slider business
  $("#bandwidth").slider({
    range: "min",
    min: 1,
    value: 15,
    max: 150,
    slide: function(ev, ui) {
      $("#disp-bandwidth").html(ui.value);
    },
    change: function(ev, ui) { 
      sigma = ui.value; 
      gl.ondraw(); 
      $("#disp-bandwidth").html(ui.value);
    }
  });
  
  $("#threshold").slider({
    range: "min",
    min: 0.01,
    value: 0.5,
    step: 0.01,
    max: 1,
    slide: function(ev, ui) {
      $("#disp-threshold").html(ui.value);
    },
    change: function(ev, ui) { 
      threshold = ui.value; 
      gl.ondraw(); 
      $("#disp-threshold").html(ui.value);
    }
  });
  
  $("#clutter").slider({
    range: "min",
    min: 1,
    max: 150,
    step: 1,
    value: 25,
    slide: function(ev, ui) {
      $("#disp-clutter").html(ui.value);
    },
    change: function(ev, ui) { 
      clutterRadius = ui.value; 
      gl.ondraw(); 
      $("#disp-clutter").html(ui.value);
    }
  });
  
  $("#outlierSize").slider({
    range: "min",
    min: 1,
    max: 5,
    step: 0.5,
    value: 2.5,
    slide: function(ev, ui) {
      $("#disp-outlierSize").html(ui.value);
    },
    change: function(ev, ui) { 
      outlierSize = ui.value; 
      gl.ondraw(); 
      $("#disp-outlierSize").html(ui.value);
    }
  });
  
  $("#splatter").click(function() {
    $("#bandwidth").slider('value', 15);
    $("#threshold").slider('value', 0.5);
    $("#clutter").slider('value', 35);
    gl.ondraw();
  });
  
  $("#kde").click(function() {
    $("#bandwidth").slider('value', 12);
    $("#threshold").slider('value', 1);
    $("#clutter").slider('value', 10);
    gl.ondraw();
  });
  
  $("#scatter").click(function() {
    $("#bandwidth").slider('value', 12);
    $("#threshold").slider('value', 1);
    $("#clutter").slider('value', 1);
    gl.ondraw();
  });
  
  // handle debug stuff
  $("#canvassize").change(function() {
    var size = $(this).val().split("x");
    resizeCanvas(size[0], size[1]);
    gl.ondraw();
  });
  
  $("#subsetpercent").slider({
    range: "min",
    min: 1,
    max: 100,
    step: 1,
    value: 100,
    slide: function(ev, ui) {
      $("#disp-subsetpercent").html(ui.value + "%");
    }, 
    change: function(ev, ui) {
      var ptsDrawn = takeSubset(ui.value);
      gl.ondraw();
      $("#disp-subsetpercent").html(ui.value + "%");
      $("#ptsDrawn").html("points drawn: " + ptsDrawn);
    }
  });
  
  
  // Finally, explicitly call the WebGL draw function.
  gl.ondraw();
}