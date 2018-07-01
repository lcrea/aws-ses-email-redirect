'use strict';

const AddressTable = require('./AddressTable');
const AWS = require('aws-sdk');
const Nodemailer = require('nodemailer');
const remapTo = require('./remapTo');


/**
 * Environment variables
 */
const bucketName = process.env.BUCKET_NAME;
const defaultFromAddress = process.env.DEFAULT_EMAIL_FROM;
const defaultToAddress = process.env.DEFAULT_EMAIL_TO;
const domain = process.env.DOMAIN;
const errorToAddress = process.env.ERROR_EMAIL_TO;
const redirectAliases = process.env.ALIASES;
const redirectMessage = process.env.REDIRECT_MESSAGE;


/**
 * SES specifics
 * @see {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SES.html}
 */
const ses = new AWS.SES({apiVersion: '2010-12-01'});


/**
 * S3 specifics
 * @see {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html}
 */
const s3 = new AWS.S3({apiVersion: '2006-03-01'});


/**
 * Download the original raw message from S3
 *
 * @param {{Bucket: string, Key: string}} messageS3Url Bucket name and object key
 *
 * @returns {Promise<Buffer>} The raw message data
 * @throws {Error} Error object
 */
const downloadRawMessage = (messageS3Url) => new Promise((resolve, reject) => {
    s3.getObject(messageS3Url, (err, data) => {
        (err) ?
        reject(err)
        :
        resolve(data.Body);
    });
});


/**
 * Delete the original raw message from S3
 *
 * @param {{Bucket: string, Key: string}} messageS3Url Bucket name and object key
 *
 * @returns {Promise<String>} The version ID of the delete marker
 * @throws {Error} Error object
 */
const deleteRawMessage = (messageS3Url) => new Promise((resolve, reject) => {
    s3.deleteObject(messageS3Url, (err, data) => {
        (err) ?
        reject(err)
        :
        resolve(data.VersionId);
    });
});


/**
 * Redirect the original email as an attachment file
 *
 * @param {Buffer} messageRaw Message raw data object
 * @param {Object} event Lambda event object
 *
 * @returns {Promise<String>} Message id of the redirected email
 * @throws {Error} Error object
 */
const sendEmail = (messageRaw, event) => new Promise((resolve, reject) => {
    const originalHeaders = event.Records[0].ses.mail.commonHeaders;
    const originalMessageId = event.Records[0].ses.mail.messageId;

    const address = new AddressTable(domain, defaultFromAddress, defaultToAddress, redirectAliases);
    const redirectTo = remapTo(originalHeaders.to, address);

    // Build the email to redirect
    const redirectEmail = {
        from: address.from,
        replyTo: originalHeaders.from[0],
        subject: originalHeaders.subject,
        text: redirectMessage + originalHeaders.from[0] + "\n\n",
        to: redirectTo,
        attachments: [
            {
                content: messageRaw,
                contentDisposition: 'attachment',
                contentType: 'message/rfc822',
                filename: `${originalMessageId}.eml`,
            },
        ],
    };

    // Set Nodemailer SES transporter
    const transporter = Nodemailer.createTransport({ SES: ses });

    // Send the email
    transporter.sendMail(redirectEmail, (err, info) => {
        (err) ?
        reject(err)
        :
        resolve(info.messageId);
    });
});


/**
 * Send a copy of the error object by email to the administrator
 *
 * @param {Object} errorObj The error object
 * @param {{Bucket: string, Key: string}} messageS3Url Bucket name and object key
 */
const sendErrorEmail = (errorObj, messageS3Url) => {
    const address = new AddressTable(domain, defaultFromAddress, defaultToAddress);

    // Build the email to redirect
    const errorEmail = {
        from: address.from,
        subject: `An error occurred redirecting message ID "${messageS3Url.Key}"`,
        text: `See the attachment for the error's details.

Domain: ${address.domain}
Bucket: ${messageS3Url.Bucket}
Original Message ID / S3 Key: ${messageS3Url.Key}

        `,
        to: errorToAddress,
        attachments: [
            {
                content: JSON.stringify(errorObj, null, 4),
                contentDisposition: 'attachment',
                contentType: 'application/json',
                filename: `error_${messageS3Url.Key}.json`,
            },
        ],
    };

    // Set Nodemailer SES transporter
    const transporter = Nodemailer.createTransport({ SES: ses });

    // Send the email
    transporter.sendMail(errorEmail, (err, info) => {
        (err) ?
        console.error('[ERROR] - Sending email to the administrator - ' + err)
        :
        console.info("[SUCCESS] - Error mail sent with id " + info.messageId);
    });
};


/**
 * Main Lambda function to execute.
 * Examples of the AWS SES Event input are available here:
 * @see {@link https://docs.aws.amazon.com/ses/latest/DeveloperGuide/event-publishing-retrieving-sns-examples.html}
 *
 * @param {Object} event SES event type
 * @param {Object} context
 * @param {function} callback
 */
exports.handler = (event, context, callback) => {
    const messageS3Url = {
        Bucket: bucketName,
        Key: event.Records[0].ses.mail.messageId,
    };

    downloadRawMessage(messageS3Url)
        .then(messageRaw => sendEmail(messageRaw, event))
        .then(messageId => {
            console.info('[SUCCESS] - Mail redirected: ' + messageId);
            deleteRawMessage(messageS3Url);
        })
        .then(versionId => console.info('[SUCCESS] - Set S3 delete mark: ' + versionId))
        .catch(err => {
            console.error('[ERROR] - ' + err);

            /**
             * When the callback is called (explicitly or implicitly) AWS Lambda continues
             * the Lambda function invocation until the event loop is empty.
             * @see {@link https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html}
             */
            callback(err);

            // Send a notification to the administrator with the full error
            if (errorToAddress) {
                // Add input fields to the error
                err['x-ses-event'] = event;
                err['x-s3-requested-object'] = messageS3Url;

                sendErrorEmail(err, messageS3Url);
            }
        });
}
