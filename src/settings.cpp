#include "settings.h"

namespace settings {
  glm::vec2 winres(1920,1080); 
  float aspect_ratio = winres.x / winres.y;

  std::string window_title = "gl_poly_outline";

  int seed = 0;
  int max_fps = 60;

  Color bgColor = Color("#dbdbdb");
  Color outlineColor = Color("#484848");
  float outlineSize = 2.5;
  float transitionSmoothness = 0.5; // smoothstep at outline
  std::vector<Color> polygonColors = {
    Color("#3ca4cb"),
    Color("#8abc3f"),
    Color("#e03e41"),
    Color("#cc669c")
  };

  uint32_t polygonCount = 100;
  float minSize = 2;
  float maxSize = 50;

  std::vector<glm::vec2> vertices = 
      {
        glm::vec2(-1, -1),
        glm::vec2(-1, 1.5),
        glm::vec2(1.1, 1),
        glm::vec2(1.5, -1.1),
        glm::vec2(3.0, -3.0),
      };


  int64_t tick = 0;
  uint32_t print_every = 200;
  uint8_t tick_updates = 1;

  glm::vec2 randCoord() {
    // -winres/2 to winres/2
    return glm::vec2(
      (float)rand() / RAND_MAX * winres.x - winres.x / 2,
      (float)rand() / RAND_MAX * winres.y - winres.y / 2
    );
  }

  int parse_config(std::string filename) {
    std::ifstream file(filename.c_str());

    if (!file.is_open())
    {
      std::cerr << "Could not open file: " << filename << std::endl;
      return 1;
    }

    std::istringstream iss;
    std::string line, token;

    std::unordered_map<std::string, std::function<void(std::istringstream &)>> token_actions = {
      {"winres", [&](std::istringstream &iss) {
        iss >> settings::winres.x >> settings::winres.y;
      }},

      {"window_title", [&](std::istringstream &iss) {
        std::getline(iss, settings::window_title);
      }},

      {"seed", [&](std::istringstream &iss) {
        iss >> settings::seed;
      }},

      {"max_fps", [&](std::istringstream &iss) {
        iss >> settings::max_fps;
      }},

      {"bgColor", [&](std::istringstream &iss) {
        std::string color_str;
        iss >> color_str;
        settings::bgColor = Color(color_str);
      }},

      {"outlineColor", [&](std::istringstream &iss) {
        std::string color_str;
        iss >> color_str;
        settings::outlineColor = Color(color_str);
      }},

      {"outlineSize", [&](std::istringstream &iss) {
        iss >> settings::outlineSize;
      }},

      {"transitionSmoothness", [&](std::istringstream &iss) {
        iss >> settings::transitionSmoothness;
      }},

      {"polygonColors", [&](std::istringstream &iss) {
        std::string color_str;
        while (iss >> color_str) {
          settings::polygonColors.push_back(Color(color_str));
        }
      }},

      {"polygonCount", [&](std::istringstream &iss) {
        iss >> settings::polygonCount;
      }},

      {"minSize", [&](std::istringstream &iss) {
        iss >> settings::minSize;
      }},

      {"maxSize", [&](std::istringstream &iss) {
        iss >> settings::maxSize;
      }},

      {"print_every", [&](std::istringstream &iss) {
        iss >> settings::print_every;
      }},

      {"vertices", [&](std::istringstream &iss) {
        settings::vertices.clear();
        glm::vec2 v;
        while (!iss.eof()) {
          read_vec2(iss, v, false);
          settings::vertices.push_back(v);
        }
      }},

      {"tick_updates", [&](std::istringstream &iss) {
        iss >> settings::tick_updates;
      }}

    };

    while (std::getline(file, line))
    {
      remove_lead_trail_whitespace(line);
      if (line.empty())
        continue;
      if (is_comment(line))
        continue;

      iss.clear();
      iss.str(line);

      iss >> token;
      auto action = token_actions.find(token);
      if (action != token_actions.end())
      {
        action->second(iss);
      }
      else
      {
        std::cerr << "Error while reading " << filename << ": skipping unknown token " << token << std::endl;
      }
    }

    return 0;
  }
}