'use server';

import Mailjet from 'node-mailjet';

interface SendEmailParams {
  to: string;
  toName: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, toName, subject, html }: SendEmailParams) {
  if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
    throw new Error('Mailjet API keys are not configured in environment variables.');
  }
  if (!process.env.MJ_SENDER_EMAIL || !process.env.MJ_SENDER_NAME) {
    throw new Error('Mailjet sender email or name is not configured.');
  }

  const mailjet = new Mailjet({
    apiKey: process.env.MJ_APIKEY_PUBLIC,
    apiSecret: process.env.MJ_APIKEY_PRIVATE,
  });

  const request = mailjet
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: {
            Email: process.env.MJ_SENDER_EMAIL,
            Name: process.env.MJ_SENDER_NAME,
          },
          To: [
            {
              Email: to,
              Name: toName,
            },
          ],
          Subject: subject,
          HTMLPart: html,
        },
      ],
    });

  try {
    const result = await request;
    console.log('Mailjet API response status:', result.response.status, result.response.statusText);
    
    const messageResult = (result.body as any)?.Messages?.[0];
    if (messageResult?.Status !== 'success') {
        console.error('Mailjet sending failed:', messageResult);
        throw new Error(`Mailjet failed to send email. Status: ${messageResult?.Status}`);
    }
    return result.body;
  } catch (err) {
    console.error('Error sending email via Mailjet:', err);
    const mailjetError = err as any;
    if (mailjetError.statusCode) {
        throw new Error(`Mailjet API Error: ${mailjetError.statusCode} - ${mailjetError.message || mailjetError.ErrorMessage}`);
    }
    throw err;
  }
}
