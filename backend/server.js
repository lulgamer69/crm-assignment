const dotenv = require("dotenv");
dotenv.config();

const { getJwtSecret } = require("./config/jwt");
const connectDB = require("./config/database");
const app = require("./app");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    getJwtSecret();
    await connectDB();
  } catch (error) {
    const message =
      error?.code === "AUTH_CONFIGURATION_ERROR"
        ? "JWT_SECRET must be set to a secret of at least 32 bytes."
        : error?.code === "MONGO_URI_REQUIRED"
          ? "MONGO_URI environment variable is required."
          : "Database connection failed. Check MONGO_URI and MongoDB availability.";

    console.error("Server startup failed:", message);
    process.exitCode = 1;
    return null;
  }

  try {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    server.on("error", () => {
      console.error("Server startup failed: HTTP listener could not start.");
      process.exitCode = 1;
    });
    return server;
  } catch {
    console.error("Server startup failed: HTTP listener could not start.");
    process.exitCode = 1;
    return null;
  }
};

if (require.main === module) {
  startServer();
}

module.exports = startServer;
