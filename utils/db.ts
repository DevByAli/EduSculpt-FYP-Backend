import mongoose from 'mongoose' // Import Connection type

const connectDB = async (dbUrl: string | undefined): Promise<void> => {
  try {
    if (dbUrl !== undefined) {
      console.log('Database connecting...')
      await mongoose.connect(dbUrl).then((data: typeof mongoose) => {
        console.log(`Database connected with ${data.connection.host}`)
      })
    }
  } catch (error: any) {
    console.log(error.message)

    // Retry to connect with database
    console.log('Database connection retrying...')
    setTimeout((): void => {
      void connectDB(dbUrl)
    }, 5000)
  }
}

export default connectDB
