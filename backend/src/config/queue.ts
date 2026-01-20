
import logger from "../utils/logger.js";

type Processor<T> = (job: T) => Promise<void>;

class InMemoryQueue<T> {
  private queue: T[] = [];
  private processor: Processor<T> | null = null;
  private isProcessing = false;

  constructor(private name: string) { }

  registerProcessor(processor: Processor<T>) {
    this.processor = processor;
  }

  async add(data: T) {
    this.queue.push(data);
    this.process(); // Fire and forget
  }

  private async process() {
    if (this.isProcessing || !this.processor || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Process all items in queue one by one
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        try {
          await this.processor(job);
        } catch (error) {
          logger.error(`Error processing job in queue ${this.name}`, error);
        }
      }
    }

    this.isProcessing = false;
  }
}

export interface SnapshotJobData {
  accountId: number;
  username: string;
  platform: string;
}

export const snapshotQueue = new InMemoryQueue<SnapshotJobData>("snapshot-queue");
