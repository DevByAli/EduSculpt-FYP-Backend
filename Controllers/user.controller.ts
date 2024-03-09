import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { configDotenv } from 'dotenv'
import { type RedisKey } from 'ioredis'
import { v2 as cloudinary } from 'cloudinary'
import Jwt, { type JwtPayload, type Secret } from 'jsonwebtoken'
import { type NextFunction, type Request, type Response } from 'express'

import redis from '../utils/redis'
import sendMail from '../mail/sendMail'
import UserModel from '../models/user.model'
import ErrorHandler from '../utils/ErrorHandler'
import CatchAsyncError from '../middleware/catchAsyncErrors'
import { type NewUser } from '../Interfaces/newUser.interface'
import { type IRegisteration } from '../Interfaces/registeration.interface'
import { type IActivationToken } from '../Interfaces/activationToke.interface'
import { sendToken, accessTokenOptions, refreshTokenOptions } from '../utils/jwt'
import { type IActivationRequest } from '../Interfaces/activationRequest.interface'
import { getAllUsersService, getUserById, updateUserRoleService } from '../services/user.service'
import { ACCESS_TOKEN, ACCESS_TOKEN_EXPIRY, AVATARS, CAHCE_SESSION_EXPIRY_DAYS, REFRESH_TOKEN, REFRESH_TOKEN_EXPIRY } from '../utils/constants'

configDotenv()
const writeFileAsync = promisify(fs.writeFile)

const createActivationToken = (user: IRegisteration): IActivationToken => {
  // create a random acitivation code
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString()

  // data of the token that will use be use for checking either the use correct activation code
  const tokenData = { user, activationCode }

  const token = Jwt.sign(tokenData, process.env.ACTIVATION_SECRET as Secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  })
  return { token, activationCode }
}

//* ************************
// Register User Controller
//* ************************
export const registerUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body

    const isEmailExist = await UserModel.findOne({ email })
    if (isEmailExist != null) {
      next(new ErrorHandler('Email already exists', 400))
      return
    }

    const user: IRegisteration = { name, email, password }
    const { token, activationCode } = createActivationToken(user)

    // Data that will use in the html that will render and send for email
    const data = { user: { name: user.name }, activationCode }

    // Sending the mail to the user
    await sendMail({ email: user.email, subject: 'Activate your account', template: 'activation-mail.ejs', data })

    res.status(201).json({
      success: true,
      message: `Please check your email: ${user.email} to activate your account`,
      token
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* ************************
// Activate User Controller
//* ************************
export const activateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activationToken, activationCode } = req.body as IActivationRequest
    const newUser: NewUser = (Jwt.verify(String(activationToken), process.env.ACTIVATION_SECRET as Secret) as Jwt.JwtPayload) as NewUser

    if (newUser.activationCode !== activationCode) {
      next(new ErrorHandler('Invalid activation code', 400))
      return
    }

    const { name, email, password } = newUser.user

    // Check either this user is exists already or not
    const existUser = await UserModel.findOne({ email })

    if (existUser != null) {
      next(new ErrorHandler('Email already exists', 400))
      return
    }

    // Save the user in the database
    await UserModel.create({ name, email, password })

    res.status(201).json({ success: true })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* ************************
// Login User
//* ************************
interface ILoginRequest {
  email: string
  password: string
}

export const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as ILoginRequest
    if ((email === undefined) || (password === undefined)) {
      next(new ErrorHandler('Please enter email and password', 400))
      return
    }

    const user = await UserModel.findOne({ email }).select('+password')
    if (user == null) {
      next(new ErrorHandler('Invalid email or password', 400))
      return
    }

    const isPasswordMatch = await user.comparePassword(password)
    if (!isPasswordMatch) {
      next(new ErrorHandler('Invalid email or password', 400))
      return
    }

    // delete password from resposne
    user.password = undefined

    sendToken(user, 200, res)
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* ************************
// logout user
//* ************************
export const logoutUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.cookie(ACCESS_TOKEN, '', { maxAge: 1 })
    res.cookie(REFRESH_TOKEN, '', { maxAge: 1 })

    // Delete the data from the redis cache
    await redis.del(req.user?._id as RedisKey)

    res.status(200).json({
      success: true,
      message: 'Logout successfully'
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* ************************
// update access token
//* ************************
export const updateAccessToken = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const oldRefreshToken = req.cookies[REFRESH_TOKEN] as string

    // Get the id from the token
    const decoded = Jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET as Secret) as JwtPayload

    const message: string = 'Could not refresh token'

    if (decoded === undefined || decoded === null) {
      next(new ErrorHandler(message, 400))
      return
    }

    // Get user data from the redis which save during login
    const session = await redis.get(decoded.id as string)
    if (session === null) {
      next(new ErrorHandler('Please login to access this resource.', 400))
      return
    }

    // Convert the data that we get from the redis to JSON
    const user = JSON.parse(session)

    const accessToken = Jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET as Secret, {
      expiresIn: ACCESS_TOKEN_EXPIRY
    })
    const newRefreshToken = Jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET as Secret, {
      expiresIn: REFRESH_TOKEN_EXPIRY
    })

    // Set the updated cookies
    res.cookie(ACCESS_TOKEN, accessToken, accessTokenOptions)
    res.cookie(REFRESH_TOKEN, newRefreshToken, refreshTokenOptions)

    // update the session in the cache and set expiry after 7 days it will delete
    await redis.set(user._id as RedisKey, JSON.stringify(user), 'EX', CAHCE_SESSION_EXPIRY_DAYS)

    res.status(200).json({ status: 'success', accessToken })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* ************************
// get user by id
//* ************************
export const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId: string = req.user?._id
    await getUserById(userId, res)
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* ************************
// social auth
//* ************************

interface ISocialAuthBody {
  email: string
  name: string
  avatar: string
}

export const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, avatar } = req.body as ISocialAuthBody

    const user = await UserModel.findOne({ email })
    if (user === null) {
      const newUser = await UserModel.create({ email, name, avatar })
      sendToken(newUser, 200, res)
    } else {
      sendToken(user, 200, res)
    }
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* ************************
// Update user info
//* ************************
interface IUpdateUserInfo {
  name?: string
  email?: string
}

export const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email } = req.body as IUpdateUserInfo

    const userId = req.user?._id
    const user = await UserModel.findById(userId).select('-password')

    if ((email != null) && (user != null)) {
      const isEmailExist = await UserModel.findOne({ email })
      if (isEmailExist != null) {
        next(new ErrorHandler('Email already exists', 400))
        return
      }
      user.email = email
    }

    if ((name != null) && (user != null)) {
      user.name = name
    }

    // save the updated user
    await user?.save()

    // Update the data in the redis also because the user info is updated in databaseupdateUserInfo
    await redis.set(userId as RedisKey, JSON.stringify(user))

    res.status(201).json({
      success: true,
      user
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* ************************
// Update user password
//* ************************
interface IUpdatePassword {
  oldPassword: string
  newPassword: string
}

export const updatePassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body as IUpdatePassword

    const user = await UserModel.findById(req.user?._id).select('+password')
    if (user?.password === undefined) {
      next(new ErrorHandler('Invalid user', 400))
      return
    }

    const isPasswordMatch = await user?.comparePassword(oldPassword)
    if (!isPasswordMatch) {
      next(new ErrorHandler('Old password is not match', 400))
      return
    }

    user.password = newPassword

    // Save the udpated user
    await user.save()

    // Update the user data in reids
    await redis.set(req.user?._id as RedisKey, JSON.stringify(user))

    // delete the password from response
    user.password = undefined

    res.status(201).json({
      success: true,
      user
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* ************************
// update profile picture
//* ************************

interface IUpdateProfilePicture {
  avatar: string
}

export const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { avatar } = req.body as IUpdateProfilePicture

    if (avatar === '' || avatar === undefined) {
      next(new ErrorHandler('Please provide the avatar', 400))
      return
    }

    const userId = req.user?._id
    const user = await UserModel.findById(userId)

    if (user === null) {
      next(new ErrorHandler('User not found.', 404))
      return
    }

    // Define a separate function to upload the avatar
    const updateUserAvatar = async (avatar: string): Promise<void> => {
      try {
        // Decode base64 data
        const binaryData = Buffer.from(avatar, 'base64')

        // Save binary data as an image file
        const tempFilePath = path.join(__dirname, '../temp/', 'avatar.png')
        await writeFileAsync(tempFilePath, binaryData)

        // Upload the image file to Cloudinary
        const uploadedAvatar = await cloudinary.uploader.upload(tempFilePath, {
          folder: AVATARS,
          width: 150
        })

        // Delete the temporary file
        fs.unlinkSync(tempFilePath)

        // Update user's avatar information
        if (user !== null) {
          user.avatar = {
            public_id: uploadedAvatar.public_id,
            url: uploadedAvatar.secure_url
          }
        }
      } catch (error) {
        throw new ErrorHandler('Failed to upload avatar', 500)
      }
    }

    // If the user has already avatar then delete it and replace with new one.
    if (user.avatar.public_id !== undefined || user.avatar.public_id !== '') {
      // delete the avatar
      await cloudinary.uploader.destroy(user.avatar.public_id)

      // upload the avatar
      await updateUserAvatar(avatar)
    } else {
      // if the user has no avatar before then simply upload the new one.
      await updateUserAvatar(avatar)
    }

    // Save the updated user profile
    await user?.save()

    // Update the user in the cache
    await redis.set(userId as RedisKey, JSON.stringify(user))

    res.status(200).json({
      success: true,
      user
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 400))
  }
})

//* *********************************
// Get all users --- only for admin
//* *********************************
export const getAllUsers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    void getAllUsersService(res)
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* **********************************
// Update user role --- only for Admin
//* **********************************
interface UpdateUserRoleRequestData {
  id: string
  role: string
}

export const updateUserRole = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, role } = req.body as UpdateUserRoleRequestData

    await updateUserRoleService(res, id, role, next)
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* **********************************
// Delete user --- only for Admin
//* **********************************
export const deleteUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const user = await UserModel.deleteOne({ _id: id })

    // If the user not found
    if (user === null) {
      next(new ErrorHandler('User not found.', 404))
      return
    } else { // delete the user from the redis cache
      await redis.del(id as RedisKey)
    }

    res.status(200).json({
      success: true,
      message: 'User delete successfullyu'
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})
