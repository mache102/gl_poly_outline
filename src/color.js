import { vec3 } from './vec3.js'; 
import { vec4 } from './vec4.js';

export class Color {
  // in C++ this was std::map<std::string, Color> cmap = {};
  static cmap = new Map();

  /*
  EXAMPLES 

  no args: Color() -> Color(0, 0, 0, 255)

  1x uint32_t: Color(11393254) -> #add8e6
    (this is the least readable option, hence best suited for reading from binary data)

  #RRGGBBAA: Color("#add8e6ff") -> #add8e6ff

  #RRGGBB: Color("#add8e6") -> #add8e6ff

  // 1x string "R G B A": Color("173 216 230 255") -> #add8e6ff
  //   (not sure why this is a thing, but it is)

  1x string: Color("light blue") -> #add8e6ff
    (requires the color to be in cmap first; add using `Color.addColor(name, color)`)

  4x uint8_t: Color(173, 216, 230, 255) -> #add8e6ff
  3x uint8_t: Color(173, 216, 230) -> #add8e6ff (a = 255)

  4x float: Color(0.678, 0.847, 0.902, 1) -> #add8e6ff
    (the four args are read as floats if ANY of them are floats)


  */
  constructor(arg1, arg2, arg3, arg4) {
    if (arg1 === undefined) {
      // Default constructor
      this.r = this.g = this.b = 0;
      this.a = 255;
    } else if (typeof arg1 === 'number' && arg2 === undefined) {
      // 1x uint32_t
      this.r = (arg1 >> 24) & 0xFF;
      this.g = (arg1 >> 16) & 0xFF;
      this.b = (arg1 >> 8) & 0xFF;
      this.a = arg1 & 0xFF;
    } else if (typeof arg1 === 'string') {
      // 1x std::string str
      if (arg1.startsWith('#')) {
        // #RRGGBBAA OR #RRGGBB
        if (arg1.length === 7) {
          arg1 += 'FF';
        }

        if (arg1.length !== 9) {
          console.error(`Expected hex color to be #RRGGBB or #RRGGBBAA, got ${arg1}; creating Color(0, 0, 0, 255) instead`);
          this.r = this.g = this.b = 0;
          this.a = 255;
          return;
        }

        // substr is deprecated
        this.r = parseInt(arg1.slice(1, 3), 16);
        this.g = parseInt(arg1.slice(3, 5), 16);
        this.b = parseInt(arg1.slice(5, 7), 16);
        this.a = parseInt(arg1.slice(7, 9), 16);
      // } else if (!isNaN(parseFloat(arg1))) {
      //   // R G B A from string
      //   [this.r, this.g, this.b, this.a] = arg1.split(' ').map(Number);
      } else {
        // color name
        let color = Color.cmap.get(arg1);
        if (!color) {
          console.error(`Color name ${arg1} not found in cmap; creating Color(0, 0, 0, 255) instead`);
          this.r = this.g = this.b = 0;
          this.a = 255;
          return;
        }
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
      }
    } else if (typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number') {
      if (typeof arg4 === 'number') {
        // if ANY of the four is a float, we will assume all are floats (and convert to uint8)
        if (arg1 % 1 !== 0 || arg2 % 1 !== 0 || arg3 % 1 !== 0 || arg4 % 1 !== 0) {
          this.r = Math.round(arg1 * 255);
          this.g = Math.round(arg2 * 255);
          this.b = Math.round(arg3 * 255);
          this.a = Math.round(arg4 * 255);
        } else {
          // all uints
          this.r = arg1;
          this.g = arg2;
          this.b = arg3;
          this.a = arg4;
        }
      } else {
        if (arg1 % 1 !== 0 || arg2 % 1 !== 0 || arg3 % 1 !== 0) {
          this.r = Math.round(arg1 * 255);
          this.g = Math.round(arg2 * 255);
          this.b = Math.round(arg3 * 255);
        } else {
          // 3x uint8_t
          this.r = arg1;
          this.g = arg2;
          this.b = arg3;
        }
        this.a = 255;
      }
    } else {
      // Default constructor logic or error
      console.error(`Invalid constructor arguments for Color: ${arg1}, ${arg2}, ${arg3}, ${arg4}; creating Color(0, 0, 0, 255) instead`);
      this.r = this.g = this.b = 0;
      this.a = 255;
    }
  }

  add(c) {
    return new Color(this.r + c.r, this.g + c.g, this.b + c.b, this.a + c.a);
  }

  subtract(c) {
    return new Color(this.r - c.r, this.g - c.g, this.b - c.b, this.a - c.a);
  }

  /*
  blendFactor = 0: return this
  blendFactor = 1: return c
  */
  lerp(c, blendFactor) {
    return new Color(
      (this.r * (1 - blendFactor) + c.r * blendFactor) % 256,
      (this.g * (1 - blendFactor) + c.g * blendFactor) % 256,
      (this.b * (1 - blendFactor) + c.b * blendFactor) % 256,
      (this.a * (1 - blendFactor) + c.a * blendFactor) % 256
    );
  }

  rgb(normalize = true) {
    if (normalize) {
      return new vec3(this.r, this.g, this.b).divide(255);
    }
    return new vec3(this.r, this.g, this.b);
  }

  rgba(normalize = true) {
    if (normalize) {
      return new vec4(this.r, this.g, this.b, this.a).divide(255);
    }
    return new vec4(this.r, this.g, this.b, this.a);
  }

  normalize() {
    return [this.r / 255, this.g / 255, this.b / 255, this.a / 255];
  }

  print() {
    console.log(`rgba: (${this.r}, ${this.g}, ${this.b}, ${this.a})`);
  }

  scale(factor) {
    return new Color(
      Math.round(this.r * factor),
      Math.round(this.g * factor),
      Math.round(this.b * factor),
      this.a
    );
  }

  toUint32() {
    return (this.r << 24) | (this.g << 16) | (this.b << 8) | this.a;
  }

  toHex() {
    // #RRGGBB if a = 255, #RRGGBBAA otherwise
    if (this.a === 255) {
      return `#${this.r.toString(16).padStart(2, '0')}${this.g.toString(16).padStart(2, '0')}${this.b.toString(16).padStart(2, '0')}`;
    }
    return `#${this.r.toString(16).padStart(2, '0')}${this.g.toString(16).padStart(2, '0')}${this.b.toString(16).padStart(2, '0')}${this.a.toString(16).padStart(2, '0')}`;
  }

  // for canvas2D
  getCssString() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }

  static getColor(name) {
    if (!Color.cmap.has(name)) {
      console.error(`Error: Color name "${name}" not found in cmap, returning Color(0, 0, 0, 255) instead`);
      return new Color(0, 0, 0, 255);
    }
    return Color.cmap.get(name);
  }

  static addColor(name, color) {
    Color.cmap.set(name, color);
  }

  // returns true if the color existed and was removed; false if not found
  static removeColor(name) {
    return Color.cmap.delete(name);
  }
}