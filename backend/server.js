const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/database");
const app = require("./app");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    const message =
      error?.code === "MONGO_URI_REQUIRED"
        ? error.message
        : `Database connection failed (${error?.name || "unknown error"}). Check MONGO_URI and MongoDB availability.`;

    console.error("Server startup failed:", message);
    process.exit(1);
    return;
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
