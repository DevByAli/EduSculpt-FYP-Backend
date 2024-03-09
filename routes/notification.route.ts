import { Router } from 'express'

import { authorizeRoles, isAuthenticated } from '../middleware/auth'
import { getNotification, updateNotificationStatus } from '../Controllers/notification.controller'

const NotificationRoute = Router()

NotificationRoute.get('/getAllNotification', isAuthenticated, authorizeRoles('admin'), getNotification)
NotificationRoute.put('/updateNotificationStatus', isAuthenticated, authorizeRoles('admin'), updateNotificationStatus)

export default NotificationRoute
