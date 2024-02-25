export class IntervalTimer {
  private tickId = 0;
  private startedAt: number | undefined;
  private timeoutId: number | undefined;

  constructor(
    private intervalMs: number,
    private callback: () => void,
  ) {}

  start(): void {
    window.setTimeout(() => {
      this.startedAt = performance.now();
      this.tick();
    }, 0);
  }

  private tick() {
    this.callback();
    this.tickId += 1;

    const targetTime = this.startedAt! + this.tickId * this.intervalMs;
    const now = performance.now();
    let delay = targetTime - now;

    if (delay < 0) {
      console.warn('IntervalTimer: empty tick');
      delay = this.intervalMs;
    }

    this.timeoutId = window.setTimeout(() => {
      this.tick();
    }, delay);
  }

  stop(): void {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}
