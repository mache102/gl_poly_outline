#version 330 core 

layout (location = 0) in vec2 a_pos;
layout (location = 1) in vec2 a_offset;

out vec2 v_offset;

uniform vec2 u_winres;
uniform float u_outline_size;

void main(void) {
  v_offset = a_offset + u_winres / 2.0;
  gl_Position = vec4(vec2(u_outline_size * a_pos + a_offset) / (u_winres / 2.0), 0.0, 1.0);
}

