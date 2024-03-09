class ErrorHandler extends Error {
  statusCode: number

  constructor (message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode

    // Because the we are using the custom error handler
    // so it does't not know in which file or the line has
    // throw the error. So, we use this line to trace the
    // the path from where the error is throw by the instance
    // of this class.
    Error.captureStackTrace(this, this.constructor)
  }
}

export default ErrorHandler
