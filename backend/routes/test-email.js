// routes/test-email.js
const express = require('express');
const sgMail = require('@sendgrid/mail');

const router = express.Router();

router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: 'test1@example.com',
      from: process.env.EMAIL_FROM,
      subject,
      text,
    };

    const [resp] = await sgMail.send(msg);

    return res.status(200).json({
      accepted: resp.statusCode === 202,
      statusCode: resp.statusCode,
      requestId:
        resp.headers['x-message-id'] ||
        resp.headers['x-request-id'] ||
        null,
    });
  } catch (err) {
    console.error('SendGrid error:', err.message);
    console.error('Full error details:', err);
    if (err.response?.body?.errors) {
      console.error('SendGrid API errors:', JSON.stringify(err.response.body.errors, null, 2));
      return res.status(500).json({
        error: err.message,
        details: err.response.body.errors
      });
    }
    return res.status(500).json({
      error: err.message,
      details: null
    });
  }
});

module.exports = router;