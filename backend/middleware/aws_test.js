const aws_sdk_helpers = require('./aws_sdk.js');

async function test() {
    let admin;
    try {
        admin = await aws_sdk_helpers.isUserAdmin('n831905');
    } catch (error) {
        console.log("Gracefully handle error...");
    }
    console.log(admin);
    console.log(!admin);
}

test();