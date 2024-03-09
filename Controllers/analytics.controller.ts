import { type Response, type Request, type NextFunction } from 'express'
import CatchAsyncError from '../middleware/catchAsyncErrors'
import ErrorHandler from '../utils/ErrorHandler'
import { generateLast12MonthsData } from '../utils/analytics.generator'
import userModel from '../models/user.model'
import CourseModel, { ICourse } from '../models/course.model'
import OrderModel from '../models/order.model'

//* ***************************************
// get user analytics ---  only for admin
//* **************************************
export const getUserAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await generateLast12MonthsData(userModel)

    res.status(200).json({
      success: true,
      users
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.messsage), 500))
  }
})

//* *****************************************
// get courses analytics ---  only for admin
//* *****************************************
export const getCoursesAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await generateLast12MonthsData(CourseModel)

    res.status(200).json({
      success: true,
      courses
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.messsage), 500))
  }
})

//* *****************************************
// get Order analytics ---  only for admin
//* *****************************************
export const getOrderAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await generateLast12MonthsData(OrderModel)

    res.status(200).json({
      success: true,
      orders
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.messsage), 500))
  }
})
