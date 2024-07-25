export class Timer {
  constructor({description = "", start_ = false}) {
    this.started = false;
    this.ended = false;
    this.description = description;
    this.durations_us = [];
    if (start_) {
      this.start();
    }
  }

  start() {
    this.started = true;
    this.ended = false;
    this.t1 = performance.now();
  }

  end({push = false, print = true} = {}) {
    if (!this.started || this.ended) return 0;
    const t2 = performance.now();
    const duration_us = t2 - this.t1;
    const duration_ms = duration_us / 1000;
    if (this.description !== "" && print) {
      console.log(`${this.description} took ${duration_us}us (${duration_ms}ms)`);
    }

    if (push) {
      this.durations_us.push(duration_us);
    }
    this.ended = true;
    return duration_us;
  }

  update_description(description) {
    this.description = description;
  }

  reset_durations() {
    this.durations_us = [];
  }

  avg() {
    if (this.durations_us.length === 0) return 0;
    return this.total() / this.durations_us.length;
  }

  total() {
    if (this.durations_us.length === 0) return 0;
    return this.durations_us.reduce((a, b) => a + b, 0);
  }

  min() {
    if (this.durations_us.length === 0) return 0;
    return Math.min(...this.durations_us);
  }

  max() {
    if (this.durations_us.length === 0) return 0;
    return Math.max(...this.durations_us);
  }

  print_report() {
    console.log(`Timer report for ${this.description}`);
    const total_ = this.total();
    const avg_ = this.avg();
    const min_ = this.min();
    const max_ = this.max();
    console.log(`  Total: ${total_}us (${total_ / 1000}ms, ${total_ / 1000000}s)`);
    console.log(`  Avg: ${avg_}us (${avg_ / 1000}ms, ${avg_ / 1000000}s)`);
    console.log(`  Min: ${min_}us (${min_ / 1000}ms, ${min_ / 1000000}s)`);
    console.log(`  Max: ${max_}us (${max_ / 1000}ms, ${max_ / 1000000}s)`);
  }
}
