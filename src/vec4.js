// impl of glm::vec4

export class vec4 {
  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  toArray() {
    return new Float32Array([this.x, this.y, this.z, this.w]);
  }

  add(v) {
    return new vec4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
  }

  subtract(v) {
    return new vec4(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v);
  }

  multiply(v) {
    if (typeof v === 'number') {
      return new vec4(this.x * v, this.y * v, this.z * v, this.w * v);
    }
    return new vec4(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v);
  }

  divide(v) {
    if (typeof v === 'number') {
      return new vec4(this.x / v, this.y / v, this.z / v, this.w / v);
    }
    return new vec4(this.x / v.x, this.y / v.y, this.z / v, this.w / v);
  }

  equals(v) {
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
  }

  normalize() {
    const length = this.magnitude();
    if (length > 0) {
      return new vec4(this.x / length, this.y / length, this.z / length, this.w / length);
    }
    return this;
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  cross(v) {
    return new vec4(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
      0
    )
  }

  static dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z + v1.w * v2.w;
  }

  static distance(v1, v2) {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const dz = v1.z - v2.z;
    const dw = v1.w - v2.w;
    return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
  }
}
