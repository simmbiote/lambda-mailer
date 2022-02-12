require("dotenv").config();

const nodemailer = require("nodemailer");

// const ssm = require("@aws-cdk/aws-ssm");

// CORS Handling
const headers = {
  "Access-Control-Allow-Origin": `${process.env.ALLOWED_ORIGIN ?? "*"}`,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = function (event, context, callback) {
  // respond to OPTIONS method

  if (event.routeKey && event.routeKey.includes("OPTIONS")) {
    const response = {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
      body: "Everything is fine",
    };
    callback(null, response);
    return;
  }

  // Default default values if not sent in the body request
  let { body } = event;
  try {
    body = JSON.parse(body);
  } catch (e) {
    console.error("Couldn't parse");
  }
  const {
    name,
    message,
    isTest,
    email,
    subject = process.env.EMAIL_SUBJECT ?? "Website enquiry",
  } = body;

  const mailConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_IS_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  const transporter = nodemailer.createTransport(mailConfig);

  if (!message) {
    const response = {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "No message body provided",
        success: false,
      }),
    };
    callback(null, response);
    return;
  }

  if (!email) {
    const response = {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "No email sender.", success: false }),
    };
    callback(null, response);
    return;
  }

  const fields = Object.keys(body);

  let html = `<h3>Website enquiry</h3>`;

  const ignoreFields = ["isTest", "subject"];
  const spamFlags = ["</", "/>", "href=", "src="];

  for (let field of fields) {
    if (ignoreFields.includes(field)) continue;

    for (let spamFlag of spamFlags) {
      if (`${body[field]}`.indexOf(spamFlag) > -1) {
        const response = {
          statusCode: 403,

          headers,
          body: JSON.stringify({ message: "Spam detected", success: false }),
        };
        callback(null, response);
        return;
      }
    }

    html += `<b>${field}</b>`;
    html += `<div>${body[field]}</div><br />`;
  }

  if (isTest) {
    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify({ body, fields, html, success: true }),
    };
    callback(null, response);
    return;
  }

  const mailOptions = {
    from: `${name ?? ""} <${process.env.EMAIL_FROM_ADDRESS}>`,
    replyTo: email,
    to: process.env.EMAIL_TO_ADDRESS,
    subject,
    html,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      const response = {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: error.message,
          mailConfig,
        }),
      };
      callback(null, response);
      return;
    }
    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Email processed succesfully!`,
      }),
    };
    callback(null, response);
  });
};
