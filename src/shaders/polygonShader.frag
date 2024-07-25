#version 330 core 

flat in uint v_attr;
in vec4 v_color;
in vec2 v_offset;

uniform vec4 u_outline_color;
uniform float u_outline_size;
uniform float u_transition_smoothness;

out vec4 fragColor;

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

  // is outline vertex 
  if (getBool(v_attr, 0)) {
    float s = smoothstep(u_outline_size - u_transition_smoothness, u_outline_size, distance(v_offset, gl_FragCoord.xy));
    fragColor = mix(u_outline_color, vec4(0.), s);
    return;
  }
  fragColor = v_color;
}
