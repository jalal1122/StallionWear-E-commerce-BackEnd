import app from "./app";
import connectDB from "./configs/db.config.js";
import { config } from "dotenv";

// config the environment variables
config();

// get the port from environment variables or use default
const PORT = process.env.PORT || 3000;

// Start the server and connect to the database
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
