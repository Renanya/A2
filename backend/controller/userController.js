const JWT = require('jsonwebtoken');
const userModel = require('../models/users.js');
const bcrypt = require('bcrypt')
const JWT_SECRET = 'JWT_SECRET' // Should be saved in .env
const saltRounds = 10;

// Import Packages
const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const jwt = require("aws-jwt-verify");
const crypto = require("crypto");

// Import Middleware Functions for AWS
const aws_sdk_helpers = require('../middleware/aws_sdk.js');

////////// Middleware Helper Functions for Paramters
async function getIDVerifier() {
  let idVerifier;

  try {
    const userPoolID = await aws_sdk_helpers.getParameterFromSSM("cognito/userPoolID");
    const clientID = await aws_sdk_helpers.getParameterFromSSM("cognito/clientID");

    idVerifier = jwt.CognitoJwtVerifier.create({
      userPoolId: userPoolID,
      tokenUse: "id",
      clientId: clientID,
    });

    console.log("[getIDVerifier] Successfully retrieved parameters");
  } catch (error) {
    console.log("[getIDVerifier] Unable to retrieve parameters");
  }

  return idVerifier;
};

async function getSecretHash(userName) {
  let hasher;

  try {
    const clientID = await aws_sdk_helpers.getParameterFromSSM("cognito/clientID");
    const secretString = await aws_sdk_helpers.getSecretFromSEC("cognito/clientSecret");
    const clientSecret = JSON.parse(secretString).clientSecret;
    hasher = crypto.createHmac('sha256', clientSecret);
    hasher.update(`${userName}${clientID}`);
    console.log("[secretHash] Successfully retrieved parameters and secrets");
  } catch (error) {
    console.log("[secretHash] Unable to retrieve parameters and secrets");
  }
  return hasher.digest('base64');
};

// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });

    if (!username || !email || !password) 
        return res.status(400).json({ message: 'All fields are required' });
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) 
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) 
        return res.status(400).json({ message: 'Invalid email format' });
    // const hashedPassword = await bcrypt.hash(password, saltRounds);

    // await the async createUser function
    // const userID = await userModel.createUser(username, email, hashedPassword);
    const secretHash = await getSecretHash(username);
    const clientID = await aws_sdk_helpers.getParameterFromSSM("cognito/clientID");
    const command = new Cognito.SignUpCommand({
        ClientId: clientID,
        SecretHash: secretHash,
        Username: username,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
    }); 
    await client.send(command);
    console.log(res);
    res.status(201).json({ message: 'User created successfully'});

  } catch (err) {
    console.error('Register error:', err.message);

    if (err.message === 'Username already exists' || err.message === 'Email already exists') {
      return res.status(409).json({ message: err.message });
    }

    res.status(500).json({ message: 'Server error' });
  }
};

// Log in a user
const login = async (req, res) => {
    const { username, password } = req.body;    
    if (!username || !password) 
        return res.status(400).json({ message: 'All fields are required' });    
    const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
    console.log("Getting auth token");
    
    // Get authentication tokens from the Cognito API using username and password
    const secretHash = await getSecretHash(username);
    const clientID = await aws_sdk_helpers.getParameterFromSSM("cognito/clientID");

    const command = new Cognito.InitiateAuthCommand({
        AuthFlow: Cognito.AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
          SECRET_HASH: secretHash,
        },
        ClientId: clientID,
        
      });  
    respond1 = await client.send(command);            // Requires error handling?
    console.log(res);
    
    // ID Tokens are used to authenticate users to your application
    const IdToken = respond1.AuthenticationResult.IdToken;
    const idVerifier = await getIDVerifier();
    const IdTokenVerifyResult = await idVerifier.verify(IdToken);
    console.log(IdTokenVerifyResult);
                // Set cookie 
    res.cookie("token", IdToken, {
        httpOnly: true,
        secure: false,
        path: '/',
        sameSite: "lax",
    });

    // Successful login (don’t expose token in JSON if using cookies)
    res.json({ message: "Login successful", IdToken });  
    // userModel.getUserByUsername(username, (err, user) => {
    //     if (err) {
    //         return res.status(500).json({ message: "Server error" });
    //     }

    //     if (!user) {
    //         // Always use the same response for invalid creds
    //         return res.status(401).json({ message: "Invalid credentials" });
    //     }

    //     bcrypt.compare(password, user.password, (err, isMatch) => {
    //         if (err) {
    //             return res.status(500).json({ message: "Server error" });
    //         }

    //         if (!isMatch) {
    //             return res.status(401).json({ message: "Invalid credentials" });
    //         }

    //         // Generate JWT
    //         const token = JWT.sign(
    //             { userID: user.id, username: user.username },
    //             JWT_SECRET,
    //             { expiresIn: "24h" }
    //         );

    //         // Set cookie 
    //         res.cookie("token", token, {
    //             httpOnly: true,
    //             secure: false,
    //             path: '/',
    //             sameSite: "lax",
    //         });

    //         // Successful login (don’t expose token in JSON if using cookies)
    //         res.json({ message: "Login successful", userID: user.id, token });
    //     });
    // });
};

// Logout a user
const logout = (req, res) => {
    // Clear the token cookie
    res.clearCookie('token', {
        httpOnly: true, // Ensure it matches the cookie attributes used when setting it
        secure: process.env.NODE_ENV === 'production', // Use the same secure setting
        sameSite: 'Strict', // Match the sameSite attribute
        path: '/' // important to match the original cookie
    });

    // Send a response to indicate successful logout
    res.status(200).json({ message: 'Logged out successfully' });
};

const confirm = async (req, res) => {
    const { username, confirmationCode } = req.body;
    if (!username || !confirmationCode) 
        return res.status(400).json({ message: 'All fields are required' });
        const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
        
        const secretHash = await getSecretHash(username);
        const clientID = await aws_sdk_helpers.getParameterFromSSM("cognito/clientID");
        const command2 = new Cognito.ConfirmSignUpCommand({
          ClientId: clientID,
          SecretHash: secretHash,
          Username: username,
          ConfirmationCode: confirmationCode,
        });
        await client.send(command2);
        res.status(200).json({ message: 'User confirmed successfully' });
      }   

const ban = async (req, res) => {
  // Extract information from the request
  let token = req.cookies?.token;
  const targetUser = req.params.username;
  const auth = req.headers.authorization;

  // Check that the request contains a token...
  if (!token || !auth?.startsWith('Bearer ')) {
    res.status(401).json({message: "Malformed request: Token required."});
  }
  
  // Verify the Token
  token = auth.slice(7);
  let user;
  try {
    const idVerifier = await getIDVerifier();
    user = await idVerifier.verify(token);
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Token.' });
  }

  // Check that the user making the request is an Admin
  const userAdminStatus = await aws_sdk_helpers.isUserAdmin(user);
  if(!userAdminStatus) {
    res.status(401).json({message: "Unauthorized: You do not have sufficient permissions to action this request."})
  }

  // Check that the user making the request isn't the same as the target user,
  // or that the target user is another admin.
  const targetAdminStatus = await aws_sdk_helpers.isUserAdmin(targetUser); 
  if(userName === targetUser || targetAdminStatus) {
    res.status(403).json({message: "Forbidden: You do not have sufficient permissions to ban this user."})
  }

  // Action the Ban
  aws_sdk_helpers.banUser(targetUser)
  .then((response) => {
    if(response) {
      res.status(200).json({message: `Accepted: User was banned`});
    } else {
      res.status(400).json({message: `Rejected: User was not banned`});
    }
  })
  .catch((error) => {
    res.status(500).json({message: error.message});
  })

  return;
}

module.exports = {
    register, 
    login,
    logout,
    confirm,
    ban,
}