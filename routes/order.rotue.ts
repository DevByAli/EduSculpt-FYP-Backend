import { Router } from 'express'

import { ADMIN } from '../utils/constants'
import { authorizeRoles, isAuthenticated } from '../middleware/auth'
import { CreateOrder, getAllOrder } from '../Controllers/order.controller'

const OrderRouter = Router()

OrderRouter.post('/createOrder', isAuthenticated, CreateOrder)
OrderRouter.get('/getAllOrders', isAuthenticated, authorizeRoles(ADMIN), getAllOrder)

export default OrderRouter
