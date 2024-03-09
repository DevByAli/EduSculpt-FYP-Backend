import { type IUser } from './user.interface'

export interface NewUser {
  user: IUser
  activationCode: string
}
