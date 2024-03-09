import cors from 'cors'
import { configDotenv } from 'dotenv'
import cookieParser from 'cookie-parser'
import express, { type NextFunction, type Request, type Response } from 'express'

import userRouter from './routes/user.route'
import OrderRouter from './routes/order.rotue'
import ErrorHandler from './utils/ErrorHandler'
import LayoutRouter from './routes/layout.route'
import courseRouter from './routes/course.route'
import ErrorMiddleware from './middleware/error'
import AnalyticsRouter from './routes/analytics.route'
import NotificationRoute from './routes/notification.route'

configDotenv()
export const app = express()

// body parser
app.use(express.json({ limit: '50mb' }))

// cookie parser
app.use(cookieParser())

// cors => cross origin resource sharing
app.use(cors({
  origin: process.env.ORIGIN
}))

// routes
app.use('/api/v1',
  userRouter,
  courseRouter,
  OrderRouter,
  NotificationRoute,
  AnalyticsRouter,
  LayoutRouter)

// testing api
app.get('/test', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is working'
  })
})

app.all('*', (req: Request, res: Response, next: NextFunction) => {
  const err = new ErrorHandler(`Route ${req.originalUrl} not found.`, 404)
  next(err)
})

app.use(ErrorMiddleware)
