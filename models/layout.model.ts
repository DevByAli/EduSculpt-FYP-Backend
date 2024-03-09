import mongoose, { type Model, type Document } from 'mongoose'

export interface FaqItem extends Document {
  question: string
  answer: string
}

export interface Category extends Document {
  title: string
}

export interface BannerImage extends Document {
  public_id: string
  secure_url: string
}

export interface Layout extends Document {
  type: string
  faq: FaqItem[]
  categories: Category[]
  banner: {
    image: BannerImage
    title: string
    subTitle: string
  }
}

const FaqSchema = new mongoose.Schema<FaqItem>({
  question: {
    type: String
  },
  answer: {
    type: String
  }
})

const CategorySchema = new mongoose.Schema<Category>({
  title: {
    type: String
  }
})

const BannerImageSchema = new mongoose.Schema<BannerImage>({
  public_id: {
    type: String
  },
  secure_url: {
    type: String
  }
})

const LayoutSchema = new mongoose.Schema<Layout>({
  type: {
    type: String
  },
  faq: [FaqSchema],
  categories: [CategorySchema],
  banner: {
    image: BannerImageSchema,
    title: {
      type: String
    },
    subTitle: {
      type: String
    }
  }
})

const LayoutModel: Model<Layout> = mongoose.model<Layout>('Layout', LayoutSchema)

export default LayoutModel
