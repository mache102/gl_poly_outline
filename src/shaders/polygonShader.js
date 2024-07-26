/*

lowp: 8-bit fixed-point
mediump: 16-bit fixed-point
highp: 24-bit fixed-point

*/

export const polygonShader_vert = `#version 300 es
precision mediump float;

in vec2 a_coord;
in float a_rotation;
in float a_size;
in vec2 a_offset;

in float a_outline_direction;
in uint a_attr;
in vec4 a_color;

const uint POLYGON_BODY = 0u;
const uint OUTLINE_CORNER = 1u;
const uint OUTLINE_QUAD = 2u;
const uint POLYGON_CIRCLE = 3u;

flat out uint v_attr;
out vec4 v_color;
out vec2 v_offset;
out float v_size;

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
  v_offset = vec2(0.); // only used for OUTLINE_CORNER
  v_size = a_size; // only used for OUTLINE_CORNER

  // order: rotate, scale (size), translate (offset)

  // xy: pixel space: (-winres/2 to +winres/2); origin at center
  // xy + half_winres: to gl_FragCoord space: (0,0) to (winres.x, winres.y)
  // xy / half_winres: to NDC [-1, 1] space
  vec2 half_winres = u_winres / 2.0;
  vec2 coord = vec2(0.);

  switch (getUintBits(v_attr, 0, 1)) {
    case POLYGON_BODY: {
      coord = rotateVec2(a_coord, a_rotation) * a_size + a_offset;
      break;
    }

    case OUTLINE_CORNER: {
      // ov pos only have 2 possible values: -1 and 1 (can be stored as bits and then converted accordingly)
      int x = getInt(a_attr, 2);
      int y = getInt(a_attr, 3);
      vec2 c_coord = 2. * vec2(x,y) - 1.; // coord (offset) of the vertices that make up the rounded corner's quad
      
      coord = rotateVec2(a_coord, a_rotation) * a_size + a_offset;
      v_offset = coord + half_winres;

      coord += c_coord * u_outline_size;
      break;
    }

    case OUTLINE_QUAD: {
      coord = rotateVec2(a_coord, a_rotation) * a_size + a_offset;
      coord += vec2(
        cos(a_outline_direction + a_rotation), 
        sin(a_outline_direction + a_rotation)
      ) * u_outline_size;
      break;
    }

    case POLYGON_CIRCLE: {
      // need the extra size for the outline
      // also why coord's initial calcs aren't the same for all cases
      coord = a_coord * (a_size + u_outline_size) + a_offset;
      v_offset = a_offset + half_winres;
      break;
    }

    default: {
      // debug in frag 
      coord = rotateVec2(a_coord, a_rotation) * a_size + a_offset;
      v_offset = vec2(123.456, 789.012);
      break;
    }
  }

  gl_Position = vec4(coord / half_winres, 0.0, 1.0);
}

`;


export const polygonShader_frag = `#version 300 es
precision mediump float;

flat in uint v_attr;
in vec4 v_color;
in vec2 v_offset;
in float v_size;

out vec4 fragColor;

uniform vec4 u_outline_color;
uniform float u_outline_size;
uniform float u_transition_smoothness;
uniform float u_blend_factor;

const uint POLYGON_BODY = 0u;
const uint OUTLINE_CORNER = 1u;
const uint OUTLINE_QUAD = 2u;
const uint POLYGON_CIRCLE = 3u;

// circles are smoothstepped on both sides of the outline, whereas outline quads are only applied msaa 
// this slight correct slightly thickens circle outlines inwards to make them look consistent with outline quads
float outline_correction = -1.0;

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

vec4 lerpVec4(vec4 a, vec4 b, float t) {
  return a * (1.0 - t) + b * t;
}

void main(void) {

  switch (getUintBits(v_attr, 0, 1)) {
    case POLYGON_BODY: {
      fragColor = v_color;
      return;
    }
    
    case OUTLINE_CORNER: {
      float s = smoothstep(u_outline_size - u_transition_smoothness, u_outline_size, distance(v_offset, gl_FragCoord.xy));
      fragColor = mix(lerpVec4(v_color, u_outline_color, u_blend_factor), vec4(0.), s);
      
      return;
    }

    case OUTLINE_QUAD: {
      fragColor = lerpVec4(v_color, u_outline_color, u_blend_factor);
      return;
    }
      
    case POLYGON_CIRCLE: {
      float d = distance(v_offset, gl_FragCoord.xy);

      float r1 = v_size - u_outline_size + outline_correction;

      // circle inner
      if (d < r1) {
        fragColor = v_color;
        return;
      }

      vec4 outline_color = lerpVec4(v_color, u_outline_color, u_blend_factor);

      // smoothstep from inner to outline
      if (d < v_size) {
        float r2 = v_size - u_outline_size + u_transition_smoothness + outline_correction;
        float s = smoothstep(r1, r2, d);
        fragColor = mix(v_color, outline_color, s);
        return;
      }

      // circle outline
      float r3 = v_size + u_outline_size - u_transition_smoothness;
      if (d < r3) {
        fragColor = outline_color;
        return;
      }

      // smoothstep from outline to outer (alpha=0)
      float r4 = v_size + u_outline_size;
      float s = smoothstep(r3, r4, d);
      fragColor = mix(outline_color, vec4(0.), s);
      
      return;
    }

    default: {
      // do a checkerboard for debug
      // https://www.shadertoy.com/view/lt2XWK

      float cb_size = 10.;

      vec2 pos = floor(gl_FragCoord.xy / cb_size);
      float pattern_mask = mod(pos.x + mod(pos.y, 2.), 2.);
      fragColor = vec4(pattern_mask * vec3(1.), 1.);

      return;
    }
  }
}
`;
