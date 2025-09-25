const aws_S3 = require('./aws_sdk');

// Create the S3 Buckets (Ensure you are logged in to AWS using `aws sso login` in the terminal)
aws_S3.createBuckets();