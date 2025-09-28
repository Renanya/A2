Assignment 2 - Cloud Services Exercises - Response to Criteria
================================================

Instructions
------------------------------------------------
- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections.  If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed


Overview
------------------------------------------------

- **Name:** Rena Tran
- **Student number:** n11288353
- **Partner name (if applicable):** Matthew Allen
- **Partner Student number (if applicable):** n8319065
- **Application name:** Video Transcoder
- **Two line description:** We implemented an app which stores user’s video files allowing them to be transcoded and downloaded locally using a REST API and ffmpeg.
- **EC2 instance name or ID:** A2-Group4-EC2 i-013ff41529851f101

------------------------------------------------

### Core - First data persistence service

- **AWS service name:**  S3
- **What data is being stored?:** Video Files
- **Why is this service suited to this data?:** S3 provides the ability to store and retrieve objects using key-value pairs, which makes it very suitable for storing large files such as videos.
- **Why is are the other services used not suitable for this data?:** Video files are large, unstructured files that are ill-suited for alternative services, such as relational databases.
- **Bucket/instance/table name:** a2group4-uploadsbucket223 
- **Video timestamp:** 00:00
- **Relevant files:** 
    - /backend/middleware/aws_sdk.js [Line 88, 112, 121, 144]
    - /backend/controller/videoController.js [Line 17, 21, 60, 334]
    - /backend/routes/videoRoutes.js [Line 6, 9]



### Core - Second data persistence service

- **AWS service name:**  PostGreSQL
- **What data is being stored?:** Video Metadata
- **Why is this service suited to this data?:** The video metadata is structured which is great for a SQL database which has a rigid schema.
- **Why is are the other services used not suitable for this data?:** S3 is not designed for the retrieval of structured data such as video metadata which would require additional parsing reducing the capability of the application. 
- **Bucket/instance/table name:** videos
- **Video timestamp:** 00:00
- **Relevant files:**
    - backend/db.js [All]
    - backend/models/video.js [All]
    - /backend/controller/videoController.js [Line 60, 121-134]

### Third data service

- **AWS service name:**  [eg. RDS]
- **What data is being stored?:** [eg video metadata]
- **Why is this service suited to this data?:** [eg. ]
- **Why is are the other services used not suitable for this data?:** [eg. Advanced video search requires complex querries which are not available on S3 and inefficient on DynamoDB]
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
    -

### S3 Pre-signed URLs

- **S3 Bucket names:** a2group4-uploadsbucket223
- **Video timestamp:** 00:57
- **Relevant files:**
    - /backend/middleware/aws_sdk.js [Line 97, 115, 132, 151]
    - /backend/controller/videoController.js [Line 104, 347]
    - /backend/routes/videoRoutes.js [Line 6, 9]

### In-memory cache

- **ElastiCache instance name:**
- **What data is being cached?:** [eg. Thumbnails from YouTube videos obatined from external API]
- **Why is this data likely to be accessed frequently?:** [ eg. Thumbnails from popular YouTube videos are likely to be shown to multiple users ]
- **Video timestamp:**
- **Relevant files:**
    -

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** Transcoded Video Files are stored temporarily after conversion has been actioned so that the user may download them. These files are then discarded once the process is complete or the application is closed.
- **Why is this data not considered persistent state?:** The user’s original file is uploaded to S3, with the application providing the user the ability to convert it to a selected format. Not storing the converted file ensures that any future conversion requests are actioned against the original upload to reduce degradation.
- **How does your application ensure data consistency if the app suddenly stops?:** The application utilises asynchronous functions and promises throughout the implementation to ensure that any operations performed are either executed or discarded. Additionally, the application utilises extensive console log operations and a REST API to keep track and handle operations to assist in debugging and troubleshooting when errors do occur.
- **Relevant files:**
    - /backend/controller/videoController.js [Line 60, 87, 104, 347]

### Graceful handling of persistent connections

- **Type of persistent connection and use:** [eg. server-side-events for progress reporting]
- **Method for handling lost connections:** [eg. client responds to lost connection by reconnecting and indicating loss of connection to user until connection is re-established ]
- **Relevant files:**
    -

### Core - Authentication with Cognito

- **User pool name:** A2-Group4-UserPool
- **How are authentication tokens handled by the client?:** Users are required to authenticate via email and OTP before being allowed to login, setting the IDToken of a user to a cookie. 
- **Video timestamp:** 1:07
- **Relevant files:**
    - backend/controller/userController.js [Line 149-155, 184-189]

### Cognito multi-factor authentication

- **What factors are used for authentication:** OTP Via Google Authentication
- **Video timestamp:** 1:57
- **Relevant files:**
    - backend/controller/userController.js [Line 109-251, 331-366, 371-443]
    - backend/routes/userRoutes.js [Line 9]
    - frontend/src/forms/LoginForm.jsx [Line 14, 50, 130-148, 150-157, 265-290]

### Cognito federated identities

- **Identity providers used:**
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito groups

- **How are groups used to set permissions?:** Admin users are able to ban users by disabling access to their account
- **Video timestamp:** 3:05
- **Relevant files:**
    - backend/middleware/aws_sdk.js [Line 264]
    - backend/controller/userController.js [Line 445-494, 481]
    - frontend/src/pages/BanUserPage.jsx [All]
    - frontend/src/App.js [Line 9, 20]

### Core - DNS with Route53

- **Subdomain**: http://a2-group4.cab432.com
- **Video timestamp:** 3:43

### Parameter store

- **Parameter names:** /a2group4/cognito/clientID, /a2group4/cognito/userPoolID
- **Video timestamp:** 4:07
- **Relevant files:**
    - backend/middleware/aws_sdk [Line 159, 229, 270, 309]
    - backend/controller/userController [Line 14-15, 35-36, 55, 86, 117, 286, 395]
    - backend/controller/videoController [Line 25-26]

### Secrets manager

- **Secrets names:** a2group4/cognito/clientSecret, a2group4/psql
- **Video timestamp:** 4:27
- **Relevant files:**
    - backend/middleware/aws_sdk [Line 181, 310]
    - backend/db.js [Line 9]
    - backend/controller/userController [Line 56]

### Infrastructure as code

- **Technology used:** CloudFormation
- **Services deployed:** S3, Cognito, EC2, Parameter Store
- **Video timestamp:**
- **Relevant files:**
    - Cloudformation.yaml

### Other (with prior approval only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior permission only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -

