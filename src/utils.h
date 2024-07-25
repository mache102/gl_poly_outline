#ifndef UTILS_H
#define UTILS_H

#include <iostream>
#include <vector>

#include <glm/glm.hpp>

extern const uint8_t POLYGON_BODY;
extern const uint8_t OUTLINE_CORNER;
extern const uint8_t OUTLINE_QUAD;

extern const std::vector<uint8_t> cornerCoordAttrs;
extern const std::vector<glm::vec2> cornerCoords;

struct InstanceIndex {
  InstanceIndex();
  InstanceIndex(uint32_t start, uint32_t count);
  uint32_t start;
  uint32_t count;
};

struct OutlineQuad {
  OutlineQuad();
  OutlineQuad(glm::vec2 v, glm::vec2 nv, float direction);

  // apply() only appends to vertices and outline_directions; it is recommended to append other attributes elsewhere
  void apply(std::vector<glm::vec2>& vertices, std::vector<float>& outline_directions);
  glm::vec2 v, nv;
  float direction;

};

#endif