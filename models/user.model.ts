import bcrypt from 'bcryptjs'
import { configDotenv } from 'dotenv'
import Jwt, { type Secret } from 'jsonwebtoken'
import mongoose, { type Model, type Schema } from 'mongoose'

import { type IUser } from '../Interfaces/user.interface'
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '../utils/constants'

configDotenv()

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const userSchema: Schema<IUser> = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name.']
  },
  email: {
    type: String,
    required: [true, 'Please enter your email'],
    validate: {
      validator: function (value: string) {
        return emailRegexPattern.test(value)
      },
      message: 'Please enter a valid email'
    },
    unique: true
  },
  password: {
    type: String,
    // required: [true, 'Please enter your password.'], cause we can also login with social auth
    minLength: [6, 'Please must be at least 6 characters.'],
    select: false
  },
  avatar: {
    public_id: {
      type: String
    },
    url: {
      type: String
    }
  },
  role: {
    type: String,
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  courses: [
    {
      _id: mongoose.Types.ObjectId
    }
  ]
}, { timestamps: true })

// Hash Password before saving
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    next()
    return
  }
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

// Sign Access Token
userSchema.methods.SignAccessToken = function () {
  return Jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN_SECRET as Secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  })
}

// Sign Refresh Token
userSchema.methods.SignRefreshToken = function () {
  return Jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SECRET as Secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  })
}

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, String(this.password))
}

const userModel: Model<IUser> = mongoose.model('User', userSchema)
export default userModel
