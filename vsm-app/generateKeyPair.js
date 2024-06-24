const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const encryptData = (data, key, iv) => {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

// Decryption
const decryptData = (encryptedData, key, iv) => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

function generateKeyPair() {
  const key = crypto.randomBytes(32); // 256-bit key
  const iv = crypto.randomBytes(16); // Initialization vector
  return { key, iv };
}

/**
 * Function to update the PEM values in a .env.local file
 * @param {string} pemValue - The value to set for public and private key
 */
function updateSymmetricKey(key) {
  console.log('Setting symmetric key in .env.local')
  const envPath = path.resolve(__dirname, ".env.local");

  // Read the current content of the .env file
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  // Split the content into lines
  let envLines = envContent.split("\n");

  const keys = {
    KEY: key.toString("hex"),
  };

  Object.entries(keys).forEach(([key, value]) => {
    const sanitizedValue = value.replaceAll("\r\n", "");
    // Flag to check if PEM is found
    let keyFound = false;
    // Update the PEM value if found
    envLines = envLines.map((line) => {
      if (line.startsWith(`${key}=`)) {
        keyFound = true;
        return `${key}="${sanitizedValue}"`;
      }
      return line;
    });

    // If PEM was not found, add it to the file
    if (!keyFound) {
      envLines.push(`${key}="${sanitizedValue}"`);
    }

    // Join the lines back and write to the .env file
    envContent = envLines.join("\n");
    fs.writeFileSync(envPath, envContent, "utf8");
  });
  console.log("You are all set!");
}

async function execute() {
  const userId = "user123";
  const data = JSON.stringify({ userId });

  try {
    const { key, iv } = await generateKeyPair();


    const encryptedData = encryptData(data, key, iv);
    const decryptedData = decryptData(encryptedData.toLowerCase(), key, iv);
    console.log("EncryptedData", encryptedData.toLowerCase());
    console.log("DecryptedData:", decryptedData);
    if (data === decryptedData) {
      updateSymmetricKey(key);
      console.log("Data is the same after encryption and decryption");
    } else {
      console.error("Data is not the same after encryption and decryption");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

execute();
