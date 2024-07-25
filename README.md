# gl_poly_outline

## Branch: `webgl_edgequads`

Renders 10,000+ outlined 2D polygons in WebGL at 60 fps.

This method creates a quad for each edge to serve as outlines, similar to how `GL_LINES` are used in OpenGL. Outline corners are rounded with 
circles (via quads). 

**For the OpenGL 3.3 implementation, see branch `opengl_edgequads`.**

## Clone

Clone the `webgl_edgequads` branch:

```bash
git clone -b webgl_edgequads
```

## Documentation

Open `src/index.html` with Live Server in Visual Studio Code.
Settings are available to adjust under the `Settings` section in `src/app.js`.


