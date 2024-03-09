import { configDotenv } from 'dotenv'
import { type Response } from 'express'
import { type RedisKey } from 'ioredis'
import redis from './redis'

import { type IUser } from '../Interfaces/user.interface'
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants'
configDotenv()

interface ITokenOptions {
  expires: Date
  maxAge: number
  httpOnly: boolean
  sameSite: 'lax' | 'strict' | 'none' | undefined
  secure?: boolean
}

// parse enviornment variables to integrate with fallback values
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE, 10)
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE, 10)

// options for cookies
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
}

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
}

export const sendToken = (user: IUser, statusCode: number, res: Response): void => {
  const accessToken = user.SignAccessToken()
  const refreshToken = user.SignRefreshToken()

  // upload session to redis
  void redis.set(user._id as RedisKey, JSON.stringify(user))

  // only set secure to true in production
  if (process.env.NODE_ENV === 'production') {
    accessTokenOptions.secure = true
  }

  res.cookie(ACCESS_TOKEN, accessToken, accessTokenOptions)
  res.cookie(REFRESH_TOKEN, refreshToken, refreshTokenOptions)

  res.status(statusCode).json({
    success: true,
    user
  })
}
