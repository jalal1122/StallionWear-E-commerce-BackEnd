import { config } from "dotenv";

// Load environment variables
config();

// Required environment variables
const requiredEnvVars = [
  "MONGO_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

// Validate environment variables
export const validateEnvVars = () => {
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error("Missing required environment variables:");
    missingVars.forEach((varName) => {
      console.error(`- ${varName}`);
    });
    process.exit(1);
  }

  console.log("✅ All required environment variables are present");
};

export default validateEnvVars;
