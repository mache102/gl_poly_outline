#ifndef SETTINGS_H
#define SETTINGS_H

#include <string>
#include <vector>
#include <iostream>
#include <sstream>
#include <fstream>
#include <unordered_map>
#include <functional>

#include <glm/glm.hpp>

#include "file_reader/utils.h"
#include "rgba_color.h"

namespace settings {

  extern glm::vec2 winres;
  extern float aspect_ratio;

  extern bool vsync;
  extern std::string window_title;

  extern int seed;
  extern int max_fps;

  extern glm::vec2 randCoord();

  extern Color bgColor;
  extern Color outlineColor;

  extern float outlineSize;
  extern float transitionSmoothness;
  extern float blendFactor;
  
  extern std::vector<Color> polygonColors;

  extern uint32_t polygonCount;
  extern float minSize;
  extern float maxSize;
  extern std::vector<glm::vec2> vertices;

  extern uint32_t print_every;
  extern bool tick_updates;
  extern bool render_as_circles;

  glm::vec2 randCoord();

  int parse_config(std::string filename);
}

#endif