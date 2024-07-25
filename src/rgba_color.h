#ifndef RGBA_COLOR_H
#define RGBA_COLOR_H

#include <iostream>
#include <sstream>
#include <string>
#include <map>

#include <glm/glm.hpp>

struct Color {
  uint8_t r = 0;
  uint8_t g = 0;
  uint8_t b = 0;
  uint8_t a = 255;

  Color();
  Color(int r, int g, int b, int a = 255);
  Color(float r, float g, float b, float a = 1.0f);
  Color(glm::vec4 color);
  Color(glm::vec3 color);
  Color(unsigned int rgba);
  Color(std::string str);

  glm::vec3 rgb(bool normalize = false);
  glm::vec4 rgba(bool normalize = false);

  void print();

  Color operator+(const Color &c);
  Color &operator+=(const Color &c);
  Color operator-(const Color &c);
  Color &operator-=(const Color &c);

  Color lerp(const Color& other, float blendFactor);

  std::string get_str();
  uint32_t pack_uint();

  static std::map<std::string, Color> cmap;
  static Color get_color(std::string name);
  static uint32_t uint(std::string name);

  static glm::uvec4 uvec4_palette(std::string a, std::string b, std::string c, std::string d);
};

#endif