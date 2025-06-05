// E:\PROJECTS\pro-suite-app\backend\services\emailService.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface EmailOptions {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; content: Buffer | string }[];
  fromName?: string;  // <-- added optional fromName
}

// Validate essential environment variables
const { EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;

if (!EMAIL_USER || !EMAIL_PASS) {
  throw new Error('❌ Missing EMAIL_USER or EMAIL_PASS in environment variables.');
}

// Create reusable transporter object
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

// Verify SMTP configuration at startup
transporter.verify()
  .then(() => console.log('✅ SMTP connection verified.'))
  .catch((error: unknown) => {
    if (error instanceof Error) {
      console.error('❌ SMTP configuration error:', error.message);
    } else {
      console.error('❌ SMTP configuration error:', error);
    }
  });

// Send email function with dynamic from address
export const sendEmail = async ({ from, to, subject, text, html, attachments, fromName }: EmailOptions) => {
  try {
    console.log(`📧 Sending email to ${to} | Subject: ${subject}`);

    // Dynamically set from address with optional fromName, fallback to EMAIL_FROM or default label
    const fromAddress = fromName
      ? `${fromName} <${EMAIL_USER}>`
      : EMAIL_FROM || `"ProSuite CRM" <${EMAIL_USER}>`;

    const mailOptions = {
      from,
      to,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully. Message ID:', info.messageId);
    return info;
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message || error);
    throw new Error('Failed to send email. Please try again later.');
  }
};
