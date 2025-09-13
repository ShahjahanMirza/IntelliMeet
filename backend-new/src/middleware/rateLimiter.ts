import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class MemoryStore {
  public store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || now > entry.resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return this.store[key];
    }

    entry.count++;
    return entry;
  }

  reset(key: string): void {
    delete this.store[key];
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store = {};
  }
}

const defaultStore = new MemoryStore();

export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = `Too many requests, please try again later.`,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    // Generate key based on IP address
    const key = req.ip || req.connection.remoteAddress || 'unknown';

    const result = defaultStore.increment(key, windowMs);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - result.count).toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });

    if (result.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
    }

    // Skip counting for certain responses if configured
    const originalSend = res.send;
    res.send = function(data) {
      const statusCode = res.statusCode;

      if ((skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) ||
          (skipFailedRequests && statusCode >= 400)) {
        // Decrement the count for skipped requests
        if (defaultStore.store[key]) {
          defaultStore.store[key].count = Math.max(0, defaultStore.store[key].count - 1);
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

// Predefined rate limiters for different use cases
export const generalLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many requests from this IP, please try again later.'
});

export const strictLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50,
  message: 'Rate limit exceeded. Please try again later.'
});

export const apiLimiter = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 60, // Increased for polling endpoints
  message: 'API rate limit exceeded. Please slow down your requests.'
});

export const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true
});

// Separate limiter for polling endpoints that need higher limits
export const pollingLimiter = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 100, // Higher limit for polling
  message: 'Polling rate limit exceeded. Please slow down your requests.'
});

// Cleanup function for graceful shutdown
export function cleanup() {
  defaultStore.destroy();
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
