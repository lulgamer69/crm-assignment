const mongoose = require("mongoose");

const LOCAL_PART_PATTERN =
  /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_LABEL_PATTERN = /^[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?$/i;

const isValidEmail = (email) => {
  if (typeof email !== "string" || Buffer.byteLength(email, "utf8") > 254) {
    return false;
  }

  const separator = email.lastIndexOf("@");
  if (separator < 1) {
    return false;
  }

  const localPart = email.slice(0, separator);
  const domainLabels = email.slice(separator + 1).split(".");

  return (
    Buffer.byteLength(localPart, "utf8") <= 64 &&
    LOCAL_PART_PATTERN.test(localPart) &&
    domainLabels.length >= 2 &&
    domainLabels.every(
      (label) => label.length <= 63 && DOMAIN_LABEL_PATTERN.test(label)
    )
  );
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      validate: {
        validator: isValidEmail,
        message: "Please enter a valid email address",
      },
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.statics.isValidEmail = isValidEmail;

module.exports = mongoose.model("User", userSchema);
