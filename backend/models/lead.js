const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    company: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    source: {
      type: String,
      required: [true, "Lead source is required"],
      enum: {
        values: [
          "Website",
          "Referral",
          "LinkedIn",
          "Social Media",
          "Cold Call",
          "Email",
          "Other",
        ],
        message: "Please select a valid lead source",
      },
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["New", "Contacted", "Qualified", "Lost"],
        message: "Please select a valid lead status",
      },
      default: "New",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
