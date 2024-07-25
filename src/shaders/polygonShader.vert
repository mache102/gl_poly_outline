#version 330 core 

layout (location = 0) in vec2 a_coord;
layout (location = 1) in uint a_attr;
layout (location = 2) in vec4 a_color;

flat out uint v_attr;
out vec4 v_color;
out vec2 v_offset;

uniform vec2 u_winres;
uniform float u_outline_size;
uniform float u_transition_smoothness;

bool getBool(uint value, int bit) {
  return (value & (1u << uint(bit))) != 0u;
}

int getInt(uint value, int bit) {
  return getBool(value, bit) ? 1 : 0;
}

uint getUint(uint value, int bit) {
  return getBool(value, bit) ? 1u : 0u;
}

void main(void) {
  v_attr = a_attr;
  v_color = a_color;

  // is outline vertex
  if (getBool(a_attr, 0)) {
    // ov pos only have 2 possible values: -1 and 1 (can be stored as bits and then converted accordingly)
    int x = getInt(a_attr, 1);
    int y = getInt(a_attr, 2);
    vec2 coord = 2. * vec2(x,y) - 1.;

    // a_coord is the offset for outline vertices
    gl_Position = vec4((a_coord + (u_outline_size + 2. * u_transition_smoothness) * coord) / (u_winres / 2.0), 0.0, 1.0);

    v_offset = a_coord + u_winres / 2.0;
  } else {
    // v_offset isn't needed for regular verts
    v_offset = vec2(0.0, 0.0);
    gl_Position = vec4(a_coord / (u_winres / 2.0), 0.0, 1.0);
  }
}

