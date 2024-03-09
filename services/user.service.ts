import { type NextFunction, type Response } from 'express'
import redis from '../utils/redis'
import UserModel from '../models/user.model'

// get user by id
export const getUserById = async (id: string, res: Response): Promise<void> => {
  const userJson = await redis.get(id)

  if (userJson !== null) {
    const user = JSON.parse(userJson)
    res.status(201).json({
      success: true,
      user
    })
  }
}

// get all users
export const getAllUsersService = async (res: Response): Promise<void> => {
  const user = await UserModel.find({ createdAt: -1 })
  res.status(201).json({
    success: true,
    user
  })
}

// update user role by admin
export const updateUserRoleService = async (res: Response, id: string, role: string, next: NextFunction): Promise<void> => {
  const user = await UserModel.findByIdAndUpdate(id, { role }, { new: true })

  res.status(201).json({
    success: true,
    user
  })
}
