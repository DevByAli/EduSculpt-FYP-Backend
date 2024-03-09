import { type NextFunction, type Request, type Response } from 'express'

import NotificationModel from '../models/notification.model'
import { type IOrder } from '../models/order.model'
import UserModel from '../models/user.model'
import CourseModel from '../models/course.model'
import CatchAsyncError from '../middleware/catchAsyncErrors'
import ErrorHandler from '../utils/ErrorHandler'
import { NewOrder, getAllOrdersService } from '../services/order.service'
import sendMail from '../mail/sendMail'

//* *********************
// create order
//* *********************
export const CreateOrder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, paymentInfo } = req.body as IOrder

    // Get the user data from the database
    const user = await UserModel.findById(req.user?._id)

    if (user === null) {
      next(new ErrorHandler('User not found.', 400))
      return
    }

    // Check either the user has already purchased this course or not
    const courseExistInUser = user?.courses.some((course: any) => course._id.toString() === courseId)
    if (courseExistInUser === null) {
      next(new ErrorHandler('You have already buy yhis course', 400))
      return
    }

    const course = await CourseModel.findById(courseId)
    if (course === null) {
      next(new ErrorHandler('Course not found', 400))
      return
    }

    const data: any = {
      courseId: course._id,
      userId: user?._id,
      paymentInfo
    }

    // 'req.data' is user to access the data in NewOrder service
    req.data = data

    // Mail data that will send to the user for order confirmation
    const mailData = {
      order: {
        _id: course._id.toString().slice(0, 6),
        name: course.name,
        price: course.price,
        data: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      }
    }

    // Handling order confirmation mail
    try {
      if (user !== null) {
        // Sending the order confirmation mail to user
        await sendMail({
          email: user.email,
          subject: 'Order confirmation',
          template: 'order-confirmation.ejs',
          data: mailData
        })
      }
    } catch (error: any) {
      next(new ErrorHandler(String(error.message), 500))
      return
    }

    // Add the course in the course array of the user
    user?.courses.push(course?._id as unknown as { courseId: string })

    // Save the user data in database
    await user?.save()

    // Save the notification in the database
    await NotificationModel.create({
      user: user?._id,
      title: 'New Order',
      message: `You have a new order from ${course?.name}`
    })

    // Update the number of purchased courses
    course.purchased += 1
    await course.save()

    // Place the new order and save the data in database
    NewOrder(req, res, next)
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* *********************************
// Get all courses --- only for admin
//* *********************************
export const getAllOrder = CatchAsyncError(async (_req: Request, res: Response, next: NextFunction) => {
  try {
    void getAllOrdersService(res)
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})
