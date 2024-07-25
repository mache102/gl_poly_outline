#include "rgba_color.h"

std::map<std::string, Color> Color::cmap = {};

Color::Color() {}
Color::Color(int r, int g, int b, int a) : r(r), g(g), b(b), a(a) {}
Color::Color(float r, float g, float b, float a) : r((int)(r * 255)), g((int)(g * 255)), b((int)(b * 255)), a((int)(a * 255)) {}
Color::Color(glm::vec4 color) : r(color.x), g(color.y), b(color.z), a(color.w) {}
Color::Color(glm::vec3 color) : r(color.x), g(color.y), b(color.z), a(255) {}
Color::Color(unsigned int rgba) : r((rgba >> 24) & 0xFF), g((rgba >> 16) & 0xFF), b((rgba >> 8) & 0xFF), a(rgba & 0xFF) {}
Color::Color(std::string str) {
  if (str[0] == '#') {
    // #RRGGBBAA
    str = str.substr(1);
    if (str.size() != 8) {
      throw std::invalid_argument("Hex color must be 8 characters long (RRGGBBAA)");
    }
    unsigned int r_, g_, b_, a_;
    sscanf(str.c_str(), "%02x%02x%02x%02x", &r_, &g_, &b_, &a_);
    r = r_;
    g = g_;
    b = b_;
    a = a_;
  } else if (str[0] >= '0' && str[0] <= '9') {
    // R G B A
    std::istringstream color_iss(str);
    color_iss >> r >> g >> b >> a;
  } else {
    // color name
    Color color = get_color(str);
    r = color.r;
    g = color.g;
    b = color.b;
    a = color.a;
  }
}

Color Color::operator+(const Color &c) {
  return Color(r + c.r, g + c.g, b + c.b, a + c.a);
}

Color &Color::operator+=(const Color &c) {
  r += c.r;
  g += c.g;
  b += c.b;
  a += c.a;
  return *this;
}

Color Color::operator-(const Color &c) {
  return Color(r - c.r, g - c.g, b - c.b, a - c.a);
}

Color &Color::operator-=(const Color &c) {
  r -= c.r;
  g -= c.g;
  b -= c.b;
  a -= c.a;
  return *this;
}

Color Color::lerp(const Color& other, float blendFactor) {
  printf("rgba: %d, %d, %d, %d", (int)((float)r * (1 - blendFactor) + (float)other.r * blendFactor) % 256, (int)((float)g * (1 - blendFactor) + (float)other.g * blendFactor) % 256, (int)((float)b * (1 - blendFactor) + (float)other.b * blendFactor) % 256, (int)((float)a * (1 - blendFactor) + (float)other.a * blendFactor) % 256);
  return Color(
    (int)((float)r * (1 - blendFactor) + (float)other.r * blendFactor) % 256,
    (int)((float)g * (1 - blendFactor) + (float)other.g * blendFactor) % 256,
    (int)((float)b * (1 - blendFactor) + (float)other.b * blendFactor) % 256,
    (int)((float)a * (1 - blendFactor) + (float)other.a * blendFactor) % 256
  );
}

glm::vec3 Color::rgb(bool normalize) {
  if (normalize) {
    return glm::vec3(r, g, b) / 255.0f;
  }
  return glm::vec3(r, g, b);
}
glm::vec4 Color::rgba(bool normalize) {
  if (normalize) {
    return glm::vec4(r, g, b, a) / 255.0f;
  }
  return glm::vec4(r, g, b, a);
}

void Color::print() {
  printf("rgba: (%d, %d, %d, %d)\n", r, g, b, a);
}

Color Color::get_color(std::string name) {
  if (cmap.find(name) == cmap.end()) {
    std::ostringstream oss;
    oss << "Error: Color name \"" << name << "\" not found in cmap, returning 0x00000000 instead\n";
    return Color(0, 0, 0, 0);
  }
  return cmap[name];
}

// return string in format (r, g, b, a)
std::string Color::get_str() {
  std::ostringstream oss;
  oss << "(" << (int)r << ", " << (int)g << ", " << (int)b << ", " << (int)a << ")";
  return oss.str();
}

uint32_t Color::pack_uint() {
  return (r << 24) | (g << 16) | (b << 8) | a;
}

uint32_t Color::uint(std::string name) {
  if (name == "") {
    return 0;
  }
  return get_color(name).pack_uint();
}

glm::uvec4 Color::uvec4_palette(std::string a, std::string b, std::string c, std::string d) {
  return glm::uvec4(
    uint(a),
    uint(b),
    uint(c),
    uint(d)
  );
}