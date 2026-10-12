const mongoose = require("mongoose");

const generationSchema = new mongoose.Schema(
  {
    count: {
      type: Number,
      required: true,
      min: 1,
      max: 16
    },
    imageSize: {
      type: Number,
      default: 64
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Generation",
  generationSchema
);