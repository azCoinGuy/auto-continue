/**
 * Performance monitoring and optimization utilities
 */

export class PerformanceMonitor {
	private static metrics: Map<string, number[]> = new Map();
	private static maxSamples = 100;

	public static startTimer(operation: string): () => void {
		const start = performance.now();
		
		return () => {
			const duration = performance.now() - start;
			this.recordMetric(operation, duration);
		};
	}

	private static recordMetric(operation: string, duration: number) {
		if (!this.metrics.has(operation)) {
			this.metrics.set(operation, []);
		}

		const samples = this.metrics.get(operation)!;
		samples.push(duration);

		// Keep only the last N samples
		if (samples.length > this.maxSamples) {
			samples.shift();
		}
	}

	public static getMetrics(operation: string): {
		average: number;
		min: number;
		max: number;
		samples: number;
	} | null {
		const samples = this.metrics.get(operation);
		if (!samples || samples.length === 0) {
			return null;
		}

		const sum = samples.reduce((a, b) => a + b, 0);
		return {
			average: sum / samples.length,
			min: Math.min(...samples),
			max: Math.max(...samples),
			samples: samples.length
		};
	}

	public static getAllMetrics(): { [operation: string]: any } {
		const result: { [operation: string]: any } = {};
		
		for (const [operation, _] of this.metrics) {
			result[operation] = this.getMetrics(operation);
		}

		return result;
	}

	public static clearMetrics() {
		this.metrics.clear();
	}
}

export class Debouncer {
	private timers: Map<string, NodeJS.Timeout> = new Map();

	public debounce<T extends (...args: any[]) => any>(
		key: string,
		func: T,
		delay: number
	): (...args: Parameters<T>) => void {
		return (...args: Parameters<T>) => {
			const existingTimer = this.timers.get(key);
			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			const timer = setTimeout(() => {
				func(...args);
				this.timers.delete(key);
			}, delay);

			this.timers.set(key, timer);
		};
	}

	public cancel(key: string) {
		const timer = this.timers.get(key);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(key);
		}
	}

	public cancelAll() {
		for (const timer of this.timers.values()) {
			clearTimeout(timer);
		}
		this.timers.clear();
	}

	public dispose() {
		this.cancelAll();
	}
}

export class Cache<K, V> {
	private cache: Map<K, { value: V; timestamp: number; hits: number }> = new Map();
	private maxSize: number;
	private ttl: number; // Time to live in milliseconds

	constructor(maxSize: number = 1000, ttl: number = 5 * 60 * 1000) { // 5 minutes default TTL
		this.maxSize = maxSize;
		this.ttl = ttl;
	}

	public get(key: K): V | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			return undefined;
		}

		// Check if entry has expired
		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return undefined;
		}

		// Update hit count
		entry.hits++;
		return entry.value;
	}

	public set(key: K, value: V): void {
		// Remove expired entries
		this.cleanup();

		// If cache is full, remove least recently used item
		if (this.cache.size >= this.maxSize) {
			this.evictLeastUsed();
		}

		this.cache.set(key, {
			value,
			timestamp: Date.now(),
			hits: 0
		});
	}

	public has(key: K): boolean {
		const entry = this.cache.get(key);
		if (!entry) {
			return false;
		}

		// Check if entry has expired
		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	public delete(key: K): boolean {
		return this.cache.delete(key);
	}

	public clear(): void {
		this.cache.clear();
	}

	public size(): number {
		this.cleanup();
		return this.cache.size;
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > this.ttl) {
				this.cache.delete(key);
			}
		}
	}

	private evictLeastUsed(): void {
		let leastUsedKey: K | undefined;
		let leastHits = Infinity;
		let oldestTimestamp = Infinity;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.hits < leastHits || 
				(entry.hits === leastHits && entry.timestamp < oldestTimestamp)) {
				leastUsedKey = key;
				leastHits = entry.hits;
				oldestTimestamp = entry.timestamp;
			}
		}

		if (leastUsedKey !== undefined) {
			this.cache.delete(leastUsedKey);
		}
	}

	public getStats(): {
		size: number;
		maxSize: number;
		hitRate: number;
		averageAge: number;
	} {
		this.cleanup();
		
		const now = Date.now();
		let totalHits = 0;
		let totalRequests = 0;
		let totalAge = 0;

		for (const entry of this.cache.values()) {
			totalHits += entry.hits;
			totalRequests += entry.hits + 1; // +1 for the initial set
			totalAge += now - entry.timestamp;
		}

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
			averageAge: this.cache.size > 0 ? totalAge / this.cache.size : 0
		};
	}
}

export class ThrottledQueue<T> {
	private queue: T[] = [];
	private processing = false;
	private maxConcurrent: number;
	private currentlyProcessing = 0;

	constructor(
		private processor: (item: T) => Promise<void>,
		private delay: number = 100,
		maxConcurrent: number = 1
	) {
		this.maxConcurrent = maxConcurrent;
	}

	public add(item: T): void {
		this.queue.push(item);
		this.processQueue();
	}

	public addBatch(items: T[]): void {
		this.queue.push(...items);
		this.processQueue();
	}

	private async processQueue(): Promise<void> {
		if (this.processing || this.currentlyProcessing >= this.maxConcurrent) {
			return;
		}

		this.processing = true;

		while (this.queue.length > 0 && this.currentlyProcessing < this.maxConcurrent) {
			const item = this.queue.shift();
			if (item) {
				this.currentlyProcessing++;
				this.processItem(item);
			}
		}

		this.processing = false;
	}

	private async processItem(item: T): Promise<void> {
		try {
			await this.processor(item);
		} catch (error) {
			console.error('Error processing queue item:', error);
		} finally {
			this.currentlyProcessing--;
			
			// Wait before processing next item
			setTimeout(() => {
				if (this.queue.length > 0) {
					this.processQueue();
				}
			}, this.delay);
		}
	}

	public clear(): void {
		this.queue = [];
	}

	public size(): number {
		return this.queue.length;
	}

	public isProcessing(): boolean {
		return this.processing || this.currentlyProcessing > 0;
	}
}
