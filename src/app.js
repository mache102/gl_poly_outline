import { Shader } from './shader.js';
import { vec2 } from './vec2.js';
import { vec3 } from './vec3.js'; 
import { vec4 } from './vec4.js';
import { Color } from './color.js';
import { Timer } from './timer.js';

import { POLYGON_BODY, OUTLINE_CORNER, OUTLINE_QUAD, POLYGON_CIRCLE, cornerCoordAttrs, cornerCoords, InstanceIndex, OutlineQuad, getCanvasSize, getCanvasCenter, getRandCoord } from './utils.js';

import { polygonShader_vert, polygonShader_frag } from './shaders/polygonShader.js';

const canvas = document.getElementById('game-canvas');

canvas.width = 1920;
canvas.height = 1080;

const gl = canvas.getContext('webgl2', { antialias: true });
if (gl) {
  console.log('Renderer:', gl.getParameter(gl.RENDERER));
  console.log('Vendor:', gl.getParameter(gl.VENDOR));
  console.log('Max Texture Size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));

  // Check for extensions
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    console.log('Unmasked Vendor ID:', debugInfo.UNMASKED_VENDOR_WEBGL);
    console.log('Unmasked Renderer ID:', debugInfo.UNMASKED_RENDERER_WEBGL);
  }

} else {
  alert('Unable to initialize WebGL2. Your browser may not support it.');
}



/* ******** ******** ******** ******** ******** ******** ******** ********

SETTINGS

******** ******** ******** ******** ******** ******** ******** ******** */


let bgColor = new Color("#dbdbdb");
let outlineColor = new Color("#484848");
let outlineSize = 2.5;
let transitionSmoothness = 1.0;
let blendFactor = 0.6;

let polygonColors = [
  new Color("#3ca4cb"),
  new Color("#8abc3f"),
  new Color("#e03e41"),
  new Color("#cc669c")
];

let polygonCount = 10000;

let minSize = 2;
let maxSize = 30;

let vertices = [
  new vec2(0.5, -2),
  new vec2(2, -2),
  new vec2(2.8, -1.2),
  new vec2(3.9, 0), 
  new vec2(2.8, 1.2), 
  new vec2(2, 2), 
  new vec2(0, 1.5), 
  new vec2(0, 0)
];

let tick_updates = 0;
// let render_as_circles = 0;

let print_every = 200;


/* ******** ******** ******** ******** ******** ******** ******** ********

GLOBALS

******** ******** ******** ******** ******** ******** ******** ******** */
let shader;

let tick = 0;
// fps calculation
let lastTime = 0;
let frameCount = 0;
let fps = 0;
let updateFpsEvery = 0.05;
let now; // current time


let p_coords = [];
let p_offsets = [];
let p_rotations = [];
let p_sizes = [];

let p_outline_directions = [];
let p_attrs = [];
let p_colors = [];

let p_indices = [];

let instance_indices = [];

const pCoordBuffer = gl.createBuffer();
const pRotationBuffer = gl.createBuffer();
const pSizeBuffer = gl.createBuffer();
const pOffsetBuffer = gl.createBuffer();

const pOutlineDirectionBuffer = gl.createBuffer();
const pAttrBuffer = gl.createBuffer();
const pColorBuffer = gl.createBuffer();

const pIndexBuffer = gl.createBuffer();

/* ******** ******** ******** ******** ******** ******** ******** ********

MAIN

******** ******** ******** ******** ******** ******** ******** ******** */

function pushIndices(newIndices, offset) {
  const newIndicesCount = newIndices.length;
  for (let i = 0; i < newIndicesCount; i++) {
    p_indices.push(newIndices[i] + offset);
  }
}

function addPolygon({vertices, rotation, size, offset, color}) {
  const vertexCount = vertices.length;
  // in order: polygon itself, outline vertices, outline quads

  // 1. polygon itself
  let idx = p_coords.length / 2;
  for (let i = 0; i < vertexCount - 2; i++) {
    pushIndices([0, i + 1, i + 2], idx);
  }

  let outlineQuads = [];
  for (let i = 0; i < vertexCount; i++) {
    let v = vertices[i];
    let nv = vertices[(i + 1) % vertexCount];

    let outline_direction = Math.atan2(nv.y - v.y, nv.x - v.x) + Math.PI / 2;
    outlineQuads.push(new OutlineQuad(v, nv, outline_direction));

    p_coords.push(v.x, v.y);
    p_rotations.push(rotation);
    p_sizes.push(size);
    p_offsets.push(offset.x, offset.y);

    p_outline_directions.push(0.);
    p_attrs.push(POLYGON_BODY);
    p_colors.push(color.r, color.g, color.b, color.a);
  }

  // 2. outline corners
  for (let i = 0; i < vertexCount; i++) {
    pushIndices([0, 1, 2, 0, 2, 3], p_coords.length / 2);

    let v = vertices[i];
    for (let j = 0; j < 4; j++) {
      p_coords.push(v.x, v.y);
      p_rotations.push(rotation);
      p_sizes.push(size);
      p_offsets.push(offset.x, offset.y);

      p_outline_directions.push(0.);
      p_attrs.push(cornerCoordAttrs[j] | OUTLINE_CORNER);
      p_colors.push(color.r, color.g, color.b, color.a);
    }
  }

  // 3. outline quads
  for (let quad of outlineQuads) {
    pushIndices([0, 1, 2, 0, 2, 3], p_coords.length / 2);

    quad.apply(p_coords, p_outline_directions);

    for (let i = 0; i < 4; i++) {
      p_rotations.push(rotation);
      p_sizes.push(size);
      p_offsets.push(offset.x, offset.y);

      p_attrs.push(OUTLINE_QUAD);
      p_colors.push(color.r, color.g, color.b, color.a);
    }
  }
}

function addCircle({size, offset, color}) {
  // circles only need the polygon itself
  // use cornerCoords btw

  // 1. polygon itself
  let idx = p_coords.length / 2;
  pushIndices([0, 1, 2, 0, 2, 3], idx);

  for (let i = 0; i < 4; i++) {
    p_coords.push(cornerCoords[i].x, cornerCoords[i].y);
    p_rotations.push(0.); // interesting
    p_sizes.push(size);
    p_offsets.push(offset.x, offset.y);

    p_outline_directions.push(0.);
    p_attrs.push(POLYGON_CIRCLE);
    p_colors.push(color.r, color.g, color.b, color.a);
  }
}

function clearBuffers() {
  p_coords = [];
  p_rotations = [];
  p_sizes = [];
  p_offsets = [];

  p_outline_directions = [];
  p_attrs = [];
  p_colors = [];

  p_indices = [];
}

function printSizes() {
  console.log(`buffer sizes (coord, rotation, size, offset, outline_direction, attr, color, index):
    ${p_coords.length}, 
    ${p_rotations.length}, 
    ${p_sizes.length}, 
    ${p_offsets.length}, 

    ${p_outline_directions.length}, 
    ${p_attrs.length}, 
    ${p_colors.length}, 

    ${p_indices.length}
  `);
}


function initBuffers(shader) {
  shader.use();

  gl.bindBuffer(gl.ARRAY_BUFFER, pCoordBuffer);
  const coordLoc = shader.getAttribLocation("a_coord");
  gl.vertexAttribPointer(coordLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(coordLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, pRotationBuffer);
  const rotationLoc = shader.getAttribLocation("a_rotation");
  gl.vertexAttribPointer(rotationLoc, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(rotationLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, pSizeBuffer);
  const sizeLoc = shader.getAttribLocation("a_size");
  gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(sizeLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, pOffsetBuffer);
  const offsetLoc = shader.getAttribLocation("a_offset");
  gl.vertexAttribPointer(offsetLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(offsetLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, pOutlineDirectionBuffer);
  const outlineDirectionLoc = shader.getAttribLocation("a_outline_direction");
  gl.vertexAttribPointer(outlineDirectionLoc, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(outlineDirectionLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, pAttrBuffer);
  const attrLoc = shader.getAttribLocation("a_attr");
  gl.vertexAttribIPointer(attrLoc, 1, gl.UNSIGNED_BYTE, false, 0, 0);
  gl.enableVertexAttribArray(attrLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, pColorBuffer);
  const colorLoc = shader.getAttribLocation("a_color");
  gl.vertexAttribPointer(colorLoc, 4, gl.UNSIGNED_BYTE, true, 0, 0);
  gl.enableVertexAttribArray(colorLoc);
}

function glbdAll() {
  gl.bindBuffer(gl.ARRAY_BUFFER, pCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p_coords), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, pRotationBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p_rotations), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, pSizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p_sizes), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, pOffsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p_offsets), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, pOutlineDirectionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p_outline_directions), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, pAttrBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(p_attrs), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, pColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(p_colors), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(p_indices), gl.STATIC_DRAW);
}

// self.onmessage = function(e) {
//   const { instance_indices, p_rotations } = e.data;
//   for (let i = 0; i < instance_indices.length; i++) {
//     for (let j = 0; j < instance_indices[i].count; j++) {
//       p_rotations[instance_indices[i].start + j] += 0.01;
//     }
//   }
//   self.postMessage({ p_rotations });
// };

// const updateWorker = new Worker('updateWorker.js');

// updateWorker.onmessage = function(e) {
//   const { p_rotations } = e.data;
//   gl.bindBuffer(gl.ARRAY_BUFFER, pRotationBuffer);
//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p_rotations), gl.STATIC_DRAW);
// };


function renderLoop(timestamp) {
  now = timestamp;
  calculateFPS(now);

  gl.clearColor(...bgColor.normalize());
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (tick_updates) {
    update();
    // updateWorker.postMessage({ instance_indices, p_rotations });
  }
  draw();

  requestAnimationFrame(renderLoop);
}

function update() {
  for (let i = 0; i < instance_indices.length; i++) {
    for (let j = 0; j < instance_indices[i].count; j++) {
      p_rotations[instance_indices[i].start + j] += 0.01;
    }
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, pRotationBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p_rotations), gl.STATIC_DRAW);
}

function draw() {
  shader.use();

  gl.drawElements(gl.TRIANGLES, p_indices.length, gl.UNSIGNED_INT, 0);
}

function init() {
  writeOverlayContent();

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  shader = new Shader(gl, polygonShader_vert, polygonShader_frag);
  shader.use();
  shader.setVec2("u_winres", getCanvasSize(canvas));
  shader.setVec4("u_outline_color", outlineColor.rgba(true));
  shader.setFloat("u_outline_size", outlineSize);
  shader.setFloat("u_transition_smoothness", transitionSmoothness);
  shader.setFloat("u_blend_factor", blendFactor);

  initBuffers(shader);
  
  for (let i = 0; i < polygonCount; i++) {
    let o = getRandCoord(canvas);
    instance_indices.push(new InstanceIndex(p_coords.length, 0));

    if (i % 2 === 0) {
      addPolygon({
        vertices: vertices,
        rotation: i * 2 * Math.PI / 360.0,
        size: Math.random() * (maxSize - minSize) + minSize,
        offset: o,
        color: polygonColors[Math.floor(Math.random() * polygonColors.length)]
      });
    } else {
      addCircle({
        size: Math.random() * (maxSize - minSize) + minSize,
        offset: o,
        color: polygonColors[Math.floor(Math.random() * polygonColors.length)]
      });
    }
    instance_indices[i].count = p_coords.length - instance_indices[i].start;
  }

  printSizes();
  glbdAll();

  resizeCanvasToDisplaySize(canvas);
  const canvasSizeText = document.getElementById('canvas-size-text');
  canvasSizeText.textContent = `Canvas size: ${canvas.width} x ${canvas.height}`;

  renderLoop();
}

function resizeCanvasToDisplaySize(canvas) {
  if (!canvas || !gl) return;
  const displayWidth  = window.innerWidth;
  const displayHeight = window.innerHeight;

  // Check if the canvas is not the same size.
  if (canvas.width  !== displayWidth ||
      canvas.height !== displayHeight) {

    canvas.width  = displayWidth;
    canvas.height = displayHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);
    shader.use();
    shader.setVec2("u_winres", getCanvasSize(canvas));
    shader.setVec2("u_winres_frag", getCanvasSize(canvas));

    // canvas-size-text
    const canvasSizeText = document.getElementById('canvas-size-text');
    canvasSizeText.textContent = `Canvas size: ${canvas.width} x ${canvas.height}`;

    return true;
  }
  return false;
}

function calculateFPS(now) {
  now *= 0.001;
  const deltaTime = now - lastTime;

  frameCount++;

  if (deltaTime >= updateFpsEvery) { 
    fps = frameCount / deltaTime;
    frameCount = 0;
    lastTime = now;
    // fps-text
    const fpsText = document.getElementById('fps-text');
    fpsText.textContent = `FPS: ${fps.toFixed(2)}`;
  }
}

function writecc(overlayContent) {
  /*
  bgColor: color selector
  outlineColor: color selector
  outlineSize: number input
  transitionSmoothness: number input
  blendFactor: slider (0~1)

  ----- separator -----

  tick_updates: checkbox
  render_as_circles: checkbox
  */
  const cc = document.createElement('div');
  cc.setAttribute('id', 'config-content');
  cc.classList.add('config-content');

  const c1 = document.createElement('div');
  c1.classList.add('config-item');
  const l1 = document.createElement('label');
  l1.setAttribute('for', 'bg-color-input');
  l1.textContent = 'Background Color: ';
  c1.appendChild(l1);
  const i1 = document.createElement('input');
  i1.setAttribute('type', 'color');
  i1.setAttribute('id', 'bg-color-input');
  i1.setAttribute('value', bgColor.toHex());
  i1.addEventListener('input', (e) => {
    bgColor = new Color(e.target.value);
  });
  c1.appendChild(i1);
  cc.appendChild(c1);

  const c2 = document.createElement('div');
  c2.classList.add('config-item');
  const l2 = document.createElement('label');  
  l2.setAttribute('for', 'outline-color-input');
  l2.textContent = 'Outline Color: ';
  c2.appendChild(l2);
  const i2 = document.createElement('input');
  i2.setAttribute('type', 'color');
  i2.setAttribute('id', 'outline-color-input');
  i2.setAttribute('value', outlineColor.toHex());
  i2.addEventListener('input', (e) => {
    outlineColor = new Color(e.target.value);
    shader.use();
    shader.setVec4("u_outline_color", outlineColor.rgba(true));
  });
  c2.appendChild(i2);
  cc.appendChild(c2);

  const c3 = document.createElement('div');
  c3.classList.add('config-item');
  const l3 = document.createElement('label');
  l3.setAttribute('for', 'outline-size-input');
  l3.textContent = 'Outline Size: ';
  c3.appendChild(l3);
  const i3 = document.createElement('input');
  i3.setAttribute('type', 'number');
  i3.setAttribute('id', 'outline-size-input');
  i3.setAttribute('value', outlineSize);
  i3.addEventListener('input', (e) => {
    outlineSize = parseFloat(e.target.value);
    shader.use();
    shader.setFloat("u_outline_size", outlineSize);
  });
  c3.appendChild(i3);
  cc.appendChild(c3);

  const c4 = document.createElement('div');
  c4.classList.add('config-item');
  const l4 = document.createElement('label');
  l4.setAttribute('for', 'transition-smoothness-input');
  l4.textContent = 'Transition Smoothness: ';
  c4.appendChild(l4);
  const i4 = document.createElement('input');
  i4.setAttribute('type', 'range');
  i4.setAttribute('id', 'transition-smoothness-input');
  i4.setAttribute('min', '0');
  i4.setAttribute('max', '3');
  i4.setAttribute('step', '0.01');
  i4.setAttribute('value', transitionSmoothness);
  i4.addEventListener('input', (e) => {
    transitionSmoothness = parseFloat(e.target.value);
    shader.use();
    shader.setFloat("u_transition_smoothness", transitionSmoothness);

    document.getElementById('v4-span').textContent = transitionSmoothness;
  });
  c4.appendChild(i4);
  const v4 = document.createElement('span');
  v4.setAttribute('id', 'v4-span');
  v4.textContent = transitionSmoothness;
  c4.appendChild(v4);
  cc.appendChild(c4);

  const c5 = document.createElement('div');
  c5.classList.add('config-item');
  const l5 = document.createElement('label');
  l5.setAttribute('for', 'blend-factor-input');
  l5.textContent = 'Blend Factor: ';
  c5.appendChild(l5); 
  const i5 = document.createElement('input');
  i5.setAttribute('type', 'range');
  i5.setAttribute('id', 'blend-factor-input');
  i5.setAttribute('min', '0'); 
  i5.setAttribute('max', '1');
  i5.setAttribute('step', '0.01'); 
  i5.setAttribute('value', blendFactor);
  i5.addEventListener('input', (e) => {
    blendFactor = parseFloat(e.target.value);
    shader.use();
    shader.setFloat("u_blend_factor", blendFactor);

    document.getElementById('v5-span').textContent = blendFactor;
  });
  c5.appendChild(i5);
  const v5 = document.createElement('span');
  v5.setAttribute('id', 'v5-span');
  v5.textContent = blendFactor;
  c5.appendChild(v5);
  cc.appendChild(c5);
  
  const c6 = document.createElement('div');
  c6.classList.add('config-item');

  const l6 = document.createElement('label');
  l6.setAttribute('for', 'tick-updates-input');
  l6.textContent = 'Tick Updates: ';
  c6.appendChild(l6);
  const i6 = document.createElement('input');
  i6.setAttribute('type', 'checkbox');
  i6.setAttribute('id', 'tick-updates-input');
  i6.setAttribute('value', tick_updates);
  i6.addEventListener('change', (e) => {
    tick_updates = e.target.checked;
  });
  c6.appendChild(i6);
  cc.appendChild(c6);

  overlayContent.appendChild(cc);
}

function writeOverlayContent() {
  const mainContent = document.getElementById('main-content');

  const overlayContent = document.createElement('div');
  overlayContent.setAttribute('id', 'game-overlay-content');
  overlayContent.classList.add('overlay-content');

  // two <p> in Ubuntu: 1) canvas size X x Y, 2) FPS: Z
  const canvasSizeText = document.createElement('p');
  canvasSizeText.setAttribute('id', 'canvas-size-text');
  canvasSizeText.classList.add('text-outline', 'font-bold', 'text-lg');
  canvasSizeText.textContent = `Canvas size: ${canvas.width} x ${canvas.height}`;
  overlayContent.appendChild(canvasSizeText);

  const fpsText = document.createElement('p');
  fpsText.setAttribute('id', 'fps-text');
  fpsText.classList.add('text-outline', 'font-bold', 'text-lg');
  fpsText.textContent = `FPS: ${fps.toFixed(2)}`;
  overlayContent.appendChild(fpsText);

  writecc(overlayContent);
  
  mainContent.appendChild(overlayContent);
}

// wait for dom load then call init()
window.addEventListener('load', init);
window.addEventListener('resize', () => {
  resizeCanvasToDisplaySize(canvas);
});
