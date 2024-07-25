// impl of glm::vec3

export class vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  toArray() {
    return new Float32Array([this.x, this.y, this.z]);
  }

  add(v) {
    return new vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v) {
    return new vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiply(v) {
    if (typeof v === 'number') {
      return new vec3(this.x * v, this.y * v, this.z * v);
    }
    return new vec3(this.x * v.x, this.y * v.y, this.z * v.z);
  }

  divide(v) {
    if (typeof v === 'number') {
      return new vec3(this.x / v, this.y / v, this.z / v);
    }
    return new vec3(this.x / v.x, this.y / v.y, this.z / v);
  }

  equals(v) {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }

  normalize() {
    const length = this.magnitude();
    if (length > 0) {
      return new vec3(this.x / length, this.y / length, this.z / length);
    }
    return this;
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  cross(v) {
    return new vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  static dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  }

  static distance(v1, v2) {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const dz = v1.z - v2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
