import { Router } from 'express'

import { ADMIN } from '../utils/constants'
import { authorizeRoles, isAuthenticated } from '../middleware/auth'
import { addQuestion, addReview, addReviewReply, deleteCourse, editCourse, getAllCourses, getAllCoursesByAdmin, getCourseByValidUser, getSingleCourse, uploadCourse } from '../Controllers/course.controller'

const courseRouter = Router()

courseRouter.get('/getCourses', getAllCourses)
courseRouter.get('/getCourse/:id', getSingleCourse)
courseRouter.get('/getCourseContent/:id', isAuthenticated, getCourseByValidUser)
courseRouter.get('/getAllCourses', isAuthenticated, authorizeRoles(ADMIN), getAllCoursesByAdmin)

courseRouter.put('/editCourse', isAuthenticated, authorizeRoles(ADMIN), editCourse)
courseRouter.post('/createCourse', isAuthenticated, authorizeRoles(ADMIN), uploadCourse)

courseRouter.put('/addQuestion', isAuthenticated, addQuestion)
courseRouter.put('/addAnswer', isAuthenticated, addQuestion)

courseRouter.put('/addReview/:id', isAuthenticated, addReview)
courseRouter.put('/addReviewReply', isAuthenticated, authorizeRoles(ADMIN), addReviewReply)
courseRouter.delete('/deleteCourse/:id', isAuthenticated, authorizeRoles(ADMIN), deleteCourse)

export default courseRouter
