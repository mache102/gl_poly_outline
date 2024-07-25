#include "utils.h"

const uint8_t POLYGON_BODY = 0b00000000;
const uint8_t OUTLINE_CORNER = 0b00000001;
const uint8_t OUTLINE_QUAD = 0b00000010;

const std::vector<uint8_t> cornerCoordAttrs = {
  0b00000000,
  0b00001000,
  0b00001100,
  0b00000100
};
const std::vector<glm::vec2> cornerCoords = {
  glm::vec2(-1, -1),
  glm::vec2(-1, 1),
  glm::vec2(1, 1),
  glm::vec2(1, -1)
};


InstanceIndex::InstanceIndex() {}
InstanceIndex::InstanceIndex(uint32_t start, uint32_t count) {
  this->start = start;
  this->count = count;
}

OutlineQuad::OutlineQuad() {
  v = glm::vec2(0);
  nv = glm::vec2(0);
  direction = 0.f;
}
OutlineQuad::OutlineQuad(glm::vec2 v, glm::vec2 nv, float direction) {
  this->v = v;
  this->nv = nv;
  this->direction = direction;
}

// apply() only appends to vertices and outline_directions; it is recommended to append other attributes elsewhere
void OutlineQuad::apply(std::vector<glm::vec2>& vertices, std::vector<float>& outline_directions) {
  /*
  bottom left -> top left -> top right -> bottom right

  - | +   <--- nv
    |
  - | +   <--- v
    
  */
  vertices.push_back(v);
  vertices.push_back(nv);
  vertices.push_back(nv);
  vertices.push_back(v);

  for (int i = 0; i < 2; i++) {
    outline_directions.push_back(direction + M_PI);
  }
  for (int i = 0; i < 2; i++) {
    outline_directions.push_back(direction);
  }
}