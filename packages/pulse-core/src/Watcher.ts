// packages/pulse-core/src/Watcher.ts
import { EventEmitter } from "events";
import type { NormalizedEvent, WatcherNotification } from "./index.js";

type WatcherEvent = NormalizedEvent | WatcherNotification;

type WatcherLogger = Pick<Console, "warn">;

export type WatcherOptions = {
  strictStoppedListeners?: boolean;
  logger?: WatcherLogger;
};

export class Watcher extends EventEmitter {
  readonly address: string;
  onStop?: (address: string) => void;
  private _stopped: boolean = false;
  private readonly strictStoppedListeners: boolean;
  private readonly logger: WatcherLogger;
  private stopHandlers: Set<() => void> = new Set();

  constructor(address: string, options: WatcherOptions = {}) {
    super();
    this.address = address;
    this.strictStoppedListeners = options.strictStoppedListeners ?? false;
    this.logger = options.logger ?? console;
  }

  on(eventType: string, handler: (event: WatcherEvent) => void): this {
    if (this._stopped) {
      const message = `[pulse-core] Watcher.on("${eventType}") called after stop() for address ${this.address}. Listener was not registered.`;

      if (this.strictStoppedListeners) {
        throw new Error(message);
      }

      this.logger.warn(message);
      return this;
    }

    return super.on(eventType, handler);
  }

  emit(eventType: string, event: WatcherEvent): boolean {
    if (this._stopped) return false;
    return super.emit(eventType, event);
  }

  get stopped(): boolean {
    return this._stopped;
  }

  addStopHandler(handler: () => void): () => void {
    if (this._stopped) {
      handler();
      return () => {};
    }

    this.stopHandlers.add(handler);
    return () => {
      this.stopHandlers.delete(handler);
    };
  }

  stop(): void {
    if (this._stopped) return;
    this._stopped = true;
    for (const handler of this.stopHandlers) {
      handler();
    }
    this.stopHandlers.clear();
    this.removeAllListeners();
    this.onStop?.(this.address);
  }
}
