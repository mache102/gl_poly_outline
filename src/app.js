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
let render_as_circles = 0;

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
      p_colors.push(outlineColor.r, outlineColor.g, outlineColor.b, outlineColor.a);
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
      p_colors.push(outlineColor.r, outlineColor.g, outlineColor.b, outlineColor.a);
    }
  }
}

function addCircle({size, offset, color}) {
  // circles only need the polygon itself
  // use cornerCoords btw

  // 1. polygon itself
  let idx = p_coords.length;
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

function renderLoop(timestamp) {
  now = timestamp;
  calculateFPS(now);

  gl.clearColor(...bgColor.normalize());
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (tick_updates) {
    update();
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

  initBuffers(shader);
  
  for (let i = 0; i < polygonCount; i++) {
    let o = getRandCoord(canvas);
    instance_indices.push(new InstanceIndex(p_coords.length, 0));

    if (!render_as_circles) {
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

  // console.log(`has canvas, has gl? ${!!canvas}, ${!!gl}`);
  if (!canvas || !gl) return;
  // Lookup the size the browser is displaying the canvas in CSS pixels
  // and compute a size needed to make our drawingbuffer match it in
  // device pixels.
  const displayWidth  = window.innerWidth;
  const displayHeight = window.innerHeight;

  // Check if the canvas is not the same size.
  if (canvas.width  !== displayWidth ||
      canvas.height !== displayHeight) {

    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;

    // When resizing, you also need to reset the viewport of the canvas
    // otherwise, it will use the previous dimensions.
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
  now *= 0.001; // Convert time to seconds
  const deltaTime = now - lastTime; // Calculate the time difference since the last frame

  frameCount++; // Increment the frame counter

  if (deltaTime >= updateFpsEvery) { // When a second or more has passed
    fps = frameCount / deltaTime; // Calculate FPS
    frameCount = 0; // Reset frame counter
    lastTime = now;
    // fps-text
    const fpsText = document.getElementById('fps-text');
    fpsText.textContent = `FPS: ${fps.toFixed(2)}`;
    // console.log(`FPS: ${fps.toFixed(2)}`); // Log FPS to console or display it on your page
  }
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
  
  mainContent.appendChild(overlayContent);
}

// wait for dom load then call init()
window.addEventListener('load', init);
window.addEventListener('resize', () => {
  resizeCanvasToDisplaySize(canvas);
});
