import { Router } from 'express'
import { ADMIN } from '../utils/constants'
import { CreateLayout, EditLayout, GetLayoutByType } from '../Controllers/layout.controller'
import { authorizeRoles, isAuthenticated } from '../middleware/auth'

const LayoutRouter = Router()

LayoutRouter.get('/getLayoutByType', GetLayoutByType)
LayoutRouter.post('/editLayout', isAuthenticated, authorizeRoles(ADMIN), EditLayout)
LayoutRouter.post('/createLayout', isAuthenticated, authorizeRoles(ADMIN), CreateLayout)

export default LayoutRouter
