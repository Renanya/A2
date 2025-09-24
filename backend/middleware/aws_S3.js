// Adapted from Week 4 Practical: S3 blob storage service (Javascript)
require('dotenv').config();

const S3 = require("@aws-sdk/client-s3");
const S3Presigner = require("@aws-sdk/s3-request-presigner");

// Define useful constants
const prefix = `a2-group4-bucket`
const uploadsBucket = `${prefix}-uploads`;
const outputsBucket = `${prefix}-outputs`;
const thumbnailsBucket = `${prefix}-thumbnails`;
const buckets = [uploadsBucket, outputsBucket, thumbnailsBucket];
const qutUsername = 'n1128353@qut.edu.au';
const qutUsername2 = 'n8319065@qut.edu.au';
const purpose = 'assessment-2';

// Creating a client for sending commands to S3
const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });


//
// Utility Function Read an object from S3 using a Presigned URL
async function readFromBucket(key) {
    try {
        const command = new S3.GetObjectCommand({Bucket: uploadsBucket, Key: key,});
        const presignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600});
        
        console.log('Pre-signed URL to get the object:')
        console.log(presignedURL);

    // fetching the object using an HTTP request to the URL.
    const response = await fetch(presignedURL);
    const object = await response.body;
    } catch (error) {
        console.log(error);
    }
}

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
}

// Write a video to the uploads S3 bucket
async function writeToUploads(key, object) {
    // Create and send a command to write an object
    try {
        const response = await s3Client.send(
            new S3.PutObjectCommand({
                Bucket: uploadsBucket,
                Key: key,
                Body: object
            })
        );
        console.log(response);
    } catch (error) {
        console.log(error);
    }
    return;
};

// Write a video to the outputs S3 bucket
async function writeToOutputs(key, object) {
    // Create and send a command to write an object
    try {
        const response = await s3Client.send(
            new S3.PutObjectCommand({
                Bucket: outputsBucket,
                Key: key,
                Body: object
            })
        );
        console.log(response);
    } catch (error) {
        console.log(error);
    }
    return;
};

// Write a video to the uploads S3 bucket
async function writeToThumbnails(key, object) {
    // Create and send a command to write an object
    try {
        const response = await s3Client.send(
            new S3.PutObjectCommand({
                Bucket: thumbnailsBucket,
                Key: key,
                Body: object
            })
        );
        console.log(response);
    } catch (error) {
        console.log(error);
    }
    return;
};
// Read Video from the specified Bucket (Returns a Buffer)
async function readFromUploads(key) {
    const command = new S3.GetObjectCommand({
        Bucket: uploadsBucket,
        Key: key,   
     })

    try {
        const presignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600} );
        return presignedURL
    } catch (error) {
        throw error
    }
}

// Read Video from the specified Bucket
async function readFromOutputs(key) {
    let videoData;
    // Create and send a command to read an object
    try {
        const response = await s3Client.send(
            new S3.GetObjectCommand({
                Bucket: outputsBucket,
                Key: key,
            })
        );
        videoData = await response.Body.transformToWebStream();

    } catch (error) {
        console.log(error);
    }
    return videoData;
};


// Export Functions for use elsewhere in the application
module.exports = {
    readFromBucket,

    createBuckets,
    writeToUploads,
    writeToOutputs,
    writeToThumbnails,
    readFromUploads,
    readFromOutputs
};