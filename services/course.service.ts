import { type NextFunction, type Response, type Request } from 'express'

import CourseModel from '../models/course.model'
import CatchAsyncError from '../middleware/catchAsyncErrors'

//* *****************
// Create Course
//* *****************
export const createCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const course = await CourseModel.create(req.data)

  res.status(201).json({
    success: true,
    course
  })
})

// get all courses
export const getAllCoursesService = async (res: Response): Promise<void> => {
  const courses = await CourseModel.find({ createdAt: -1 })
  res.status(201).json({
    success: true,
    user: courses
  })
}
