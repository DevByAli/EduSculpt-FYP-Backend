import { Router } from 'express'
import { ADMIN } from '../utils/constants'
import { authorizeRoles, isAuthenticated } from '../middleware/auth'
import { getCoursesAnalytics, getOrderAnalytics, getUserAnalytics } from '../Controllers/analytics.controller'

const AnalyticsRouter = Router()

AnalyticsRouter.get('/getUserAnalytics', isAuthenticated, authorizeRoles(ADMIN), getUserAnalytics)
AnalyticsRouter.get('/getCoursesAnalytics', isAuthenticated, authorizeRoles(ADMIN), getCoursesAnalytics)
AnalyticsRouter.get('/getOrderAnalytics', isAuthenticated, authorizeRoles(ADMIN), getOrderAnalytics)

export default AnalyticsRouter
