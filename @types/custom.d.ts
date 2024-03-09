import { type ICourse } from '../models/course.model'
import { type IUser } from '../models/user.model'

declare global {
  namespace Express {
    interface Request {
      user?: IUser
      data: ICourse
    }
  }
}
