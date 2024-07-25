import { vec2 } from './vec2.js'; 

export function getWebGLCanvasSize(canvas) {
  return new vec2(canvas.width, canvas.height);
}

export function getWebGLCanvasCenter(canvas) {
  return getWebGLCanvasSize(canvas).divide(2);
}