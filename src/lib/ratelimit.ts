import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 15 AI requests per user per day (sliding window)
export const aiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "24 h"),
  prefix: "playground:ai",
});
