#ifndef FILE_READER_UTILS_H
#define FILE_READER_UTILS_H

#include <iostream>
#include <fstream>
#include <sstream>

#include <vector>
#include <glm/glm.hpp>


// remove leading and trailing whitespace from a string.
void remove_lead_trail_whitespace(std::string& str);

// for istringstream. retrieves string from iss, removes leading and trailing whitespace, and sets iss to the new string.
void remove_lead_trail_whitespace(std::istringstream& iss);

// discard n tokens from a string.
std::string discard_tokens(std::string& line, int n = 2, bool remove_lt_whitespace = true);

// check if a line is a comment.
bool is_comment(std::string& line);

// check if a line contains a substring.
bool found_substr_in_line(std::string& line, std::string substr);

// read until a substring is found in a line. that line is then discarded.
bool read_until_substr_found(std::ifstream& file, const std::string filename, std::string substr);

bool no_close_tag(std::ifstream& file, const std::string filename, std::string& line, std::string tag);

// check if a polygon is convex (path must be clockwise for now)
// bool polygon_is_convex(std::vector<glm::vec2> vertices);

// read vec2 
void read_vec2(std::istringstream& iss, glm::vec2& vec, bool is_last_entry = false);

#endif 