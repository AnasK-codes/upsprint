export interface BreakerOptions {
  /** Outcomes remembered per platform. */
  windowSize: number;
  /** Do not trip before this many outcomes are recorded. */
  minSamples: number;
  /** Failure ratio (0..1) at or above which the breaker opens. */
  failureThreshold: number;
  cooldownMs: number;
}

/**
 * Small rolling-window circuit breaker. It only decides; the caller pauses the
 * queue on `onOpen` and resumes it on `onClose`.
 *
 * TODO(multi-replica): state is per worker process. With several worker replicas
 * each one trips independently on its own sample. Move the window and open flag
 * into Redis so replicas share one view.
 */
export class CircuitBreaker {
  private outcomes: boolean[] = []; // true = success
  private openUntil = 0;
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly opts: BreakerOptions,
    private readonly onOpen: (cooldownMs: number) => void | Promise<void>,
    private readonly onClose: () => void | Promise<void>,
    private readonly now: () => number = Date.now
  ) {}

  get isOpen(): boolean {
    return this.now() < this.openUntil;
  }

  record(success: boolean): void {
    if (this.isOpen) return; // in-flight jobs finishing during cooldown don't re-trip
    this.outcomes.push(success);
    if (this.outcomes.length > this.opts.windowSize) this.outcomes.shift();

    const n = this.outcomes.length;
    if (n < this.opts.minSamples) return;
    const failures = this.outcomes.filter((ok) => !ok).length;
    if (failures / n >= this.opts.failureThreshold) this.trip();
  }

  private trip(): void {
    this.openUntil = this.now() + this.opts.cooldownMs;
    this.outcomes = []; // half-open: judge the next samples fresh after cooldown
    void this.onOpen(this.opts.cooldownMs);
    this.timer = setTimeout(() => void this.onClose(), this.opts.cooldownMs);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
