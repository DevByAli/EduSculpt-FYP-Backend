import { configDotenv } from 'dotenv'
import nodemailer, { type Transporter } from 'nodemailer'
import ejs from 'ejs'
import path from 'path'

configDotenv()

interface EmailOPtions {
  email: string
  subject: string
  template: string
  data: Record<string, any>
}

const sendMail = async (options: EmailOPtions): Promise<void> => {
  const tarnsporter: Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    service: process.env.SMTP_SERVICE,
    secure: true, // use TLS
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD
    }
  })
  const { email, subject, template, data } = options

  // get the path to the mail template file
  const templatePath = path.join(__dirname, '../mail', template)

  // render the email template with EJS
  const html: string = await ejs.renderFile(templatePath, data)

  const mailOptions = {
    from: process.env.SMPT_MAIL,
    to: email,
    subject,
    html
  }
  await tarnsporter.sendMail(mailOptions)
}

export default sendMail
