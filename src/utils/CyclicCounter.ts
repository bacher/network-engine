export class CyclicCounter {
  buffer = Array(100).fill(0) as number[];
  index = 0;

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
}
