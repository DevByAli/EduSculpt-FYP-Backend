import { type NextFunction, type Response, type Request } from 'express'
import { schedule } from 'node-cron'

import ErrorHandler from '../utils/ErrorHandler'
import CatchAsyncError from '../middleware/catchAsyncErrors'
import NotificationModel from '../models/notification.model'
import DeleteNotifications from '../services/notification.service'

//* **************************************
// Get All notification --- only for admin
//* **************************************
export const getNotification = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the notification latest first and old later
    const notification = await NotificationModel.find().sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      notification
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* ******************************************
// Get notification status --- only for admin
//* ******************************************
export const updateNotificationStatus = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // When admin get this notification then its status become uread -> read
    const notification = await NotificationModel.findById(req.params.id)

    if (notification === null) {
      next(new ErrorHandler('Notification not found', 404))
      return
    } else { // change the status of the notification from uread -> read
      notification.status = 'read'
    }

    // Update the notification in the database
    await notification.save()

    // Get the latest notification and the older then send them to client maintain the state
    const notifications = await NotificationModel.find().sort({ createdAt: -1 })

    res.status(201).json({
      success: true,
      notifications
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* *********************************
// delete notification --- only admin
//* *********************************

// Calling every midnight to delete messages older than 30 days that are marked as read
schedule('0 0 0 * * *', () => {
  void DeleteNotifications()
})
