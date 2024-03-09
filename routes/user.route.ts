import { Router } from 'express'

import { ADMIN } from '../utils/constants'
import { authorizeRoles, isAuthenticated } from '../middleware/auth'
import { activateUser, deleteUser, getAllUsers, getUserInfo, loginUser, logoutUser, registerUser, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo, updateUserRole } from '../Controllers/user.controller'

const userRouter = Router()

userRouter.post('/register', registerUser)
userRouter.post('/activateUser', activateUser)
userRouter.post('/socialAuth', socialAuth)

userRouter.get('/refreshToken', updateAccessToken)

userRouter.get('/me', isAuthenticated, getUserInfo)

userRouter.get('/getAllUsers', isAuthenticated, getAllUsers)

userRouter.put('/updateUserInfo', isAuthenticated, updateUserInfo)
userRouter.put('/updateUserPassword', isAuthenticated, updatePassword)
userRouter.post('/updateUserAvatar', isAuthenticated, updateProfilePicture)

userRouter.post('/login', loginUser)
userRouter.get('/logout', isAuthenticated, logoutUser)

userRouter.put('/updateUserRole', isAuthenticated, authorizeRoles(ADMIN), updateUserRole)
userRouter.delete('/deleteUser/:id', isAuthenticated, authorizeRoles(ADMIN), deleteUser)

export default userRouter
