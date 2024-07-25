#include <iostream>
#include <vector>

#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>

#include "shader.h"
#include "rgba_color.h"
#include "timer.h"
#include "settings.h"

constexpr int OPENGL_VERSION_MAJOR = 3;
constexpr int OPENGL_VERSION_MINOR = 3;

using namespace settings;

GLFWwindow* init_glfw();
bool init_opengl();
void framebuffer_size_callback(GLFWwindow* window, int width, int height);
void error_callback(int error, const char* description);

#if OPENGL_VERSION_MAJOR >= 4
void GLAPIENTRY message_callback(
  GLenum source,
  GLenum type,
  GLuint id,
  GLenum severity,
  GLsizei length,
  const GLchar* message,
  const void* userParam
) {
  std::string SEVERITY = "";
  switch (severity) {
  case GL_DEBUG_SEVERITY_LOW:
    SEVERITY = "LOW";
    break;
  case GL_DEBUG_SEVERITY_MEDIUM:
    SEVERITY = "MEDIUM";
    break;
  case GL_DEBUG_SEVERITY_HIGH:
    SEVERITY = "HIGH";
    break;
  case GL_DEBUG_SEVERITY_NOTIFICATION:
    SEVERITY = "NOTIFICATION";
    break;
  }
  fprintf(stderr, "GL CALLBACK: %s type = 0x%x, severity = %s, message = %s\n",
    type == GL_DEBUG_TYPE_ERROR ? "** GL ERROR **" : "",
    type, SEVERITY.c_str(), message);
}
#endif

Shader* p_shader = nullptr; 
Shader* ov_shader = nullptr;

Color outlineColor = Color(255, 0, 0, 255);
float outlineSize = 2.0;

uint32_t polygonCount = 10000;
float size = 15;

int64_t tick = 0;
uint32_t print_every = 200;

std::vector<glm::vec2> p_coords;
std::vector<uint8_t> p_attrs;
std::vector<Color> p_colors;
std::vector<uint32_t> p_indices;

std::vector<glm::vec2> ov_positions = {
  glm::vec2(-1, -1),
  glm::vec2(-1, 1),
  glm::vec2(1, 1),
  glm::vec2(-1, -1),
  glm::vec2(1, 1),
  glm::vec2(1, -1)
};

std::vector<glm::vec2> ov_offsets = {};

GLuint pVao, pCoordBuffer, pAttrBuffer, pColorBuffer, pIndexBuffer;
GLuint ovVao, ovPositionBuffer, ovOffsetBuffer;

struct OutlineQuad {

  OutlineQuad() {
    v = glm::vec2(0);
    nv = glm::vec2(0);
    normal = glm::vec2(0);
  }
  OutlineQuad(glm::vec2 v, glm::vec2 nv, glm::vec2 normal) {
    this->v = v;
    this->nv = nv;
    this->normal = normal;
  }

  void apply(std::vector<glm::vec2>& vertices, float size, float outlineSize, glm::vec2 offset) {
    std::vector<glm::vec2> vertices_ = {
      v * size + offset - normal * outlineSize,
      nv * size + offset - normal * outlineSize,
      nv * size + offset + normal * outlineSize,
      v * size + offset + normal * outlineSize
    };
    for (glm::vec2& vertex : vertices_) {
      vertices.push_back(vertex);
    }

    // std::cout << "4 coords: { (" << vertices_[0].x << ", " << vertices_[0].y << "), (" << vertices_[1].x << ", " << vertices_[1].y << "), (" << vertices_[2].x << ", " << vertices_[2].y << "), (" << vertices_[3].x << ", " << vertices_[3].y << ") }\n";
  }

  glm::vec2 v, nv, normal;
};


void pushIndices(std::vector<uint32_t> newIndices, uint32_t offset) {
  for (uint32_t i = 0; i < newIndices.size(); i++) {
    p_indices.push_back(newIndices[i] + offset);
  }
}

void addPolygonVertex(glm::vec2 pos, Color color) {
  p_coords.push_back(pos);
  p_attrs.push_back(0x00);
  p_colors.push_back(color);
}

void addOutlineVertices(glm::vec2 offset, float size) {
  /*
  1. store the offset in coord

  2. store the position as bits in attr (bits 1,2)
  0b00000001
  0b00000011
  0b00000101
  0b00000111

  // 3. store the size in color
  */
  std::vector<uint8_t> positions = {
    0b00000001,
    0b00000101,
    0b00000111,
    0b00000011
  };
  // Color sizeAsColor = Color(static_cast<uint32_t>(size));

  pushIndices({0, 1, 2, 0, 2, 3}, p_coords.size());

  for (int i = 0; i < 4; i++) {
    p_coords.push_back(offset);
    p_attrs.push_back(positions[i]);
    // p_colors.push_back(sizeAsColor);
    p_colors.push_back(outlineColor);
  }
}

void addPolygon(std::vector<glm::vec2> vertices, glm::vec2 offset, float size, Color color) {
  uint32_t vertexCount = vertices.size();

  // be sure to include the indices!
  // btw screw concave polygons, you can't just add indices straightforward
  // convex - your indices will be 0,1,2, 0,2,3, ..., 0,n-2,n-1
  uint32_t currentPositionsLength = p_coords.size();
  for (uint32_t i = 0; i < vertexCount - 2; i++) {
    pushIndices({0, i + 1, i + 2}, currentPositionsLength);
  }

  // uint32_t ovOffsetsSize = ov_offsets.size();
  std::vector<OutlineQuad> outlineVertices;
  std::vector<glm::vec2> transformedPos;
  for (uint32_t i = 0; i < vertexCount; i++) {
    std::cout << "i and i+1: " << i << " " << (i + 1) % vertexCount << std::endl;
    glm::vec2& v = vertices[i];
    glm::vec2& nv = vertices[(i + 1) % vertexCount];
    glm::vec2 pos_ = v * size + offset;

    // even w/ size and offset applied, the gradient between the vertices will be the same
    glm::vec2 grad = glm::normalize(nv - v);
    glm::vec2 normal = glm::vec2(-grad.y, grad.x);
    outlineVertices.push_back(OutlineQuad(v, nv, normal));

    // ov_offsets.push_back(pos_);
    addPolygonVertex(pos_, color);
    transformedPos.push_back(pos_);

  }

  // outline quads
  for (OutlineQuad& quad : outlineVertices) {
    pushIndices({0, 1, 2, 0, 2, 3}, p_coords.size());
    quad.apply(p_coords, size, outlineSize, offset);
    for (int i = 0; i < 4; i++) {
      p_attrs.push_back(0x00); 
      p_colors.push_back(outlineColor);
    }
      

  }

  // outline vertices 
  for (glm::vec2& pos : transformedPos) {
    addOutlineVertices(pos, size);
  }
}

void clearBuffers() {
  p_coords = {};
  p_attrs = {};
  p_colors = {};
  p_indices = {};

  // ov_offsets = {};
}

void glbdAll() {

  glBindVertexArray(pVao);
  glBindBuffer(GL_ARRAY_BUFFER, pCoordBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_coords.size() * sizeof(glm::vec2), p_coords.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ARRAY_BUFFER, pAttrBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_attrs.size() * sizeof(uint8_t), p_attrs.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ARRAY_BUFFER, pColorBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_colors.size() * sizeof(Color), p_colors.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, pIndexBuffer);
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, p_indices.size() * sizeof(uint32_t), p_indices.data(), GL_STATIC_DRAW);

  // glBindVertexArray(ovVao);
  // glBindBuffer(GL_ARRAY_BUFFER, ovPositionBuffer);
  // glBufferData(GL_ARRAY_BUFFER, ov_positions.size() * sizeof(glm::vec2), ov_positions.data(), GL_STATIC_DRAW);

  // glBindBuffer(GL_ARRAY_BUFFER, ovOffsetBuffer);
  // glBufferData(GL_ARRAY_BUFFER, ov_offsets.size() * sizeof(glm::vec2), ov_offsets.data(), GL_STATIC_DRAW);
}

int main(int argc, char** argv) {

  // fixed seed
  srand(0);
  GLFWwindow* window = init_glfw();
  if (window == nullptr) {
    return -1;
  }
  if (!init_opengl()) {
    return -1;
  }

  p_shader = new Shader("./src/shaders/polygonShader.vert", "./src/shaders/polygonShader.frag");
  p_shader->use();
  p_shader->setVec2("u_winres", winres);  
  p_shader->setVec4("u_outline_color", outlineColor.rgba(true));
  p_shader->setFloat("u_outline_size", outlineSize);


  // ov_shader = new Shader("./src/shaders/outlineVertexShader.vert", "./src/shaders/outlineVertexShader.frag");
  // ov_shader->use();
  // ov_shader->setVec2("u_winres", winres);
  // ov_shader->setVec4("u_color", outlineColor.rgba(true));
  // ov_shader->setFloat("u_outline_size", outlineSize);


  glGenVertexArrays(1, &pVao);
  glGenBuffers(1, &pCoordBuffer);
  glGenBuffers(1, &pAttrBuffer);
  glGenBuffers(1, &pColorBuffer);
  glGenBuffers(1, &pIndexBuffer);

  // glGenVertexArrays(1, &ovVao);
  // glGenBuffers(1, &ovPositionBuffer);
  // glGenBuffers(1, &ovOffsetBuffer);

  glBindVertexArray(pVao);
  glBindBuffer(GL_ARRAY_BUFFER, pCoordBuffer);
  glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, sizeof(glm::vec2), (void*)0);
  glEnableVertexAttribArray(0);

  glBindBuffer(GL_ARRAY_BUFFER, pAttrBuffer);
  glVertexAttribIPointer(1, 1, GL_UNSIGNED_BYTE, sizeof(uint8_t), (void*)0);
  glEnableVertexAttribArray(1);

  glBindBuffer(GL_ARRAY_BUFFER, pColorBuffer);
  glVertexAttribPointer(2, 4, GL_UNSIGNED_BYTE, GL_TRUE, sizeof(Color), (void*)0);
  glEnableVertexAttribArray(2);

  // glBindVertexArray(ovVao);
  // glBindBuffer(GL_ARRAY_BUFFER, ovPositionBuffer);
  // glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, sizeof(glm::vec2), (void*)0);
  // glEnableVertexAttribArray(0);

  // glBindBuffer(GL_ARRAY_BUFFER, ovOffsetBuffer);
  // glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, sizeof(glm::vec2), (void*)0);
  // glEnableVertexAttribArray(1);

  // glVertexAttribDivisor(1, 1);
  
  for (int i = 0; i < polygonCount; i++) {
    glm::vec2 o = glm::vec2(
      std::fmod((float)rand(), winres.x),
      std::fmod((float)rand(), winres.y)
    ) - glm::vec2(winres.x * 0.5, winres.y * 0.5);

    addPolygon(
      {
        glm::vec2(-1, -1),
        glm::vec2(-1, 1.5),
        glm::vec2(1.1, 1),
        glm::vec2(1.5, -1.1),
        glm::vec2(3.0, -3.0),
      },
      o,
      size,
      Color(0, 200, 0, 255)
    );
  }


  glbdAll();
  
  Timer render_timer = Timer("render", false);

  double curr_time, last_time, delta_time;
  last_time = glfwGetTime();
  while (!glfwWindowShouldClose(window)) {
    curr_time = glfwGetTime();
    delta_time = curr_time - last_time;
    last_time = curr_time;

    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
      glfwSetWindowShouldClose(window, true);
    }
    glClearColor(0.8f, 0.8f, 0.8f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    p_shader->use();
    glBindVertexArray(pVao);
    glDrawElements(GL_TRIANGLES, p_indices.size(), GL_UNSIGNED_INT, 0);

    // ov_shader->use();
    // glBindVertexArray(ovVao);
    // glDrawArraysInstanced(GL_TRIANGLES, 0, ov_positions.size(), ov_offsets.size());


    render_timer.start();
    glfwSwapBuffers(window);
    render_timer.end(true, true);
    glfwPollEvents();

    tick++;

    if (tick % print_every == 0) {
      render_timer.print_report();
      render_timer.reset_durations();
    }
  }

  glfwTerminate();

  return 0;
}

GLFWwindow* init_glfw() {
  std::cout << "Initializing GLFW\n";
  if(!glfwInit()) {
    std::cout << "Failed to initialize GLFW\n";
    return nullptr;
  }

  glfwSetErrorCallback(error_callback);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, OPENGL_VERSION_MAJOR);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, OPENGL_VERSION_MINOR);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfwWindowHint(GLFW_SAMPLES, 4);
  glfwWindowHint(GLFW_DEPTH_BITS, 24);

  std::cout << "Creating window\n";
  GLFWwindow* window = glfwCreateWindow(winres.x, winres.y, window_title.c_str(), NULL, NULL);

  if (!window) {
    std::cout << "Failed to create GLFW window\n";
    glfwDestroyWindow(window);
    glfwTerminate();
    return nullptr;
  }
  glfwMakeContextCurrent(window);
  
  glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);

  return window;
}

bool init_opengl() {
  std::cout << "Initializing GLAD\n";
  if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
    std::cout << "Failed to initialize GLAD" << std::endl;
    return false;
  }
  std::cout << "OpenGL Version " << GLVersion.major << "." << GLVersion.minor << " loaded\n";

  #if OPENGL_VERSION_MAJOR >= 4
    glEnable(GL_DEBUG_OUTPUT);
    glDebugMessageControl(GL_DONT_CARE, GL_DONT_CARE, GL_DEBUG_SEVERITY_NOTIFICATION, 0, nullptr, GL_FALSE);
    glDebugMessageCallback(message_callback, 0);
  #endif

  // glEnable(GL_DEPTH_TEST);

  glEnable(GL_BLEND);

  glEnable(GL_MULTISAMPLE);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

  // no vsync
  glfwSwapInterval(0);

  return true;
}

void framebuffer_size_callback(GLFWwindow* window, int width, int height){
  glViewport(0, 0, width, height);

  winres.x = width;
  winres.y = height;
  aspect_ratio = (float)width / (float)height;

  p_shader->use();
  p_shader->setVec2("u_winres", winres);

  // ov_shader->use();
  // ov_shader->setVec2("u_winres", winres);
}


void error_callback(int error, const char* description) {
    std::cerr << "GLFW error " << error << ": " << description << "\n";
}