// Code Adapted from:
//  - Week 4 Practical: S3 blob storage service (Javascript)
//  - https://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries

require('dotenv').config(__dirname);
// require('dotenv').config(__dirname);
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const S3 = require("@aws-sdk/client-s3");
const S3Presigner = require("@aws-sdk/s3-request-presigner");
const SSM = require("@aws-sdk/client-ssm");
const SEC = require("@aws-sdk/client-secrets-manager")
const COG = require("@aws-sdk/client-cognito-identity-provider")

// Define useful constants
const region = 'ap-southeast-2';
const prefix = `a2-group4`
const uploadsBucket = `${prefix}-bucket-uploads`;
const thumbnailsBucket = `${prefix}-bucket-thumbnails`;
const buckets = [uploadsBucket, thumbnailsBucket];
const qutUsername = 'n11288353@qut.edu.au';
const qutUsername2 = 'n8319065@qut.edu.au';
const purpose = 'assessment-2';

// Creating a client for sending commands to S3
const s3Client = new S3.S3Client({ region: region });
const ssmClient = new SSM.SSMClient({region: region});
const secClient = new SEC.SecretsManagerClient({region: region});
const cipClient = new COG.CognitoIdentityProvider({region: region});

// Utility Function: Create the S3 Buckets (used in aws_setup.js)
async function createBuckets() {
    // Utilise Promises to create each bucket and tag them
    await Promise.all(buckets.map(async (bucket) => {
        
        try {
            const command = new S3.CreateBucketCommand({ Bucket: bucket });
            const response = await s3Client.send(command);
            console.log(`Bucket created: ${bucket}`);
            console.log(response.Location);
        } catch (err) {
            if (err.name === "BucketAlreadyOwnedByYou") {
            console.log(`Bucket "${bucket}" already exists (owned by you).`);
            return;
            } else if (err.name === "BucketAlreadyExists") {
            console.error(`Bucket "${bucket}" is taken globally. Pick another name.`);
            throw err;
            } else {
            throw err; // unexpected errors should still bubble up
            }
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

async function uploadThumbnailToS3(fileName, fileType, fileData) {
    // Generate the Presigned URL to upload the video to S3
    const command = new S3.PutObjectCommand(
        {
            Bucket: thumbnailsBucket,
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
// Retrieve a parameter from the AWS Parameter Store
// middleware/aws_sdk.js  (getParameterFromSSM)
async function getParameterFromSSM(parameterName) {
  const fullName = `/${prefix}/${parameterName}`;
  const command = new SSM.GetParameterCommand({
    Name: fullName,
    WithDecryption: true,     // <-- important for SecureString
  });

  try {
    const res = await ssmClient.send(command);
    console.log(`[getParameterFromSSM] OK: ${fullName}`);
    return res.Parameter.Value;
  } catch (err) {
    // Log details so you know exactly what's wrong
    console.error(
      `[getParameterFromSSM] FAIL ${fullName} :: ${err.name} :: ${err.message}`,
      err.$metadata ? { http: err.$metadata.httpStatusCode, requestId: err.$metadata.requestId } : {}
    );
    throw err;  // bubble up so callers can handle it
  }
}


// Retrieve a secret from the AWS Secrets Manager
async function getSecretFromSEC(secretName) {
    // Create the full secret name as stored in Secret Manager
    const full_secret_name = `${prefix}/${secretName}`;
    const command = new SEC.GetSecretValueCommand({SecretId: full_secret_name,
        withDecryption: true,
    });

    return new Promise((resolve, reject) => {
        secClient.send(command)
        .then((response) => {
            console.log(`[getSecretFromSEC] Successfully retrieved Secret: ${secretName}`)
            resolve(response.SecretString);
        })
        .catch((error) => {
            console.log(`[getSecretFromSEC] Failed to retrieve Secret: ${secretName}`);
            reject(error);
        })
    })    
}

async function isUserAdmin(userName) {
    let result;
    
    // Extract the userPoolID Paramater from SSM
    let userPoolID;
    try {
        userPoolID = await getParameterFromSSM("cognito/userPoolID");
    } catch (error) {
        console.log(`[isUserAdmin] Error: ${error.message}`);
    }

    // Create the command to check the Cognito Groups of the User
    const command = new COG.AdminListGroupsForUserCommand(
    {
        UserPoolId: userPoolID,
        Username: userName,
    });

    // Utilise a Promise to handle the command and response
    return new Promise((resolve, reject) => {
        cipClient.send(command)
        .then((response) => {
            const groups = response.Groups.map((group) => group.GroupName);
            const isAdmin = (group) => group === "Admin";
            result = groups.some(isAdmin);
            
            console.log(`[isUserAdmin] Able to check user groups`);
            resolve(result);
        })
        .catch((error) => {
            console.log(`[isUserAdmin] Error: ${error.message}`);

            console.log(`[isUserAdmin] Unable to check user groups`);
            reject(error);
        })
    })
}

// Export Functions for use elsewhere in the application
module.exports = {
    createBuckets,
    downloadVideoFromS3,
    uploadVideoToS3,
    getParameterFromSSM,
    getSecretFromSEC,
    isUserAdmin,
    readFromUploads,
};