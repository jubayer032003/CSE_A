const mongoose = require("mongoose");

const getMongoUri = () => process.env.MONGO_URI || process.env.MONGODB_URI;

const connectDB = async () => {
  const mongoUri = getMongoUri();

  if (!mongoUri) {
    console.error(
      "Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in environment."
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.error(
      "Please verify the MongoDB URI, Atlas user credentials, and network access."
    );
    process.exit(1);
  }
};

module.exports = connectDB;