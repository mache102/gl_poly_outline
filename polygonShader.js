export const polygonShader_vert = `#version 300 es

in ivec2 a_coord;
in vec4 a_color;
in ivec2 a_pos;
in ivec2 a_offset;

out vec4 fs_color;
uniform vec2 u_winres;

void main(void) {
  fs_color = a_color;
  gl_Position = vec4(vec2(a_coord) / (u_winres / 2.0), 0.0, 1.0);
}`;

export const polygonShader_frag = `#version 300 es
precision mediump float;

in vec4 fs_color;

out vec4 fragColor;

void main(void) {
  fragColor = fs_color;
}`;
