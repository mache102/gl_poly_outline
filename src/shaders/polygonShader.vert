#version 330 core 

layout (location = 0) in vec2 a_coord;
layout (location = 1) in float a_rotation;
layout (location = 2) in float a_size;
layout (location = 3) in vec2 a_offset;

layout (location = 4) in float a_outline_direction;
layout (location = 5) in uint a_attr;
layout (location = 6) in vec4 a_color;

const uint POLYGON_BODY = 0u;
const uint OUTLINE_CORNER = 1u;
const uint OUTLINE_QUAD = 2u;

flat out uint v_attr;
out vec4 v_color;
out vec2 v_offset;

uniform vec2 u_winres;
uniform float u_outline_size;

bool getBool(uint value, int bit) {
  return (value & (1u << uint(bit))) != 0u;
}

int getInt(uint value, int bit) {
  return getBool(value, bit) ? 1 : 0;
}

uint getUint(uint value, int bit) {
  return getBool(value, bit) ? 1u : 0u;
}

// start&end inclusive
uint getUintBits(uint value, int start, int end) {
  return (value >> uint(start)) & ((1u << uint(end - start + 1)) - 1u);
}

int getIntBits(uint value, int start, int end) {
  return int(getUintBits(value, start, end));
}

vec2 rotateVec2(vec2 v, float angle) {
  return vec2(
    v.x * cos(angle) - v.y * sin(angle),
    v.x * sin(angle) + v.y * cos(angle)
  );
}

void main(void) {
  v_attr = a_attr;
  v_color = a_color;

  // order: rotate, scale (size), translate (offset)

  // xy: pixel space: (-winres/2 to +winres/2); origin at center
  // xy + half_winres: to gl_FragCoord space: (0,0) to (winres.x, winres.y)
  // xy / half_winres: to NDC [-1, 1] space
  vec2 half_winres = u_winres / 2.0;
  vec2 coord = rotateVec2(a_coord, a_rotation) * a_size + a_offset;

  switch (getUintBits(v_attr, 0, 1)) {
    case POLYGON_BODY: {
      v_offset = vec2(0.);
      break;
    }

    case OUTLINE_CORNER: {
      // ov pos only have 2 possible values: -1 and 1 (can be stored as bits and then converted accordingly)
      int x = getInt(a_attr, 2);
      int y = getInt(a_attr, 3);
      vec2 c_coord = 2. * vec2(x,y) - 1.; // coord (offset) of the vertices that make up the rounded corner's quad
      
      v_offset = coord + half_winres;

      coord += c_coord * u_outline_size;
      break;
    }

    case OUTLINE_QUAD: {
      v_offset = vec2(0.);

      coord += vec2(
        cos(a_outline_direction + a_rotation), 
        sin(a_outline_direction + a_rotation)
      ) * u_outline_size;
      break;
    }

    default: {
      // debug in frag 
      v_offset = vec2(123.456, 789.012);
      break;
    }
  }

  gl_Position = vec4(coord / half_winres, 0.0, 1.0);
}

