const aws_sdk_helpers = require('./aws_sdk.js');

async function test() {
    let result;
    try {
        result = await aws_sdk_helpers.banUser('123123');
    } catch (error) {
        console.log("Gracefully handle error...");
    }
    console.log(result)
}

test();