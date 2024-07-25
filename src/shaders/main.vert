#version 330 core

// use layouts 

layout (location = 0) in vec2 a_position;
layout (location = 1) in vec4 a_color;
layout (location = 2) in uint a_attrs;
layout (location = 3) in uint a_polygon_start_index;
layout (location = 4) in uint a_polygon_length;

flat out uint o_attrs;

flat out uint o_polygon_start_index;
flat out uint o_polygon_length;

uniform vec2 u_winres;

void main(void) {
  vec2 half_winres = u_winres / 2.0;

  vec2 a_position_ = vec2(a_position) / half_winres;
  gl_Position = vec4(a_position_, 0.0, 1.0);

  o_attrs = a_attrs;

  o_polygon_start_index = a_polygon_start_index;
  o_polygon_length = a_polygon_length;
}