#include <iostream>
#include <vector>
#include <chrono>
#include <thread>

#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>

#include "shader.h"
#include "rgba_color.h"
#include "timer.h"
#include "settings.h"
#include "utils.h"

constexpr int OPENGL_VERSION_MAJOR = 3;
constexpr int OPENGL_VERSION_MINOR = 3;

using namespace settings;

GLFWwindow* init_glfw();
bool init_opengl();
void framebuffer_size_callback(GLFWwindow* window, int width, int height);
void error_callback(int error, const char* description);

Shader* p_shader = nullptr; 

int64_t tick = 0;

std::vector<glm::vec2> p_coords, p_offsets;
std::vector<float> p_rotations, p_sizes, p_outline_directions;
std::vector<uint8_t> p_attrs;
std::vector<Color> p_colors;
std::vector<uint32_t> p_indices;


std::vector<InstanceIndex> instance_indices;


GLuint pVao, pCoordBuffer, pRotationBuffer, pSizeBuffer, pOffsetBuffer, pOutlineDirectionBuffer,
pAttrBuffer, pColorBuffer, pIndexBuffer;



void pushIndices(std::vector<uint32_t> newIndices, uint32_t offset) {
  for (uint32_t i = 0; i < newIndices.size(); i++) {
    p_indices.push_back(newIndices[i] + offset);
  }
}

void addPolygon(std::vector<glm::vec2> vertices, float rotation, float size, glm::vec2 offset, Color color) {
  uint32_t vertexCount = vertices.size();

  // in order: polygon itself, outline vertices, outline quads

  // 1. polygon itself
  uint32_t idx = p_coords.size();
  for (uint32_t i = 0; i < vertexCount - 2; i++) {
    pushIndices({0, i + 1, i + 2}, idx);
  }

  std::vector<OutlineQuad> outlineQuads;
  for (uint32_t i = 0; i < vertexCount; i++) {
    glm::vec2& v = vertices[i];
    glm::vec2& nv = vertices[(i + 1) % vertexCount];

    float outline_direction = glm::atan(nv.y - v.y, nv.x - v.x) + M_PI / 2; 
    outlineQuads.push_back(OutlineQuad(v, nv, outline_direction));

    p_coords.push_back(v);
    p_rotations.push_back(rotation);
    p_sizes.push_back(size);
    p_offsets.push_back(offset);

    p_outline_directions.push_back(0.);
    p_attrs.push_back(POLYGON_BODY);
    p_colors.push_back(color);
  }

  // 2. outline corners
  for (uint32_t i = 0; i < vertexCount; i++) {
    pushIndices({0, 1, 2, 0, 2, 3}, p_coords.size());

    glm::vec2& v = vertices[i];
    for (int j = 0; j < 4; j++) {
      p_coords.push_back(v);
      p_rotations.push_back(rotation);
      p_sizes.push_back(size);
      p_offsets.push_back(offset);

      p_outline_directions.push_back(0.);
      p_attrs.push_back(cornerCoordAttrs[j] | OUTLINE_CORNER);
      p_colors.push_back(outlineColor);
    }
  }

  // 3. outline quads
  for (OutlineQuad& quad : outlineQuads) {
    pushIndices({0, 1, 2, 0, 2, 3}, p_coords.size());
    quad.apply(p_coords, p_outline_directions);

    for (int i = 0; i < 4; i++) {
      p_rotations.push_back(rotation);
      p_sizes.push_back(size);
      p_offsets.push_back(offset);

      p_attrs.push_back(OUTLINE_QUAD); 
      p_colors.push_back(outlineColor);
    }
  }
}

void clearBuffers() {
  p_coords = {};
  p_rotations = {};
  p_sizes = {};
  p_offsets = {};

  p_outline_directions = {};
  p_attrs = {};
  p_colors = {};

  p_indices = {};
}

void printSizes() {
  std::cout << "buffer sizes (coord, rotation, size, offset, outline_direction, attr, color, index): " 
    << p_coords.size() << ", " 
    << p_rotations.size() << ", " 
    << p_sizes.size() << ", " 
    << p_offsets.size() << ", " 

    << p_outline_directions.size() << ", " 
    << p_attrs.size() << ", " 
    << p_colors.size() << ", " 

    << p_indices.size() 
    << std::endl;
}

void init() {
  glGenVertexArrays(1, &pVao);

  glGenBuffers(1, &pCoordBuffer);
  glGenBuffers(1, &pRotationBuffer);
  glGenBuffers(1, &pSizeBuffer);
  glGenBuffers(1, &pOffsetBuffer);

  glGenBuffers(1, &pOutlineDirectionBuffer);
  glGenBuffers(1, &pAttrBuffer);
  glGenBuffers(1, &pColorBuffer);

  glGenBuffers(1, &pIndexBuffer);

  glBindVertexArray(pVao);
  glBindBuffer(GL_ARRAY_BUFFER, pCoordBuffer);
  glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, sizeof(glm::vec2), (void*)0);
  glEnableVertexAttribArray(0);

  glBindBuffer(GL_ARRAY_BUFFER, pRotationBuffer);
  glVertexAttribPointer(1, 1, GL_FLOAT, GL_FALSE, sizeof(float), (void*)0);
  glEnableVertexAttribArray(1);

  glBindBuffer(GL_ARRAY_BUFFER, pSizeBuffer);
  glVertexAttribPointer(2, 1, GL_FLOAT, GL_FALSE, sizeof(float), (void*)0);
  glEnableVertexAttribArray(2);

  glBindBuffer(GL_ARRAY_BUFFER, pOffsetBuffer);
  glVertexAttribPointer(3, 2, GL_FLOAT, GL_FALSE, sizeof(glm::vec2), (void*)0);
  glEnableVertexAttribArray(3);

  glBindBuffer(GL_ARRAY_BUFFER, pOutlineDirectionBuffer);
  glVertexAttribPointer(4, 1, GL_FLOAT, GL_FALSE, sizeof(float), (void*)0);
  glEnableVertexAttribArray(4);

  glBindBuffer(GL_ARRAY_BUFFER, pAttrBuffer);
  glVertexAttribIPointer(5, 1, GL_UNSIGNED_BYTE, sizeof(uint8_t), (void*)0);
  glEnableVertexAttribArray(5);

  glBindBuffer(GL_ARRAY_BUFFER, pColorBuffer);
  glVertexAttribPointer(6, 4, GL_UNSIGNED_BYTE, GL_TRUE, sizeof(Color), (void*)0);
  glEnableVertexAttribArray(6);
  
}

void glbdAll() {
  glBindVertexArray(pVao);
  glBindBuffer(GL_ARRAY_BUFFER, pCoordBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_coords.size() * sizeof(glm::vec2), p_coords.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ARRAY_BUFFER, pRotationBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_rotations.size() * sizeof(float), p_rotations.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ARRAY_BUFFER, pSizeBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_sizes.size() * sizeof(float), p_sizes.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ARRAY_BUFFER, pOffsetBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_offsets.size() * sizeof(glm::vec2), p_offsets.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ARRAY_BUFFER, pOutlineDirectionBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_outline_directions.size() * sizeof(float), p_outline_directions.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ARRAY_BUFFER, pAttrBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_attrs.size() * sizeof(uint8_t), p_attrs.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ARRAY_BUFFER, pColorBuffer);
  glBufferData(GL_ARRAY_BUFFER, p_colors.size() * sizeof(Color), p_colors.data(), GL_STATIC_DRAW);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, pIndexBuffer);
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, p_indices.size() * sizeof(uint32_t), p_indices.data(), GL_STATIC_DRAW);
}


int main(int argc, char** argv) {

  // fixed seed
  srand(seed);
  GLFWwindow* window = init_glfw();
  if (window == nullptr) {
    return -1;
  }
  if (!init_opengl()) {
    return -1;
  }

  parse_config("./config.txt");

  p_shader = new Shader("./src/shaders/polygonShader.vert", "./src/shaders/polygonShader.frag");
  p_shader->use();
  p_shader->setVec2("u_winres", winres);  
  p_shader->setVec4("u_outline_color", outlineColor.rgba(true));
  p_shader->setFloat("u_outline_size", outlineSize);
  p_shader->setFloat("u_transition_smoothness", transitionSmoothness);

  init();

  instance_indices.resize(polygonCount);
  for (uint32_t i = 0; i < polygonCount; i++) {
    glm::vec2 o = randCoord();
    instance_indices[i].start = p_coords.size();
    addPolygon(
      vertices,
      (i * 2 * M_PI) / 360.0,
      minSize + (maxSize - minSize) * (rand() / (float)RAND_MAX),
      o,    
      polygonColors[i % polygonColors.size()]
    );
    instance_indices[i].count = p_coords.size() - instance_indices[i].start;
  }

  printSizes();

  glbdAll();
  
  Timer render_timer = Timer("render", false);

  double curr_time, last_time, delta_time;
  delta_time = 0.; // get rid of an unused var warning

  last_time = glfwGetTime();
  while (!glfwWindowShouldClose(window)) {
    curr_time = glfwGetTime();
    delta_time = curr_time - last_time;
    last_time = curr_time;

    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
      glfwSetWindowShouldClose(window, true);
    }
    glClearColor(bgColor.r, bgColor.g, bgColor.b, bgColor.a);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    // test rotate
    for (uint32_t i = 0; i < instance_indices.size(); i++) {
      for (uint32_t j = 0; j < instance_indices[i].count; j++) {
        p_rotations[instance_indices[i].start + j] += 0.01;
      }
    }

    glBindVertexArray(pVao);
    glBindBuffer(GL_ARRAY_BUFFER, pRotationBuffer);
    glBufferData(GL_ARRAY_BUFFER, p_rotations.size() * sizeof(float), p_rotations.data(), GL_STATIC_DRAW);
    // glBufferSubData(GL_ARRAY_BUFFER, a * sizeof(float), (a+n) * sizeof(float), &p_rotations[a], GL_STATIC_DRAW);

    p_shader->use();
    glBindVertexArray(pVao);
    glDrawElements(GL_TRIANGLES, p_indices.size(), GL_UNSIGNED_INT, 0);

    render_timer.start();
    glfwSwapBuffers(window);
    render_timer.end(true, false);
    glfwPollEvents();

    tick++;

    if (tick % print_every == 0) {
      std::cout << "tick = " << tick << std::endl;
      render_timer.print_report();
      render_timer.reset_durations();
    }

    if (max_fps > 0) {
      float desired_frame_time = 1.0 / max_fps;
      if (delta_time < desired_frame_time)
      {
        float delay_time = desired_frame_time - delta_time;
        std::chrono::milliseconds delay_ms((int)(delay_time * 1000));
        std::this_thread::sleep_for(delay_ms);
      }
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
}


void error_callback(int error, const char* description) {
    std::cerr << "GLFW error " << error << ": " << description << "\n";
}