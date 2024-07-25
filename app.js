import { Shader } from './shader.js';
import { vec2 } from './vec2.js';
import { vec3 } from './vec3.js'; 
import { vec4 } from './vec4.js';
import { Color } from './color.js';

import { getWebGLCanvasSize, getWebGLCanvasCenter } from './utils.js';

import { polygonShader_vert, polygonShader_frag } from './polygonShader.js';
import { outlineVertexShader_vert, outlineVertexShader_frag } from './outlineVertexShader.js';

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

const outlineColor = new Color(255, 0, 0, 255);

const outlineSize = 3;
let polygonShader, outlineVertexShader;

// change this value to anything above 300 and the fps will drop significantly
let polygonCount = 100;

let lastTime = 0;
let frameCount = 0;
let fps = 0;
let updateFpsEvery = 0.05;
let now; // current time

let bgColor = new Color("#a7a7af");

// polygon data
let p_coords = [];
let p_colors = [];
let p_indices = [];

// outline vertex circle data 

// let ov_positions = [
//   new vec2(-1, -1),
//   new vec2(-1, 1),
//   new vec2(1, 1),
//   new vec2(1, -1)
// ];

let ov_positions = [
  new vec2(-1, -1),
  new vec2(-1, 1),
  new vec2(1, 1),
  new vec2(-1, -1),
  new vec2(1, 1),
  new vec2(1, -1)
];
let ov_offsets = [];

const pCoordBuffer = gl.createBuffer();
const pColorBuffer = gl.createBuffer();
const pIndexBuffer = gl.createBuffer();

const ovPositionBuffer = gl.createBuffer();
const ovOffsetBuffer = gl.createBuffer();

/*
pos: vec2
offset: vec2
size: float
attr: uint
color: Color
*/
function addSingleData({pos, color}) {
  p_coords.push(Math.round(pos.x), Math.round(pos.y));
  p_colors.push(color.r, color.g, color.b, color.a);
}

function pushIndices(newIndices, offset) {
  const newIndicesCount = newIndices.length;
  for (let i = 0; i < newIndicesCount; i++) {
    p_indices.push(newIndices[i] + offset);
  }
}

function addPolygon({vertices, offset, size, color}) {
  const vertexCount = Math.min(vertices.length, 255); // max 255 vertices per polygon

  // be sure to include the indices!
  // btw screw concave polygons, you can't just add indices straightforward
  // convex - your indices will be 0,1,2, 0,2,3, ..., 0,n-2,n-1
  const currentPositionsLength = p_coords.length / 2;
  for (let i = 0; i < vertexCount - 2; i++) {
    pushIndices([0, i + 1, i + 2], currentPositionsLength);
  }

  for (let i = 0; i < vertexCount; i++) {
    const pos_ = new vec2(vertices[i].x * size + offset.x, vertices[i].y * size + offset.y); 

    addSingleData({
      pos: pos_,
      color: color
    });

    ov_offsets.push(Math.round(offset.x), Math.round(offset.y));
  }
}

function clearBuffers() {
  p_coords = [];
  p_colors = [];
  p_indices = [];

  ov_positions = [];
  ov_offsets = [];
}



function initBuffers() {
  polygonShader.use();

  gl.bindBuffer(gl.ARRAY_BUFFER, pCoordBuffer);
  const pCoordLocation = polygonShader.getAttribLocation("a_coord");
  gl.vertexAttribIPointer(pCoordLocation, 2, gl.SHORT, false, 0, 0);
  gl.enableVertexAttribArray(pCoordLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, pColorBuffer);
  const pColorLocation = polygonShader.getAttribLocation("a_color");
  gl.vertexAttribPointer(pColorLocation, 4, gl.UNSIGNED_BYTE, true, 0, 0);
  gl.enableVertexAttribArray(pColorLocation);

  // ovPositionBuffer stores positions of each square: -1 -1 to 1 1 (2x int32)
  // ovOffsetBuffer stores the offset of each square instance (2x int16)
  outlineVertexShader.use();

  gl.bindBuffer(gl.ARRAY_BUFFER, ovPositionBuffer);
  const ovPositionLocation = outlineVertexShader.getAttribLocation("a_pos");
  gl.vertexAttribIPointer(ovPositionLocation, 2, gl.SHORT, false, 0, 0);
  gl.enableVertexAttribArray(ovPositionLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, ovOffsetBuffer);
  const ovOffsetLocation = outlineVertexShader.getAttribLocation("a_offset");
  gl.vertexAttribIPointer(ovOffsetLocation, 2, gl.SHORT, false, 0, 0);
  gl.enableVertexAttribArray(ovOffsetLocation);
  gl.vertexAttribDivisor(ovOffsetLocation, 1);

  // gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function glbdAll() {

  polygonShader.use();
  gl.bindBuffer(gl.ARRAY_BUFFER, pCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Int16Array(p_coords), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, pColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(p_colors), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(p_indices), gl.STATIC_DRAW);

  outlineVertexShader.use();
  gl.bindBuffer(gl.ARRAY_BUFFER, ovPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Int16Array(ov_positions), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, ovOffsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Int16Array(ov_offsets), gl.STATIC_DRAW);
}




function renderLoop(timestamp) {
  now = timestamp;
  calculateFPS(now);

  gl.clearColor(bgColor.r, bgColor.g, bgColor.b, bgColor.a);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  update();
  draw();

  requestAnimationFrame(renderLoop);
}

function update() {}
function draw() {
  polygonShader.use();
  gl.drawElements(gl.TRIANGLES, p_indices.length, gl.UNSIGNED_INT, 0);

  outlineVertexShader.use();
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, ov_offsets.length / 2);
}

function addData() {
  for (let i = 0; i < polygonCount; i++) {
    let o_ = getWebGLCanvasCenter(canvas).multiply(new vec2(Math.random(), Math.random()));
    addPolygon({
      vertices: [
        new vec2(-1, -1),
        new vec2(-1, 1.5),
        new vec2(1.1, 1),
        new vec2(1.5, -1.1),
        new vec2(3.0, -3.0),
      ],
      offset: o_,
      size: 35,
      color: new Color(25, 155, 25, 255)
    });
  }
}

function init() {
  writeOverlayContent();

  // gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  polygonShader = new Shader(gl, polygonShader_vert, polygonShader_frag);
  console.log(`polygonShader created with ID: ${polygonShader.getID()}`);
  polygonShader.use();
  polygonShader.setVec2("u_winres", getWebGLCanvasSize(canvas));

  outlineVertexShader = new Shader(gl, outlineVertexShader_vert, outlineVertexShader_frag);
  console.log(`outlineVertexShader created with ID: ${outlineVertexShader.getID()}`);
  // check if polygonshader and outlinevertex shader id are the same
  outlineVertexShader.use();
  outlineVertexShader.setVec2("u_winres", getWebGLCanvasSize(canvas));
  outlineVertexShader.setVec4("u_color", outlineColor.toNormalizedVec4());

  // in no particular order
  addData();
  glbdAll();
  initBuffers();

  // print all lengths
  console.log(` lengths (coords, colors, indices, ov_positions, ov_offsets): ${p_coords.length}, ${p_colors.length}, ${p_indices.length}, ${ov_positions.length}, ${ov_offsets.length}`);

  resizeCanvasToDisplaySize(canvas);
  const canvasSizeText = document.getElementById('canvas-size-text');
  canvasSizeText.textContent = `Canvas size: ${canvas.width} x ${canvas.height}`;

  // printBuffers();
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
    polygonShader.use();
    polygonShader.setVec2("u_winres", getWebGLCanvasSize(canvas));
    outlineVertexShader.use();
    outlineVertexShader.setVec2("u_winres", getWebGLCanvasSize(canvas));

    // canvas-size-text
    const canvasSizeText = document.getElementById('canvas-size-text');
    canvasSizeText.textContent = `Canvas size: ${canvas.width} x ${canvas.height}`;
  }
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
