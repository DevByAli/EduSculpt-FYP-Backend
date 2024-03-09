import mongoose, { type Document, type Model } from 'mongoose'

export interface INotification extends Document {
  title: string
  message: string
  status: string
  userId: string
}

const NotificationSchema = new mongoose.Schema<INotification>({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'unread'
  }
}, { timestamps: true })

const NotificationModel: Model<INotification> = mongoose.model('Notification', NotificationSchema)

export default NotificationModel
