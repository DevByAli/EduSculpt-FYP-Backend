import { type NextFunction, type Request, type Response } from 'express'

export default function CatchAsyncError (callback: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    void Promise.resolve(callback(req, res, next)).catch(next)
  }
}
