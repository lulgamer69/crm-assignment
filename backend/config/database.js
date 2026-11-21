const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    const error = new Error("MONGO_URI environment variable is required");
    error.code = "MONGO_URI_REQUIRED";
    throw error;
  }

  const connection = await mongoose.connect(mongoUri);

  console.log(`MongoDB Connected: ${connection.connection.host}`);
};

module.exports = connectDB;
