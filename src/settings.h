#ifndef SETTINGS_H
#define SETTINGS_H

#include <string>

#include <glm/glm.hpp>

namespace settings {
  glm::vec2 winres(1280, 720); // window dimensions (width, height)
  float aspect_ratio = winres.x / winres.y;

  std::string window_title = "circles_sim";

  int seed = 0;
}

#endif