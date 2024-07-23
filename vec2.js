// impl of glm::vec2

export class vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  toArray() {
    return new Float32Array([this.x, this.y]);
  }

  add(v) {
    return new vec2(this.x + v.x, this.y + v.y);
  }

  subtract(v) {
    return new vec2(this.x - v.x, this.y - v.y);
  }

  multiply(v) {
    if (typeof v === 'number') {
      return new vec2(this.x * v, this.y * v);
    }
    return new vec2(this.x * v.x, this.y * v.y);
  }

  divide(v) {
    if (typeof v === 'number') {
      return new vec2(this.x / v, this.y / v);
    }
    return new vec2(this.x / v.x, this.y / v.y);
  }

  equals(v) {
    return this.x === v.x && this.y === v.y;
  }

  normalize() {
    const length = this.magnitude();
    if (length > 0) {
      return new vec2(this.x / length, this.y / length);
    }
    return this;
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  cross(v) {
    return new vec2(this.x * v.y - this.y * v.x);
  }

  static dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  }

  static distance(v1, v2) {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}