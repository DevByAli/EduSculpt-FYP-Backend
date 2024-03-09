import mongoose from 'mongoose'
import { type RedisKey } from 'ioredis'
import { v2 as cloudinary } from 'cloudinary'
import { type Request, type Response, type NextFunction } from 'express'

import redis from '../utils/redis'
import sendMail from '../mail/sendMail'
import ErrorHandler from '../utils/ErrorHandler'
import NotificationModel from '../models/notification.model'
import CatchAsyncError from '../middleware/catchAsyncErrors'
import { createCourse, getAllCoursesService } from '../services/course.service'
import CourseModel, { type IReview, type IComment } from '../models/course.model'
import { ALL_COURSES, CAHCE_COURSE_EXPIRY_DAYS, COURSES, COURSE_DATA_FILTER } from '../utils/constants'

//* ******************
// Upload Course
//* ******************
export const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body
    const thumbnail = req.data.thumbnail

    // Upload the thumbnail to cloudinary
    if (thumbnail !== undefined) {
      const { public_id, secure_url } = await cloudinary.uploader.upload(String(thumbnail), {
        folder: COURSES
      })
      data.thumbnail = {
        public_id,
        secure_url
      }
    }
    createCourse(req, res, next)
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* ******************
// Edit Course
//* ******************
export const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body
    const thumbnail = data.thumbnail

    // Upload the thumbnail to cloudinary
    if (thumbnail !== undefined) {
      // delete the previous thumbnail
      await cloudinary.uploader.destroy(String(thumbnail.public_id))

      // Upload the new thumbnail
      const { public_id, secure_url } = await cloudinary.uploader.upload(String(thumbnail), {
        folder: COURSES
      })

      data.thumbnail = {
        public_id,
        secure_url
      }
    }

    const courseId = req.params.id

    // Update the course in database
    const course = await CourseModel.findByIdAndUpdate(courseId, { $set: data }, { new: true }).select(COURSE_DATA_FILTER)

    // update the cache also
    await redis.set(courseId, JSON.stringify(course), 'EX', CAHCE_COURSE_EXPIRY_DAYS)

    res.status(201).json({
      success: true,
      course
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* ***************************************
// Get single course --- without purchasing
//* ***************************************
export const getSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.id

    // Check the redis have cache of this course
    const cacheData = await redis.get(courseId)

    // Data is present in redis
    if (cacheData !== null) {
      const course = JSON.parse(cacheData)

      res.status(200).json({
        success: true,
        course
      })
    } else { // the data is not present in the redis cache
      // get the filtered course data that everyone can access
      const course = await CourseModel.findById(courseId).select(COURSE_DATA_FILTER)

      // cache the data in redis so that database is not overloaded
      await redis.set(courseId, JSON.stringify(course), 'EX', CAHCE_COURSE_EXPIRY_DAYS)

      res.status(200).json({
        success: true,
        course
      })
    }
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* ***************************************
// Get all course --- without purchasing
//* ***************************************
export const getAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the data from the cache
    const cacheData = await redis.get(ALL_COURSES)

    // If the cache has data
    if (cacheData !== null) {
      const courses = JSON.parse(cacheData)
      res.status(200).json({
        success: true,
        courses
      })
    } else { // if data is not cached
      const courses = await CourseModel.find().select(COURSE_DATA_FILTER)

      // Cache the data of all courses
      await redis.set(ALL_COURSES, JSON.stringify(courses))

      res.status(200).json({
        success: true,
        courses
      })
    }
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

// *******************************************
// Get course content --- only for valid users
// *******************************************
export const getCourseByValidUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userCourseList = req.user?.courses
    const courseId = req.params.id

    const courseExists = userCourseList?.find(({ _id }: { _id: mongoose.Types.ObjectId }) => _id.toString() === courseId)

    if (courseExists === null) {
      next(new ErrorHandler('You are not eligible to get this course', 400))
      return
    }

    const course = await CourseModel.findById(courseId)
    const content = course?.courseData

    res.status(200).json({
      success: true,
      content
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

// **********************
// Add Question in course
// **********************
interface IAddQuestionData {
  question: string
  courseId: string
  contentId: string
}

export const addQuestion = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, courseId, contentId } = req.body as IAddQuestionData

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      next(new ErrorHandler('Invalid content id', 400))
      return
    }

    // Get course from database
    const course = await CourseModel.findById(courseId)

    const courseContent = course?.courseData?.find((item: any) => item._id.equals(courseId))
    if (courseContent === undefined) {
      next(new ErrorHandler('Content not found.', 400))
      return
    }

    // Create new question
    const newQuestion: any = {
      user: req.user,
      question,
      questionReplies: Array<IComment>()
    }

    // add this question to our course content
    courseContent.questions.push(newQuestion as IComment)

    // Send the notification to the Admin that new question is asked by the user
    await NotificationModel.create({
      user: req.user?._id,
      title: 'New Question Recieved',
      message: `You have new question in ${courseContent.title}`
    })

    // save the updated course
    await course?.save()

    res.status(200).json({
      success: true,
      course
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

// **********************
// Add answer in question
// **********************
interface IAddAnswerData {
  answer: string
  courseId: string
  contentId: string
  questionId: string
}

export const addAnswer = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { answer, courseId, contentId, questionId } = req.body as IAddAnswerData

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      next(new ErrorHandler('Invalid content id', 400))
      return
    }

    // Get course from database
    const course = await CourseModel.findById(courseId)

    const courseContent = course?.courseData?.find((item: any) => item._id.equals(courseId))
    if (courseContent === undefined) {
      next(new ErrorHandler('Content not found.', 400))
      return
    }

    const question = courseContent?.questions?.find((item: any) => item._id.equals(questionId))
    if (question === undefined) {
      next(new ErrorHandler('Question not found.', 400))
      return
    }

    // create new answer object
    const newAnswer: any = {
      user: req.user,
      answer
    }

    // add this answer to our course content
    question.questionReplies?.push(newAnswer as IComment)

    // save data in database
    await course?.save()

    // Now handling the notification to admin that user asked a question
    if (req.user?._id === question.user._id) {
      // create a notification to admin user give reply to your answer
      await NotificationModel.create({
        user: req.user?._id,
        title: 'New Question Reply Received',
        message: `You have a new question reply in ${courseContent.title}`
      })
    } else { // sending the mail to user who made a question
      const data = {
        qName: question.user.name,
        rName: req.user?.name,
        title: courseContent.title
      }

      try {
        const replyMail = {
          email: question.user.email,
          subject: 'Question Reply',
          template: 'question-reply.ejs',
          data
        }

        // Send mail to user who asked a question
        await sendMail(replyMail)
      } catch (error: any) {
        next(new ErrorHandler(String(error.message), 500))
        return
      }
    }

    res.status(200).json({
      success: true,
      course
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* ********************
// add review in course
//* ********************
interface IAddReviewData {
  review: string
  rating: number
  userId: string
}

export const addReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userCourseList = req.user?.courses as Array<{ _id: mongoose.Types.ObjectId }>
    const courseId = req.params.id

    // check if courseId already exists in userCourseList based on _id
    const courseExists = userCourseList?.some((course: any) => course._id.toString() === courseId)
    if (courseExists) {
      next(new ErrorHandler('You are not eligible to access this course', 404))
      return
    }

    const course = await CourseModel.findById(courseId)
    const { review, rating } = req.body as IAddReviewData

    const newReviewData: any = {
      user: req.user,
      comment: review,
      rating
    }
    course?.reviews.push(newReviewData as IReview)

    let avg = 0
    course?.reviews.forEach((rev: IReview) => {
      avg += rev.rating
    })

    if (course !== null) {
      course.ratings = avg / course.reviews.length
    }

    await course?.save()

    // create notification to admin that user gave review to you course
    await NotificationModel.create({
      user: req.user?._id,
      title: 'New Review received',
      message: `${req.user?.name} has given a review in ${course?.name}`
    })

    res.status(200).json({
      success: true,
      course
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

// *****************************
// Add Reply to review by Admin
// *****************************
interface IAddReviewReplyData {
  comment: string
  courseId: string
  reviewId: string
}

export const addReviewReply = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { comment, courseId, reviewId } = req.body as IAddReviewReplyData

    // Find a course to which reply is done
    const course = await CourseModel.findById(courseId)

    if (course === null) {
      next(new ErrorHandler('Course not found.', 400))
      return
    }

    const review = course?.reviews?.find((rev: any) => rev._id.toString() === reviewId)

    // Review is not found
    if (review === undefined) {
      next(new ErrorHandler('Review not found.', 400))
      return
    }

    const replyData: any = {
      user: req.user,
      comment
    }

    // If its the first review
    if (review.commentReplies === null) {
      review.commentReplies = []
    }

    review.commentReplies?.push(replyData as IComment)

    // save the course data with updated review
    await course?.save()

    res.status(200).json({
      success: true,
      course
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* *********************************
// Get all courses --- only for admin
//* *********************************
export const getAllCoursesByAdmin = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    void getAllCoursesService(res)
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* *********************************
// Get all courses --- only for admin
//* *********************************
export const deleteCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const coruse = CourseModel.deleteOne({ _id: id })

    // If course not found
    if (coruse === null) {
      next(new ErrorHandler('Course not found.', 404))
      return
    } else { // delete the course data from the redis cache
      await redis.del(id as RedisKey)
    }

    res.status(200).json({
      success: true,
      coruse
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})
