import { type Document, type Model } from 'mongoose'

interface MonthData {
  month: string
  count: number
}

export async function generateLast12MonthsData<T extends Document> (model: Model<T>): Promise<{ last12Months: MonthData[] }> {
  const last12Months: MonthData[] = []
  const currentDate = new Date()
  currentDate.setDate(currentDate.getDate() + 1)

  const DAYS_IN_MONTH = 30

  for (let i = 11; i >= 0; --i) {
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - i * DAYS_IN_MONTH)
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - DAYS_IN_MONTH)

    const monthYear = endDate.toLocaleString('default', { day: 'numeric', month: 'short', year: 'numeric' })
    const count = await model.countDocuments({
      createdAt: {
        $gte: startDate,
        $lt: endDate
      }
    })
    last12Months.push({ month: monthYear, count })
  }
  return { last12Months }
}
