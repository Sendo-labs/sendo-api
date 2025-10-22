export interface RateLimiterOptions {
  requestsPerSecond: number;
}

export class RateLimiter {
  private readonly queue: Array<() => Promise<void>> = [];
  private readonly intervalMs: number;
  private isProcessing = false;

  constructor(options: RateLimiterOptions) {
    const { requestsPerSecond } = options;
    this.intervalMs = requestsPerSecond > 0 ? Math.floor(1000 / requestsPerSecond) : 1000;
  }

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const wrapped = async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      this.queue.push(async () => {
        await wrapped();
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) continue;
      await next();
      await new Promise((r) => setTimeout(r, this.intervalMs));
    }

    this.isProcessing = false;
  }
}


