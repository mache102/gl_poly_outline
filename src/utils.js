import { vec2 } from "./vec2.js";

export const POLYGON_BODY = 0b00000000;
export const OUTLINE_CORNER = 0b00000001;
export const OUTLINE_QUAD = 0b00000010;
export const POLYGON_CIRCLE = 0b00000011;

export const cornerCoordAttrs = [
  0b00000000,
  0b00001000,
  0b00001100,
  0b00000100
];

export const cornerCoords = [
  new vec2(-1, -1), 
  new vec2(-1, 1), 
  new vec2(1, 1), 
  new vec2(1, -1)
];

export class InstanceIndex {
  constructor(start, count) {
    this.start = start;
    this.count = count;
  }
}

export class OutlineQuad {
  constructor(v, nv, direction) {
    this.v = v;
    this.nv = nv;
    this.direction = direction;
  }

  apply(vertices, outline_directions) {
    /*
    bottom left -> top left -> top right -> bottom right

    - | +   <--- nv
      |
    - | +   <--- v
      
    */
    vertices.push(this.v.x, this.v.y);
    vertices.push(this.nv.x, this.nv.y);
    vertices.push(this.nv.x, this.nv.y);
    vertices.push(this.v.x, this.v.y);

    for (let i = 0; i < 2; i++) {
      outline_directions.push(this.direction + Math.PI);
    }
    for (let i = 0; i < 2; i++) {
      outline_directions.push(this.direction);
    }
  }
}


export function getCanvasSize(canvas) {
  return new vec2(canvas.width, canvas.height);
}

export function getCanvasCenter(canvas) {
  return getCanvasSize(canvas).scale(0.5);
}

export function getRandCoord(canvas) {
  return new vec2(
    Math.random() * canvas.width - canvas.width / 2,
    Math.random() * canvas.height - canvas.height / 2
  );
}
