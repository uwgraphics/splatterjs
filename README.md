# SplatterJs

This project is a JavaScript implementation of the Splatterplot interface described by [Adrian Mayorga](http://cs.wisc.edu/~adrm) and [Michael Gleicher](http://cs.wisc.edu/~gleicher) in their TVCG submission entitled [**Splatterplots: Overcoming Overdraw in Scatter Plots**](http://graphics.cs.wisc.edu/Papers/2013/MG13/).  The work was also presented at IEEE VIS in the invited TVCG InfoVis session in 2013.  

![SplatterJs rendering a 5-set gaussian dataset](https://raw.githubusercontent.com/uwgraphics/splatterjs/master/img/splatter-teaser.png)

The JavaScript implementation utilizes WebGL to bring Splatterplots to the web browser.  When deployed on a server, the interface allows for analysts to upload their data files, select the dimensions to display on the splatterplot, and plot the data.  The analyst then has the ability to pan and zoom around the data-space to find clusters and correlations between different data series.

### Limitations

Since SplatterJs depends on using WebGL, only browsers that support WebGL are supported (Chrome, Firefox, Opera).  As a rule of thumb, this does not include OS-bundled browsers, as they see WebGL as a security risk (bad WebGL code can hang a computer!).  

To get the necessary precision, the `OES_texture_float` WebGL extension is required.  RenderingPipeline.com has a good script to determine [which WebGL extensions your browser and computer support](http://renderingpipeline.com/webgl-extension-viewer/).

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
