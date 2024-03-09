import { type NextFunction, type Request, type Response } from 'express'
import CatchAsyncError from '../middleware/catchAsyncErrors'
import OrderModel from '../models/order.model'

//* ****************
// Create New Order
//* ****************
export const NewOrder = CatchAsyncError(async (req: Request, res: Response, _next: NextFunction) => {
  const order = await OrderModel.create(req.data)

  res.status(201).json({
    success: true,
    order
  })
})

// get all orders
export const getAllOrdersService = async (res: Response): Promise<void> => {
  const orders = await OrderModel.find({ createdAt: -1 })
  res.status(201).json({
    success: true,
    user: orders
  })
}
