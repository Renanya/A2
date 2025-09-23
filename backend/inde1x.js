const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

async function main() {
    const client = new S3Client({
        region: 'ap-southeast-2',
        // this makes the client read AWS_* from .env
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
        },
    });

    try {
        const response = await client.send(new ListBucketsCommand({}));
        console.log(response);
    } catch (err) {
        console.error("S3 error:", err);
    }
}

main();
