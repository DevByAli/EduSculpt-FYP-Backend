import { v2 as cloudinary } from 'cloudinary'
import { type NextFunction, type Request, type Response } from 'express'

import ErrorHandler from '../utils/ErrorHandler'
import CatchAsyncError from '../middleware/catchAsyncErrors'
import { BANNER, CATEGORIES, FAQ, LAYOUT } from '../utils/constants'
import LayoutModel, { type BannerImage, type Category, type FaqItem } from '../models/layout.model'

//* ***********************
// Create Layout
//* ***********************
interface BannerRequestData {
  image: BannerImage
  title: string
  subTitle: string
}

export const CreateLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.body
    const isTypeExist = await LayoutModel.findOne({ type })

    if (isTypeExist !== null) {
      next(new ErrorHandler(`${type} already exists`, 400))
      return
    }

    if (type === BANNER) {
      const { image, title, subTitle } = req.body as BannerRequestData

      // Upload the image on the cloudinary
      const { public_id, secure_url } = await cloudinary.uploader.upload(String(image), {
        folder: LAYOUT
      })

      const banner = {
        image: {
          public_id,
          secure_url
        },
        title,
        subTitle
      }
      await LayoutModel.create(banner)
    } else if (type === FAQ) {
      const { faq } = req.body

      const faqItems = await Promise.all(
        (faq as FaqItem[]).map(async (item: FaqItem) => {
          return {
            question: item.question,
            answer: item.answer
          }
        })
      )

      await LayoutModel.create({ type: FAQ, faq: faqItems })
    } else if (type === CATEGORIES) {
      const { categories } = req.body

      const categoriesItems = await Promise.all(
        (categories as Category[]).map(async (item: Category) => {
          return {
            title: item.title
          }
        })
      )

      await LayoutModel.create({
        type: CATEGORIES,
        categories: categoriesItems
      })
    }

    res.status(200).json({
      success: true,
      message: 'Layout created successfully.'
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* ***********************
// Edit Layout
//* ***********************
export const EditLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.body

    if (type === BANNER) {
      const { image, title, subTitle } = req.body as BannerRequestData

      // Get data of banner from database
      const BannerData = await LayoutModel.findOne({ type: BANNER })

      // If data of banner is present in data then delete the banner image from cloudinary
      if (BannerData !== null) {
        await cloudinary.uploader.destroy(BannerData.banner.image.public_id)
      }

      // Upload the image on the cloudinary
      const { public_id, secure_url } = await cloudinary.uploader.upload(String(image), {
        folder: LAYOUT
      })

      const banner = {
        image: {
          public_id,
          secure_url
        },
        title,
        subTitle
      }
      await LayoutModel.findByIdAndUpdate(BannerData?._id, { banner })
    } else if (type === FAQ) {
      const { faq } = req.body
      const FaqData = await LayoutModel.findOne({ type: FAQ })

      const faqItems = await Promise.all(
        (faq as FaqItem[]).map(async (item: FaqItem) => {
          return {
            question: item.question,
            answer: item.answer
          }
        })
      )

      await LayoutModel.findByIdAndUpdate(FaqData?._id, { type: FAQ, faq: faqItems })
    } else if (type === CATEGORIES) {
      const { categories } = req.body

      // Get all the data of the categories
      const CategoriesData = await LayoutModel.findOne({ type: CATEGORIES })

      const CategoriesItems = await Promise.all(
        (categories as Category[]).map(async (item: Category) => {
          return {
            title: item.title
          }
        })
      )

      await LayoutModel.findByIdAndUpdate(CategoriesData?._id, {
        type: CATEGORIES,
        categories: CategoriesItems
      })
    }

    res.status(200).json({
      success: true,
      message: 'Layout updated successfully.'
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})

//* *******************
// get layout by type
//* *******************
export const GetLayoutByType = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.body.type
    const layout = await LayoutModel.findOne({ type })

    res.status(200).json({
      success: true,
      layout
    })
  } catch (error: any) {
    next(new ErrorHandler(String(error.message), 500))
  }
})
