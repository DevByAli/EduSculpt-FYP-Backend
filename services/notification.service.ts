import NotificationModel from '../models/notification.model'

const DeleteNotifications = async (): Promise<void> => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  await NotificationModel.deleteMany({ status: 'read', createdAt: { $lt: thirtyDaysAgo } })
}

export default DeleteNotifications
