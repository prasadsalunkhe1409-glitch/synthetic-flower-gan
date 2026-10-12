require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");

const Generation = require("./models/Generation");

const app = express();
const PORT = process.env.PORT || 5000;
const ML_URL =
  process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json({ limit: "1mb" }));

// API health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Flower GAN Express API"
  });
});

// Generate images using the Python model service.
app.post("/api/generate", async (req, res) => {
  const count = Number(req.body.count ?? 4);

  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 16
  ) {
    return res.status(400).json({
      error: "Count must be an integer between 1 and 16."
    });
  }

  try {
    const response = await axios.post(
      `${ML_URL}/generate`,
      { count },
      { timeout: 120000 }
    );

    const result = response.data;

    // Ensure the model service returned the requested count.
    if (
      !Array.isArray(result.images) ||
      result.images.length !== count
    ) {
      throw new Error(
        "The model service returned an unexpected image count."
      );
    }

    const record = await Generation.create({
      count,
      imageSize: result.image_size || 64
    });

    return res.json({
      success: true,
      generationId: record._id,
      count: result.count,
      imageSize: result.image_size,
      images: result.images,
      createdAt: record.createdAt
    });
  } catch (error) {
    console.error(
      "Generation error:",
      error.response?.data || error.message
    );

    return res.status(502).json({
      error:
        "Image generation failed. Check that the Python model service is running."
    });
  }
});

// Latest 10 generation requests.
app.get("/api/history", async (req, res) => {
  try {
    const history = await Generation.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("count imageSize createdAt");

    res.json(history);
  } catch (error) {
    console.error("History error:", error.message);

    res.status(500).json({
      error: "Unable to retrieve generation history."
    });
  }
});

// Start only after MongoDB connects.
async function startServer() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from server/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log("MongoDB connected");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Express API running at http://127.0.0.1:${PORT}`
    );
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});