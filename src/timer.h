#ifndef TIMER_H
#define TIMER_H

#include <vector>
#include <numeric>
#include <algorithm>
#include <chrono>
#include <string>
#include <iostream>

class Timer {
private:
  bool started = false;
  bool ended = false;
  std::chrono::time_point<std::chrono::high_resolution_clock> t1;
  std::string description;
  
public:
  std::vector<int> durations_us;

  Timer(std::string description = "", bool start_ = false): description(description) {
    if (start_) {
      start();
    }
  };

  void start() {
    started = true;
    ended = false;
    t1 = std::chrono::high_resolution_clock::now();
  }

  int end(bool push = false, bool print = true) {
    if (!started || ended) return 0;
    auto t2 = std::chrono::high_resolution_clock::now();
    auto duration_us = std::chrono::duration_cast<std::chrono::microseconds>(t2 - t1).count();
    auto duration_ms = duration_us / 1000.0f;
    if (description != "" && print) {
      std::cout << description << " took " << duration_us << "us (" << duration_ms << "ms)" << std::endl;
    }

    if (push) {
      durations_us.push_back(duration_us);
    }
    ended = true;
    return duration_us;
  }

  void update_description(std::string description) {
    this->description = description;
  }
  
  void reset_durations() {
    durations_us.clear();
  }

  int avg() {
    if (durations_us.size() == 0) return 0;
    return total() / durations_us.size();
  }

  int total() {
    if (durations_us.size() == 0) return 0;
    return std::accumulate(durations_us.begin(), durations_us.end(), 0);
  }

  int min() {
    if (durations_us.size() == 0) return 0;
    return *std::min_element(durations_us.begin(), durations_us.end());
  }

  int max() {
    if (durations_us.size() == 0) return 0;
    return *std::max_element(durations_us.begin(), durations_us.end());
  }

  void print_report() {
    std::cout << "Timer report for " << description << "\n";
    float total_ = total();
    float avg_ = avg();
    float min_ = min();
    float max_ = max();
    std::cout << "  Total: " << total_ << "us (" << total_ / 1000 << "ms, " << total_ / 1000000 << "s)\n";
    std::cout << "  Avg: " << avg_ << "us (" << avg_ / 1000 << "ms, " << avg_ / 1000000 << "s)\n";
    std::cout << "  Min: " << min_ << "us (" << min_ / 1000 << "ms, " << min_ / 1000000 << "s)\n";
    std::cout << "  Max: " << max_ << "us (" << max_ / 1000 << "ms, " << max_ / 1000000 << "s)\n";
  }

  ~Timer() {
    end();
  };
};

#endif