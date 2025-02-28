// Rate limiting implementation
interface RateLimitInfo {
    count: number;
    resetTime: number;
  }
  
  const rateLimits = new Map<string, RateLimitInfo>();
  const MAX_REQUESTS = 10; // Maximum requests per window
  const WINDOW_MS = 5 * 60 * 1000; // 5 minute window
  
  export function isRateLimited(ip: string): boolean {
    const now = Date.now();
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up on each request
      for (const [key, value] of rateLimits.entries()) {
        if (now > value.resetTime) {
          rateLimits.delete(key);
        }
      }
    }
    
    // Check if this IP is already being tracked
    let limitInfo = rateLimits.get(ip);
    
    if (!limitInfo) {
      // First request from this IP
      limitInfo = {
        count: 1,
        resetTime: now + WINDOW_MS
      };
      rateLimits.set(ip, limitInfo);
      return false;
    }
    
    // If the window has expired, reset the counter
    if (now > limitInfo.resetTime) {
      limitInfo.count = 1;
      limitInfo.resetTime = now + WINDOW_MS;
      rateLimits.set(ip, limitInfo);
      return false;
    }
    
    // Increment counter and check if limit exceeded
    limitInfo.count++;
    rateLimits.set(ip, limitInfo);
    
    return limitInfo.count > MAX_REQUESTS;
  }