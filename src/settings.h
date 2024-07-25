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

  extern std::string window_title;

  extern int seed;

  extern glm::vec2 randCoord();

  extern Color bgColor;
  extern Color outlineColor;

  extern float outlineSize;
  extern float transitionSmoothness;
  extern std::vector<Color> polygonColors;

  extern uint32_t polygonCount;
  extern float minSize;
  extern float maxSize;

  extern uint32_t print_every;

  glm::vec2 randCoord();

  int parse_config(std::string filename);
}

#endif