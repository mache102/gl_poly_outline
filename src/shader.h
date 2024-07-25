#ifndef SHADER_H
#define SHADER_H

#include <glad/glad.h>
#include <glm/glm.hpp>
#include <glm/gtc/type_ptr.hpp>

#include <string>
#include <fstream>
#include <sstream>
#include <iostream>
#include <vector>

class Shader {
public:
  unsigned int ID;
  std::string vertex_path;
  std::string fragment_path;
  std::string geometry_path;
  bool has_geometry_shader = false;

  Shader(std::string vertex_path, std::string fragment_path, std::string geometry_path = "") {
    this->vertex_path = vertex_path;
    this->fragment_path = fragment_path;
    this->geometry_path = geometry_path;
    if (geometry_path != "") {
      has_geometry_shader = true;
    }

    // load vertex shader
    std::string vShaderCode;
    std::fstream vertexFile(vertex_path, std::ios::in);
    if (vertexFile.is_open()) {
      std::stringstream buffer;
      buffer << vertexFile.rdbuf();
      vShaderCode = buffer.str();
    } else {
      std::cout << "COULD NOT OPEN VERTEX SHADER FILE" << std::endl;
    }

    unsigned int vertex = glCreateShader(GL_VERTEX_SHADER);
    const char *vertex_c_str = vShaderCode.c_str();
    glShaderSource(vertex, 1, &vertex_c_str, NULL);
    glCompileShader(vertex);
    checkCompileErrors(vertex, vertex_path, "VERTEX");

    // load fragment shader
    std::string fShaderCode;
    std::fstream fragmentFile(fragment_path, std::ios::in);
    if (fragmentFile.is_open()) {
      std::stringstream buffer;
      buffer << fragmentFile.rdbuf();
      fShaderCode = buffer.str();
    } else {
      std::cout << "COULD NOT OPEN FRAGMENT SHADER FILE" << std::endl;
    }

    unsigned int fragment = glCreateShader(GL_FRAGMENT_SHADER);
    const char *frag_c_str = fShaderCode.c_str();
    glShaderSource(fragment, 1, &frag_c_str, NULL);
    glCompileShader(fragment);
    checkCompileErrors(fragment, fragment_path, "FRAGMENT");

    // load geometry shader (if path is provided)
    unsigned int geometry;
    if (has_geometry_shader) {
      std::string gShaderCode;
      std::fstream geometryFile(geometry_path, std::ios::in);
      if (geometryFile.is_open()) {
        std::stringstream buffer;
        buffer << geometryFile.rdbuf();
        gShaderCode = buffer.str();
      } else {
        std::cout << "COULD NOT OPEN GEOMETRY SHADER FILE" << std::endl;
      }

      geometry = glCreateShader(GL_GEOMETRY_SHADER);
      const char *geometry_c_str = gShaderCode.c_str();
      glShaderSource(geometry, 1, &geometry_c_str, NULL);
      glCompileShader(geometry);
      checkCompileErrors(geometry, geometry_path, "GEOMETRY");
    }

    ID = glCreateProgram();
    glAttachShader(ID, vertex);
    glAttachShader(ID, fragment);
    if (has_geometry_shader) {
      glAttachShader(ID, geometry);
    }
    glLinkProgram(ID);
    checkCompileErrors(ID, "program", "PROGRAM");

    glDeleteShader(vertex);
    glDeleteShader(fragment);
    if (has_geometry_shader) {
      glDeleteShader(geometry);
    }

    printf("Shader '%s, %s, %s' compiled with ID %u \n", vertex_path.c_str(), fragment_path.c_str(), geometry_path.c_str(), ID);
  }

  void use() {
    glUseProgram(ID);
  }

  void linkTextureUnit(std::string name, uint32_t unit) {
    glUniform1i(glGetUniformLocation(ID, name.c_str()), unit);
  }

  GLuint getUniformLocation(std::string name) {
    return glGetUniformLocation(ID, name.c_str());
  }

  void setBool(const std::string &name, bool value) const {
    glUniform1i(glGetUniformLocation(ID, name.c_str()), (int)value);
  }

  void setInt(const std::string &name, int value) const {
    glUniform1i(glGetUniformLocation(ID, name.c_str()), value);
  }

  void setIntArray(const std::string &name, const std::vector<int> &values) const {
      glUniform1iv(glGetUniformLocation(ID, name.c_str()), values.size(), &values[0]);
  }

  void setFloat(const std::string &name, float value) const {
    glUniform1f(glGetUniformLocation(ID, name.c_str()), value);
  }

  void setFloatArray(const std::string &name, const std::vector<float> &values) const {
      glUniform1fv(glGetUniformLocation(ID, name.c_str()), values.size(), &values[0]);
  }

  void setVec2(const std::string &name, const glm::vec2 &value) const {
    glUniform2fv(glGetUniformLocation(ID, name.c_str()), 1, &value[0]);
  }

  void setVec2(const std::string &name, float x, float y) const {
    glUniform2f(glGetUniformLocation(ID, name.c_str()), x, y);
  }

  void setVec3(const std::string &name, const glm::vec3 &value) const {
    glUniform3fv(glGetUniformLocation(ID, name.c_str()), 1, &value[0]);
  }

  void setVec3(const std::string &name, float x, float y, float z) const {
    glUniform3f(glGetUniformLocation(ID, name.c_str()), x, y, z);
  }

  void setVec3Array(const std::string &name, const std::vector<glm::vec3> &values) const {
    glUniform3fv(glGetUniformLocation(ID, name.c_str()), values.size(), glm::value_ptr(values[0]));
  }
 
  void setVec4(const std::string &name, const glm::vec4 &value) const { 
    glUniform4fv(glGetUniformLocation(ID, name.c_str()), 1, &value[0]); 
  }

  void setVec4(const std::string &name, float x, float y, float z, float w)  {
    glUniform4f(glGetUniformLocation(ID, name.c_str()), x, y, z, w);
  }

  void setMat2(const std::string &name, const glm::mat2 &mat) const {
    glUniformMatrix2fv(glGetUniformLocation(ID, name.c_str()), 1, GL_FALSE, &mat[0][0]);
  }

  void setMat3(const std::string &name, const glm::mat3 &mat) const {
    glUniformMatrix3fv(glGetUniformLocation(ID, name.c_str()), 1, GL_FALSE, &mat[0][0]);
  }

  void setMat4(const std::string &name, const glm::mat4 &mat) const {
    glUniformMatrix4fv(glGetUniformLocation(ID, name.c_str()), 1, GL_FALSE, &mat[0][0]);
  }

private:
  void checkCompileErrors(GLuint shader, std::string name, std::string type) {
    GLint success;
    GLchar infoLog[1024];
    if (type != "PROGRAM") {
      glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
      if (!success) {
        glGetShaderInfoLog(shader, 1024, NULL, infoLog);
        std::cout << "ERROR::SHADER_COMPILATION_ERROR in: " << type << " in shader '" << name << "'\n" << infoLog << "\n -- --------------------------------------------------- -- " << std::endl;
        exit(1);
      }
    } else {
      glGetProgramiv(shader, GL_LINK_STATUS, &success);
      if(!success) {
        glGetProgramInfoLog(shader, 1024, NULL, infoLog);
        std::cout << "ERROR::PROGRAM_LINKING_ERROR of type: " << type << " in shader '" << name << "'\n" << infoLog << "\n -- --------------------------------------------------- -- " << std::endl;
        exit(1);
      }
    }
  }
};

#endif