import { vec2 } from './vec2.js';
import { vec3 } from './vec3.js'; 
import { vec4 } from './vec4.js';

class BaseShader {

  constructor(gl) {
    this.gl = gl;
    this.program = null;
  }

  use() {
    this.gl.useProgram(this.program);
  }

  getID() {
    return this.program;
  }

  getAttribLocation(name) {
    return this.gl.getAttribLocation(this.program, name);
  }

  getUniformLocation(name) {
    return this.gl.getUniformLocation(this.program, name);
  }

  linkTextureUnit(name, textureUnit) {
    const location = this.getUniformLocation(name);
    this.gl.uniform1i(location, textureUnit);
  }

  setBool(name, value) {
    const location = this.getUniformLocation(name);
    this.gl.uniform1i(location, value);
  }

  setInt(name, value) {
    const location = this.getUniformLocation(name);
    this.gl.uniform1i(location, value);
  }

  setIntArray(name, values) {
    const location = this.getUniformLocation(name);
    this.gl.uniform1iv(location, values);
  }

  setUint(name, value) { const location = this.getUniformLocation(name); this.gl.uniform1ui(location, value); } 
  setFloat(name, value) { const location = this.getUniformLocation(name); this.gl.uniform1f(location, value); } 
  setFloatArray(name, values) { const location = this.getUniformLocation(name); this.gl.uniform1fv(location, values); } 
  setVec2(name, value) { const location = this.getUniformLocation(name); this.gl.uniform2fv(location, value.toArray()); } 
  setVec3(name, value) { const location = this.getUniformLocation(name); this.gl.uniform3fv(location, value.toArray()); } 
  setVec3Array(name, values) { const location = this.getUniformLocation(name); const array = values.map(value => value.toArray()).flat(); this.gl.uniform3fv(location, array); }
  setVec4(name, value) { const location = this.getUniformLocation(name); this.gl.uniform4fv(location, value.toArray()); } 

  checkCompileErrors(gl, shader, type) {
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
      const infoLog = gl.getShaderInfoLog(shader);
      console.error(`ERROR::SHADER_COMPILATION_ERROR in: ${type} in shader\n${infoLog}`);
      return false; // Or throw an error
    }
    return true;
  }
  
  checkLinkErrors(gl, program) {
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
      const infoLog = gl.getProgramInfoLog(program);
      console.error(`ERROR::PROGRAM_LINKING_ERROR of type: program\n${infoLog}`);
      return false; // Or throw an error
    }
    return true;
  }
}


export class Shader extends BaseShader {
  constructor(gl, vertexString, fragmentString) {
    super(gl); // Call the base class constructor

    this.vertexString = vertexString;
    this.fragmentString = fragmentString;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexString);
    gl.compileShader(vertexShader);
    if (!this.checkCompileErrors(gl, vertexShader, 'VERTEX')) {
      console.error('ERROR::SHADER::VERTEX::COMPILATION_FAILED\n', gl.getShaderInfoLog(vertexShader));
      return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentString);
    gl.compileShader(fragmentShader);
    if (!this.checkCompileErrors(gl, fragmentShader, 'FRAGMENT')) {
      console.error('ERROR::SHADER::FRAGMENT::COMPILATION_FAILED\n', gl.getShaderInfoLog(fragmentShader));
      return;
    }

    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    if (!this.checkLinkErrors(gl, this.program, 'PROGRAM')) {
      console.error('ERROR::SHADER::PROGRAM::LINKING_FAILED\n', gl.getProgramInfoLog(this.program));
      return;
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    this.gl = gl;
  }
}


