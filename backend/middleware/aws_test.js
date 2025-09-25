const aws_sdk_helpers = require('./aws_sdk');

// Define Params

// Pattern
async function someAsyncFunction() {
    
    // Retrieve Parameter
    let param;
    try {
        param = await aws_sdk_helpers.getParameterFromSSM("region");
    } catch (error) {
        console.log("Handle error gracefully...");
    }

    // Use Parameter...
    console.log(param);
}

someAsyncFunction();