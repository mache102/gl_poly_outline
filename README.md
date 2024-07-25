# gl_poly_outline

## Branch: `opengl_edgequads`

Renders 10,000+ outlined 2D polygons in OpenGL at 60 fps.

This method creates a quad for each edge to serve as outlines, similar to how `GL_LINES` are used in OpenGL. Outline corners are rounded with 
circles (via quads). 

**For the WebGL2 implementation, see branch `webgl_edgequads`.**

## Requirements
- OpenGL 3.3
- GLFW
- glad (included under `lib/`)
- glm

## Clone

Clone the `opengl_edgequads` branch:

```bash
git clone -b opengl_edgequads
```

## Build

```bash
make
```

## Documentation

Run the program:

```bash
./edgequads
```

Settings can be configured in `config.txt`.
