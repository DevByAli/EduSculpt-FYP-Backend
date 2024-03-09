import mongoose, { type Document, type Model } from 'mongoose'

export interface IOrder extends Document {
  courseId: string
  userId: string
  paymentInfo: object
}

const OrderSchema = new mongoose.Schema<IOrder>({
  courseId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    requried: true
  },
  paymentInfo: {
    type: Object
  }
}, { timestamps: true })

const OrderModel: Model<IOrder> = mongoose.model('Order', OrderSchema)

export default OrderModel
