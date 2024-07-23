import { Shader } from './shader.js';
import { vec2 } from './vec2.js';
import { vec3 } from './vec3.js'; 
import { vec4 } from './vec4.js';
import { Color } from './color.js';

import { vertexShaderCode, fragmentShaderCode } from './glsl_main.js';

const canvas = document.getElementById('game-canvas');
const gl = canvas.getContext('webgl2', { antialias: true });
if (!gl) {
  alert('Unable to initialize WebGL2. Your browser may not support it.');
}

const outlineSize = 3;
let shader;
let vertexTexture;
let textureSize = 2048; // max 4194304 vertices 
let verticesPerPixel = 1; // 1 vertex per pixel
let maxVertexCount = textureSize * textureSize * verticesPerPixel;
let textureData = new Int16Array(maxVertexCount * 2); // 2 int16 values per vertex
let textureIndex = 0;
const vertexTextureUnit = 0;
let renderBoundingBoxes = false;
let repeatedPolygonCount = 10000;

let lastTime = 0;
let frameCount = 0;
let fps = 0;
let updateFpsEvery = 0.05;
let now; // current time

let bgColor = new Color("#a7a7af");
let isWireframe = false; // Initial mode: filled

let b_positions = [];
// let b_offsets = [];
// let b_sizes = [];
let b_attrs = [];
let b_colors = [];

let b_texture_polygon_indices = []; // first index of this polygon in the texture
let b_texture_lengths = []; // number of vertices in this polygon
let b_texture_vertex_indices = []; // index of this vertex in the texture

let b_indices = [];

const positionBuffer = gl.createBuffer();
// const offsetBuffer = gl.createBuffer();
// const sizeBuffer = gl.createBuffer();
const attrsBuffer = gl.createBuffer();
const colorBuffer = gl.createBuffer();
const indexBuffer = gl.createBuffer();

const texturePolygonIndicesBuffer = gl.createBuffer();
const textureLengthsBuffer = gl.createBuffer();
const textureVertexIndicesBuffer = gl.createBuffer();

/*
pos: vec2
offset: vec2
size: float
attr: uint
color: Color
*/
function addSingleData({pos, offset, size, attr, color, texturePolygonIndex, polygonLength, vertexIndex}) {
  // b_positions.push(pos.x, pos.y);
  b_positions.push(Math.round(pos.x), Math.round(pos.y));
  // b_offsets.push(offset.x, offset.y);
  // b_sizes.push(size);
  b_attrs.push(attr);
  b_colors.push(color.r, color.g, color.b, color.a);

  b_texture_polygon_indices.push(texturePolygonIndex);
  b_texture_lengths.push(polygonLength);
  b_texture_vertex_indices.push(vertexIndex);
}

function pushIndices(newIndices, offset) {
  const newIndicesCount = newIndices.length;
  for (let i = 0; i < newIndicesCount; i++) {
    b_indices.push(newIndices[i] + offset);
  }
}

function addPolygon({vertices, offset, size, attr, color}) {
  const vertexCount = Math.min(vertices.length, 255); // max 255 vertices per polygon

  // be sure to include the indices!
  // btw screw concave polygons, you can't just add indices straightforward
  // convex - your indices will be 0,1,2, 0,2,3, ..., 0,n-2,n-1
  const currentPositionsLength = b_positions.length / 2;
  // for (let i = 0; i < vertexCount - 2; i++) {
  //   pushIndices([0, i + 1, i + 2], currentPositionsLength);
  // }
  for (let i = 0; i < 2; i++) {
    pushIndices([0, i + 1, i + 2], currentPositionsLength);
  }

  let aa;
  let bb;

  for (let i = 0; i < vertexCount; i++) {
    const pos_ = new vec2(vertices[i].x * size + offset.x, vertices[i].y * size + offset.y);
    // update aa and bb (aa stores the smallest x,y; bb stores the largest x,y)
    if (i == 0) {
      aa = pos_;
      bb = pos_;
    } else {
      aa = new vec2(Math.min(aa.x, pos_.x), Math.min(aa.y, pos_.y));
      bb = new vec2(Math.max(bb.x, pos_.x), Math.max(bb.y, pos_.y));
    }
    // addSingleData({
    //   pos: pos_,
    //   offset: offset,
    //   size: size,
    //   attr: attr,
    //   color: color,
    //   texturePolygonIndex: textureIndex,
    //   polygonLength: vertexCount,
    //   vertexIndex: i
    // });

    textureData[(textureIndex + i) * 2] = pos_.x,
    textureData[(textureIndex + i) * 2 + 1] = pos_.y;
    // console.log(`appended vertex (${pos_.x}, ${pos_.y}) at index ${textureIndex + i}`);
  }

  aa = aa.subtract(new vec2(outlineSize, outlineSize));
  bb = bb.add(new vec2(outlineSize, outlineSize));

  let aabb = [aa, new vec2(aa.x, bb.y), bb, new vec2(bb.x, aa.y)];
  for (let i = 0; i < 4; i++) {
    addSingleData({
      pos: aabb[i],
      offset: offset,
      size: size,
      attr: attr,
      color: color,
      texturePolygonIndex: textureIndex,
      polygonLength: vertexCount,
      vertexIndex: i
    });
  }

  textureIndex += vertexCount;
}

function clearBuffers() {
  b_positions = [];
  // b_offsets = [];
  // b_sizes = [];
  b_attrs = [];
  b_colors = [];

  b_texture_polygon_indices = [];
  b_texture_lengths = [];
  b_texture_vertex_indices = [];  

  b_indices = [];
}

function printBuffers() {
  console.log(`positions: ${b_positions}`);
  // console.log(`offsets: ${b_offsets}`);
  // console.log(`sizes: ${b_sizes}`);
  console.log(`attrs: ${b_attrs}`); 
  console.log(`colors: ${b_colors}`);
  console.log(`indices: ${b_indices}`);

  console.log(`texture_polygon_indices: ${b_texture_polygon_indices}`);
  console.log(`texture_lengths: ${b_texture_lengths}`);
  console.log(`texture_vertex_indices: ${b_texture_vertex_indices}`);
}

function initBuffers(shader) {
  shader.use();

  // 31 bytes per vertex

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positionLocation = shader.getAttribLocation("a_position");
  // gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.vertexAttribIPointer(positionLocation, 2, gl.SHORT, false, 0, 0);
  gl.enableVertexAttribArray(positionLocation);

  // gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  // const offsetLocation = shader.getAttribLocation("a_offset");
  // gl.vertexAttribPointer(offsetLocation, 2, gl.FLOAT, false, 0, 0);
  // gl.enableVertexAttribArray(offsetLocation);

  // gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
  // const sizeLocation = shader.getAttribLocation("a_size");
  // gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);
  // gl.enableVertexAttribArray(sizeLocation);

  // gl.vertexAttribIPointer(index, size, type, stride, offset);
  gl.bindBuffer(gl.ARRAY_BUFFER, attrsBuffer);
  const attrsLocation = shader.getAttribLocation("a_attrs");
  gl.vertexAttribIPointer(attrsLocation, 1, gl.UNSIGNED_BYTE, false, 0, 0);
  gl.enableVertexAttribArray(attrsLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  const colorLocation = shader.getAttribLocation("a_color");
  gl.vertexAttribPointer(colorLocation, 4, gl.UNSIGNED_BYTE, true, 0, 0);
  gl.enableVertexAttribArray(colorLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, texturePolygonIndicesBuffer);  
  const texturePolygonIndicesLocation = shader.getAttribLocation("a_texture_polygon_index");
  gl.vertexAttribIPointer(texturePolygonIndicesLocation, 1, gl.UNSIGNED_INT, false, 0, 0);
  gl.enableVertexAttribArray(texturePolygonIndicesLocation);

  // polygon may not exceed 255 vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, textureLengthsBuffer);
  const textureLengthsLocation = shader.getAttribLocation("a_texture_polygon_length");
  gl.vertexAttribIPointer(textureLengthsLocation, 1, gl.UNSIGNED_BYTE, false, 0, 0);
  gl.enableVertexAttribArray(textureLengthsLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, textureVertexIndicesBuffer);
  const textureVertexIndicesLocation = shader.getAttribLocation("a_texture_vertex_index");
  gl.vertexAttribIPointer(textureVertexIndicesLocation, 1, gl.UNSIGNED_BYTE, false, 0, 0);
  gl.enableVertexAttribArray(textureVertexIndicesLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function glbdAll() {
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b_positions), gl.STATIC_DRAW);
  gl.bufferData(gl.ARRAY_BUFFER, new Int16Array(b_positions), gl.STATIC_DRAW);

  // gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b_offsets), gl.STATIC_DRAW);  

  // gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer); 
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b_sizes), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, attrsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(b_attrs), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(b_colors), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, texturePolygonIndicesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array(b_texture_polygon_indices), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, textureLengthsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(b_texture_lengths), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, textureVertexIndicesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(b_texture_vertex_indices), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(b_indices), gl.STATIC_DRAW);

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
    shader.setVec2("u_winres", new vec2(canvas.width, canvas.height));
    shader.setVec2("u_winres_frag", new vec2(canvas.width, canvas.height));

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
  shader.use();
  gl.bindTexture(gl.TEXTURE_2D, vertexTexture);

  // gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
  const mode = isWireframe ? gl.LINES : gl.TRIANGLES;


  // disable depth test for now
  // gl.disable(gl.DEPTH_TEST);
  gl.drawElements(mode, b_indices.length, gl.UNSIGNED_INT, 0);
  // gl.enable(gl.DEPTH_TEST);

}

function addData() {
  gl.bindTexture(gl.TEXTURE_2D, vertexTexture);
  for (let i = 0; i < 1; i++) {
    let o_ = new vec2(0, 0);
    o_ = o_.add(new vec2(i * 50 * Math.cos(i), i * 50 * Math.sin(i)));
    addPolygon({
    
      vertices: [
        new vec2(0, -0.5),
        new vec2(1, 0),
        new vec2(1, 1),
        new vec2(0, 1),
        new vec2(-0.5, 0.5), 
        new vec2(-0.5, 0),
      ],
      offset: o_,
      size: 149,
      attr: 0,
      color: new Color(25, 155, 25, 255)
    });
  }

  let polygonCountWidth = 50;
  let polygonCountHeight = 50;


  let canvasWidth = canvas.width;
  let canvasHeight = canvas.height;

  for (let i = 0; i < repeatedPolygonCount; i++) {
    // curroffset is based on the tiling of the polygon throughout the canvas
    // get x and y of the current polygon

    let nPolygonX = i % polygonCountWidth;
    let nPolygonY = Math.floor(i / polygonCountWidth);

    let currOffset = new vec2(nPolygonX * canvasWidth / polygonCountWidth, nPolygonY * canvasHeight / polygonCountHeight);
    currOffset = currOffset.subtract(new vec2(canvasWidth * 0.5, canvasHeight * 0.5)).multiply(4);

    addPolygon({
    
      vertices: [
        new vec2(-2, -1),
        new vec2(-2, 1),
        new vec2(-1, 2),
        new vec2(1, 2),
        new vec2(2, 1),
        new vec2(2, -1),
        new vec2(1, -2),
        new vec2(-1, -2),

      ],
      offset: currOffset,
      size: 20,
      attr: 0,
      color: new Color(25, 55, 225, 255)
    });
  }
  // addPolygon({
  //   vertices: [
  //     new vec2(-1, -1),
  //     new vec2(1, -1),
  //     new vec2(1, 1),
  //     new vec2(-1, 1), 
  //     new vec2(-2, 0)
  //   ],
  //   offset: new vec2(0, 0),
  //   size: 300,
  //   attr: 0,
  //   color: new Color(155, 15, 25, 255)
  // });



}

// x,y is the start pixel
// x+size, y+size is the end pixel
function updateTexture(x, y, xSize, ySize, data) {
  gl.bindTexture(gl.TEXTURE_2D, vertexTexture);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, xSize, ySize, gl.RG_INTEGER, gl.SHORT, data);
}

function createTexture() {

  vertexTexture = gl.createTexture();
  // same bind syntax as opengl actually
  gl.bindTexture(gl.TEXTURE_2D, vertexTexture);

  // use clamp to edge and nearest (NO INTERP!) for retrieving exact values
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // RG16I format to store 2x int16 values per pixel
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG16I, textureSize, textureSize);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureSize, textureSize, gl.RG_INTEGER, gl.SHORT, textureData);

  gl.bindTexture(gl.TEXTURE_2D, null);
}

function init() {
  writeOverlayContent();

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  shader = new Shader(gl, vertexShaderCode, fragmentShaderCode);
  shader.use();
  shader.setBool("u_render_bounding_boxes", renderBoundingBoxes);
  shader.setFloat("u_outline_size", outlineSize);
  createTexture();

  
  // in no particular order
  addData();
  glbdAll();
  initBuffers(shader);
  updateTexture(0, 0, textureSize, textureSize, textureData);
  gl.activeTexture(gl.TEXTURE0 + vertexTextureUnit);
  gl.bindTexture(gl.TEXTURE_2D, vertexTexture);
  shader.linkTextureUnit('u_vertex_sampler', vertexTextureUnit);
  shader.setVec2("u_vertex_sampler_size", new vec2(textureSize, textureSize));

  resizeCanvasToDisplaySize(canvas);
  const canvasSizeText = document.getElementById('canvas-size-text');
  canvasSizeText.textContent = `Canvas size: ${canvas.width} x ${canvas.height}`;

  // printBuffers();
  renderLoop();
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
// toggle wireframe mode
window.addEventListener('keydown', (e) => {
  if (e.key === 'x' || e.key === 'X') {
    isWireframe = !isWireframe;
  }
});

// toggle bounding boxes
window.addEventListener('keydown', (e) => {
  if (e.key === 'b' || e.key === 'B') {
    renderBoundingBoxes = !renderBoundingBoxes;
    shader.use();
    shader.setBool("u_render_bounding_boxes", renderBoundingBoxes);
  }
});
