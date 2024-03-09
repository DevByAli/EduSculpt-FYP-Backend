import { app } from './app'
import { configDotenv } from 'dotenv'
import connectDB from './utils/db'
import { v2 as cloudinary } from 'cloudinary'

configDotenv()

// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true
})

// create server
app.listen(process.env.PORT, () => {
  console.log(`Server is listening on port ${process.env.PORT}`)
  void connectDB(process.env.DB_URL)
})
