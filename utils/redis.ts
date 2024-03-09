import { Redis } from 'ioredis'
import { configDotenv } from 'dotenv'
configDotenv()

const redisClient = (): string => {
  if (process.env.REDIS_URL != null) {
    console.log('Redis connected.')
    return process.env.REDIS_URL
  }
  throw new Error('Redis connection failed.')
}

export default new Redis(redisClient())
