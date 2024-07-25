# gl_poly_outline

Renders 10,000+ outlined 2D polygons in OpenGL/WebGL2 at 60 fps.

This method creates a quad for each edge to serve as outlines, similar to how `GL_LINES` are used in OpenGL. Outline corners are rounded with 
circles (via quads). 

## OpenGL 3.3:

See branch `opengl_edgequads` or clone using `git clone -b opengl_edgequads` and follow the instructions in the README.

## WebGL2:

See branch `webgl2_edgequads` or clone using `git clone -b webgl2_edgequads` and follow the instructions in the README.

## Screenshots 

### OpenGL

![OpenGL polygons](gl_poly_outline_opengl.png)

![OpenGL circles](gl_poly_outline_opengl_circles.png)

### WebGL

![WebGL polygons](gl_poly_outline_webgl.png)

![WebGL circles](gl_poly_outline_webgl_circles.png)
