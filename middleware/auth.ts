import { type RedisKey } from 'ioredis'
import jwt, { type Secret, type JwtPayload } from 'jsonwebtoken'
import { type Request, type Response, type NextFunction } from 'express'

import redis from '../utils/redis'
import CatchAsyncError from './catchAsyncErrors'
import ErrorHandler from '../utils/ErrorHandler'
import { ACCESS_TOKEN } from '../utils/constants'

// Authenticated User
export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies[ACCESS_TOKEN] as string

  if (accessToken === undefined) {
    next(new ErrorHandler('Please login to access this resource', 400))
    return
  }

  // Verify the token is valid or not
  const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET as Secret) as JwtPayload
  if (decoded === undefined || decoded === null) {
    next(new ErrorHandler('Access token is not valid', 400))
    return
  }

  // get user data from cache
  const user = await redis.get(decoded.id as RedisKey)
  if (user == null) {
    next(new ErrorHandler('Please login to get this resource.', 400))
    return
  }

  req.user = JSON.parse(user)
  next()
})

// validate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes((String(req.user?.role)))) {
      next(new ErrorHandler(`Role: ${req.user?.role} is not allowed to access this resource.`, 403))
    }
  }
}
