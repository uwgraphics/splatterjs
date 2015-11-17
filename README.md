# SplatterJs

This project is a JavaScript implementation of the Splatterplot interface described by [Adrian Mayorga](http://cs.wisc.edu/~adrm) and [Michael Gleicher](http://cs.wisc.edu/~gleicher) in their TVCG submission entitled [**Splatterplots: Overcoming Overdraw in Scatter Plots**](http://graphics.cs.wisc.edu/Papers/2013/MG13/).  A short demonstration of the architecture of this project was presented at the [Data Systems for Interactive Analysis](http://interactive-analysis.org) workshop at IEEE VIS 2015, and details can be found in our workshop paper titled [Using WebGL as an Interactive Visualization Medium: Our Experience Developing SplatterJs](http://graphics.cs.wisc.edu/Papers/2015/SG15/).

![SplatterJs rendering a 5-set gaussian dataset](https://raw.githubusercontent.com/uwgraphics/splatterjs/master/img/splatter-teaser.png)

The JavaScript implementation utilizes WebGL to bring Splatterplots to the web browser.  When deployed on a server, the interface allows for analysts to upload their data files, select the dimensions to display on the splatterplot, and plot the data.  The analyst then has the ability to pan and zoom around the data-space to find clusters and correlations between different data series.

### Demo

An assorted collection of example datasets loaded into SplatterJs.  Please be aware that the URI may change in the future as SplatterJs finds a more permanent home.  You are also welcome to upload your own text-based, comma-separated value files to the visualization; the *Load File* dialog allows for picking the relevant dimensions and a label column to group series together.

* [Two Gaussians](http://graphics.cs.wisc.edu/Projects/SplatterJs/?#venn2.txt/2/0/1/2) -- The same dataset as is shown in the teaser figure above
* [Five Gaussians](http://graphics.cs.wisc.edu/Projects/SplatterJs/?#venn5-250k.txt/2/0/1/2) -- Showing five Gaussian distributions comprising 250,000 2D points (50k per group)
* [FARS 2012 data](http://graphics.cs.wisc.edu/Projects/SplatterJs/?#fars-2012.csv/2/1/0/-1) -- Showing the FARS ([Fatality Analysis Reporting System](http://www.nhtsa.gov/FARS)) data for the 2011 year.  By clicking on the 'hide grid' and 'show background' checkboxes, a map of the United States is displayed

### Documentation

The main `splatterplot.js` file is loosely documented with Markdown syntax.  Please use [docco](http://jashkenas.github.io/docco/) to generate a side-by-side of code with comments.  The following command works well: `docco -c docco-modified.css splatterplot.js`.

### Limitations

Since SplatterJs depends on using WebGL, only browsers that support WebGL are supported. To get the necessary precision, the `OES_texture_float` WebGL extension is required.  RenderingPipeline.com has a good script to determine [which WebGL extensions your browser and computer support](http://renderingpipeline.com/webgl-extension-viewer/).

In its current implementation, SplatterJs manages 9 textures per data series, with nearly 20 texture writes per data series (density map, blurring, GPGPU-based max value, threshold distance calculation [jump flooding], drawing of outliers, shading), as well as the final compositing operation.  This entire rendering process is repeated on pan and zoom.  It is therefore suggested that the client computer have a modern GPU.  A nVidia GeForce 250 or equivalent is the minimum suggested GPU (achieves 3-4 fps); GPUs on the order of an nVidia 770 achieve nearly interactive rates.

### Libraries used

SplatterJs uses a multitude of libraries to help it go.  Below is a list of the libraries used, their licenses, and how they are used in the system.

* [**Bootstrap**](http://getbootstrap.com) (MIT) -- Used to style and organize UI components on the page, including modal windows.
* [**jQuery**](http://jquery.com) (MIT) -- Used to support Bootstrap and provide event listeners for mouse
* [**jQuery UI**](http://jqueryui.com/) (MIT) -- Supports the operation of sliders
* [**jquery-mousewheel**](https://github.com/brandonaaron/jquery-mousewheel) (MIT) -- Adds normalized support for mousewheel events (zooming on canvas)
* [**jQuery-File-Upload**](https://github.com/blueimp/jQuery-File-Upload) (MIT) -- Adds ajax-y support for uploading data files
* [**Hashable.js**](https://github.com/shawnbot/hashable) (none?) -- Adds support for parsing/updating the URL hash to save current viewing state
* [**lightgl.js**](https://github.com/evanw/lightgl.js/) (MIT?) -- Provides a nice abstraction layer for doing low-level WebGL commands (e.g. drawing to texture, managing shaders, binding textures)

### Contact

Please contact [Alper Sarikaya](http://cs.wisc.edu/~sarikaya) with any comments or questions, or feel free to open an issue or pull request.
