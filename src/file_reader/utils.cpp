#include "utils.h"

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

void remove_lead_trail_whitespace(std::string& str) {
  size_t start = str.find_first_not_of(" \t");
  size_t end = str.find_last_not_of(" \t");
  // do nothing if no non-whitespace characters found or if string is empty
  if (start == std::string::npos || end == std::string::npos) {
    str = "";
    return;
  }
  str = str.substr(start, end - start + 1);
}

// for istringstream. retrieves string from iss, removes leading and trailing whitespace, and sets iss to the new string.
void remove_lead_trail_whitespace(std::istringstream& iss) {
  std::string remaining = iss.str().substr(iss.tellg());
  remove_lead_trail_whitespace(remaining);
  iss.str(remaining);
  iss.clear();
}

std::string discard_tokens(std::string& line, int n, bool remove_lt_whitespace) {
  std::istringstream iss(line);
  std::string token;
  for (int i = 0; i < n; i++) {
    iss >> token;
  }
  std::getline(iss, line);
  if (remove_lt_whitespace) {
    remove_lead_trail_whitespace(line);
  }
  return line;
}

bool is_comment(std::string& line) {
  return line[0] == '/' && line[1] == '/';
}

// check if a line contains a substring.
bool found_substr_in_line(std::string& line, std::string substr) {
  return line.find(substr) != std::string::npos;
}

// read until a substring is found.
bool read_until_substr_found(std::ifstream& file, const std::string filename, std::string substr) {
  std::string line;

  while (std::getline(file, line)) {
    if (found_substr_in_line(line, substr)) {
      break;
    }
    // if (line.find(substr) != std::string::npos) {
    //   break;
    // }
  }
  if (no_close_tag(file, filename, line, substr)) return false;
  // if (file.eof()) {
  //   std::cerr << "Incorrect syntax while reading " << filename << ": expected " << substr << " but reached end of file" << std::endl;
  //   return false;
  // }
  return true;
}

bool no_close_tag(std::ifstream& file, const std::string filename, std::string& line, std::string tag) {
  if (file.eof() && !found_substr_in_line(line, tag)) {
    std::cerr << "Incorrect syntax while reading " << filename << ": expected " << tag << " but reached end of file" << std::endl;
    return true;
  }
  return false;
}

void read_vec2(std::istringstream& iss, glm::vec2& v, bool is_last_entry) {
  std::string coord_type = "c";
  std::string pos_x_str;
  if (!is_last_entry) {
    iss >> pos_x_str;

    std::string pos_y_str;
    std::getline(iss, pos_y_str, ',');
    v.y = std::stof(pos_y_str);

  } else {
    iss >> pos_x_str >> v.y;
  }

  if (pos_x_str[0] == 'p') {
    coord_type = "p";
    pos_x_str = pos_x_str.substr(1);  
  }

  v.x = std::stof(pos_x_str); 

  // c is cartesian coord, p is polar coord
  if (coord_type == "p") {
    float r = v.x;
    float theta = v.y * M_PI / 180;
    v.x = r * cos(theta);
    v.y = r * sin(theta);
  }
}