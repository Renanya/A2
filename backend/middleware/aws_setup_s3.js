const aws_sdk_helpers = require('./aws_sdk');

// Create the S3 Buckets (Ensure you are logged in to AWS using `aws sso login` in the terminal)
aws_sdk_helpers.createBuckets();