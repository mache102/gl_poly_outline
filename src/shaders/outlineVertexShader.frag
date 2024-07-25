#version 330 core

in vec2 v_offset;

out vec4 fragColor;

uniform vec4 u_color;
uniform float u_outline_size;

void main(void) {
  if (distance(v_offset, gl_FragCoord.xy) > u_outline_size) {
    discard;
  }
  fragColor = u_color;
}
