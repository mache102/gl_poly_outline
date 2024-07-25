#version 330 core 

flat in uint v_attr;
in vec4 v_color;
in vec2 v_offset;

out vec4 fragColor;

uniform vec4 u_outline_color;
uniform float u_outline_size;
uniform float u_transition_smoothness;

const uint POLYGON_BODY = 0u;
const uint OUTLINE_CORNER = 1u;
const uint OUTLINE_QUAD = 2u;

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

void main(void) {

  switch (getUintBits(v_attr, 0, 1)) {
    // case POLYGON_BODY:
    // case OUTLINE_QUAD: {
    //   fragColor = v_color;
    //   return;
    // }

    // case OUTLINE_CORNER: {
    //   float s = smoothstep(u_outline_size - u_transition_smoothness, u_outline_size, distance(v_offset, gl_FragCoord.xy));
    //   fragColor = mix(u_outline_color, vec4(0.), s);
      
    //   return;
    // }

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
