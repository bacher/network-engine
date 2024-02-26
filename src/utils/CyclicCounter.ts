export class CyclicCounter {
  buffer: number[];
  index = 0;

  constructor(limit = 100) {
    this.buffer = Array(limit).fill(0) as number[];
  }

  increase(value: number): void {
    this.buffer[this.index] += value;
  }

  next(value = 0): void {
    this.index += 1;
    if (this.index === 100) {
      this.index = 0;
    }
    this.buffer[this.index] = value;
  }

  clear() {
    this.index = 0;
    this.buffer = Array(this.buffer.length).fill(0) as number[];
  }
}
