export interface RateLimiterOptions {
  requestsPerSecond: number;
  burstCapacity?: number; // Nombre de requêtes qu'on peut faire d'un coup
  adaptiveTiming?: boolean; // Ajustement automatique basé sur les erreurs 429
}

interface QueuedTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

export class RateLimiter {
  private readonly queue: QueuedTask<any>[] = [];
  private readonly requestsPerSecond: number;
  private readonly burstCapacity: number;
  private readonly adaptiveTiming: boolean;
  private readonly intervalMs: number;
  private isProcessing = false;
  private lastRequestTime = 0;
  private consecutiveErrors = 0;
  private adaptiveDelay = 0;

  constructor(options: RateLimiterOptions) {
    const { requestsPerSecond, burstCapacity = 50, adaptiveTiming = true } = options;
    this.requestsPerSecond = requestsPerSecond;
    this.burstCapacity = burstCapacity;
    this.adaptiveTiming = adaptiveTiming;
    this.intervalMs = requestsPerSecond > 0 ? Math.floor(1000 / requestsPerSecond) : 1000;
  }

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject,
        timestamp: Date.now()
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        // Traiter par batch pour de meilleures performances
        const batch = this.queue.splice(0, this.burstCapacity);
        
        // Exécuter le batch en parallèle
        const promises = batch.map(async ({ task, resolve, reject }) => {
          try {
            const result = await task();
            resolve(result);
            this.onSuccess();
          } catch (error) {
            reject(error);
            this.onError(error);
          }
        });

        // Attendre que le batch soit terminé
        await Promise.allSettled(promises);

        // Délai adaptatif entre les batches
        if (this.queue.length > 0) {
          const delay = this.calculateDelay();
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private calculateDelay(): number {
    const baseDelay = this.intervalMs;
    
    if (!this.adaptiveTiming) {
      return baseDelay;
    }

    // Délai adaptatif basé sur les erreurs récentes
    if (this.consecutiveErrors > 0) {
      // Augmenter le délai exponentiellement en cas d'erreurs
      const exponentialDelay = baseDelay * Math.pow(2, this.consecutiveErrors);
      return Math.min(exponentialDelay, 5000); // Max 5 secondes
    }

    // Délai normal avec un petit ajustement
    return baseDelay + this.adaptiveDelay;
  }

  private onSuccess(): void {
    this.consecutiveErrors = 0;
    this.adaptiveDelay = Math.max(0, this.adaptiveDelay - 10); // Réduire progressivement
    this.lastRequestTime = Date.now();
  }

  private onError(error: any): void {
    // Vérifier si c'est une erreur de rate limiting
    if (this.isRateLimitError(error)) {
      this.consecutiveErrors++;
      this.adaptiveDelay = Math.min(this.adaptiveDelay + 50, 1000); // Augmenter progressivement
      console.warn(`Rate limit error detected. Adaptive delay increased to ${this.adaptiveDelay}ms`);
    } else {
      // Réinitialiser pour les autres types d'erreurs
      this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
    }
  }

  private isRateLimitError(error: any): boolean {
    // Vérifier les différents types d'erreurs de rate limiting
    if (error?.response?.status === 429) return true;
    if (error?.code === 'RATE_LIMITED') return true;
    if (error?.message?.toLowerCase().includes('rate limit')) return true;
    if (error?.message?.toLowerCase().includes('too many requests')) return true;
    return false;
  }

  // Méthodes utilitaires pour monitoring
  getQueueLength(): number {
    return this.queue.length;
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      consecutiveErrors: this.consecutiveErrors,
      adaptiveDelay: this.adaptiveDelay,
      requestsPerSecond: this.requestsPerSecond,
      burstCapacity: this.burstCapacity
    };
  }
}


