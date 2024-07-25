export const outlineVertexShader_vert = `#version 300 es

in ivec2 a_coord;
in vec4 a_color;
in ivec2 a_pos;
in ivec2 a_offset;

uniform vec2 u_winres;

void main(void) {
  gl_Position = vec4(vec2(10 * a_pos + ivec2(a_offset)) / (u_winres / 2.0), 0.0, 1.0);
}`;

export const outlineVertexShader_frag = `#version 300 es
precision mediump float;

uniform vec4 u_color;

out vec4 fragColor;

void main(void) {
  fragColor = u_color;
}`;
