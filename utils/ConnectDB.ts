import mongoose from "mongoose";

const ensureReferralCodeIndex = async () => {
  const collection = mongoose.connection.db?.collection("users");
  if (!collection) return;

  try {
    await collection.dropIndex("referralCode_1");
    console.log("Dropped legacy referralCode index");
  } catch (error: any) {
    if (error?.code !== 26) {
      console.warn("Unable to drop legacy referralCode index:", error.message);
    }
  }

  try {
    await collection.createIndex(
      { referralCode: 1 },
      { unique: true, sparse: true, name: "referralCode_1" }
    );
    console.log("Ensured referralCode index is sparse");
  } catch (error: any) {
    if (error?.code !== 85) {
      console.warn("Unable to ensure referralCode index:", error.message);
    }
  }
};

export const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    await ensureReferralCodeIndex();
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    throw error; // propagate the error
  }
};