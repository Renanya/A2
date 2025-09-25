// Code Adapted from:
//  - Week 4 Practical: S3 blob storage service (Javascript)
//  - https://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries

require('dotenv').config(__dirname);
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const S3 = require("@aws-sdk/client-s3");
const S3Presigner = require("@aws-sdk/s3-request-presigner");

// Define useful constants
const prefix = `a2-group4-bucket`
const uploadsBucket = `${prefix}-uploads`;
const thumbnailsBucket = `${prefix}-thumbnails`;
const buckets = [uploadsBucket, thumbnailsBucket];
const qutUsername = 'n11288353@qut.edu.au';
const qutUsername2 = 'n8319065@qut.edu.au';
const purpose = 'assessment-2';

// Creating a client for sending commands to S3
const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

// Utility Function: Create the S3 Buckets (used in aws_setup.js)
async function createBuckets() {
    // Utilise Promises to create each bucket and tag them
    await Promise.all(buckets.map(async (bucket) => {
        
        // Command for creating a bucket
        command = new S3.CreateBucketCommand({
            Bucket: bucket
        });

        // Send the command to create the bucket
        try {
            const response = await s3Client.send(command);
            console.log(`Bucket Created: ${bucket}`);
            console.log(response.Location)
        } catch (err) {
            console.log(err);
        }

        // Code to tag S3
        command = new S3.PutBucketTaggingCommand({
            Bucket: bucket,
            Tagging: {
                TagSet: [
                    {
                        Key: 'qut-username',
                        Value: qutUsername,
                    },
                    {
                        Key: 'qut-username2',
                        Value: qutUsername2
                    },
                    {
                        Key: 'purpose',
                        Value: purpose
                    }
                ]
            }
        });

        // Send the command to tag the bucket
        try {
            const response = await s3Client.send(command);
            console.log(`Bucket Tagged: ${bucket}`);
            console.log(response)
        } catch (err) {
            console.log(err);
        } 
    }));
};

// Upload a video from S3 utilising a Presigned URL
async function uploadVideoToS3(fileName, fileType, fileData) {

    // Generate the Presigned URL to upload the video to S3
    const command = new S3.PutObjectCommand(
        {
            Bucket: uploadsBucket,
            Key: fileName,
            ContentType: fileType,
        });
    const presignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600});
    
    return new Promise((resolve, reject) => {
        axios.put(presignedURL, fileData)
        .then(() => {
            resolve();
        })
        .catch((error) => {
            console.log(error.message);
            reject();
        })
    })
}

// Download a video from S3 utilising a Presigned URL
async function downloadVideoFromS3(fileName, filePath) {
    // Generate a Presigned URL to retrieve the file from S3
    const command = new S3.GetObjectCommand({Bucket: uploadsBucket, Key: fileName,});
    const presignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600});

    // Make a request to the Presigned URL and write the response to the output file path
    fs.writeFileSync(filePath, presignedURL);
}

// Export Functions for use elsewhere in the application
module.exports = {
    createBuckets,
    downloadVideoFromS3,
    uploadVideoToS3,
};