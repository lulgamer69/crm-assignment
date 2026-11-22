const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createAuthError, getJwtSecret } = require("../config/jwt");
const User = require("../models/user");

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;
const PASSWORD_HASH_ROUNDS = 12;
const JWT_EXPIRY = "1h";
const DUMMY_PASSWORD_HASH =
  "$2b$12$tq1/0XU2FCjCe7KKGTtde.W8YQrD1LGf4HrVNRg9nnB/RdN.a6JeS";
const INVALID_LOGIN_PASSWORD = "invalid-login-password-input";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const isValidPassword = (password) =>
  typeof password === "string" &&
  Array.from(password).filter((character) => !/\s/u.test(character)).length >=
    PASSWORD_MIN_LENGTH &&
  Buffer.byteLength(password, "utf8") <= PASSWORD_MAX_BYTES;

const validateSignupInput = (input) => {
  const data =
    input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const { name, email, password } = data;

  if (typeof name !== "string" || !name.trim()) {
    throw createAuthError("AUTH_VALIDATION_ERROR", 400, "Name is required");
  }

  const normalizedEmail = normalizeEmail(email);
  if (!User.isValidEmail(normalizedEmail)) {
    throw createAuthError("AUTH_VALIDATION_ERROR", 400, "A valid email is required");
  }

  if (!isValidPassword(password)) {
    throw createAuthError(
      "AUTH_VALIDATION_ERROR",
      400,
      `Password must contain at least ${PASSWORD_MIN_LENGTH} non-whitespace characters and no more than ${PASSWORD_MAX_BYTES} UTF-8 bytes`
    );
  }

  return { name: name.trim(), email: normalizedEmail, password };
};

const createToken = (userId, secret) =>
  jwt.sign({}, secret, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: JWT_EXPIRY,
  });

const toPublicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
});

const createAuthResult = (user, secret) => ({
  user: toPublicUser(user),
  token: createToken(user._id, secret),
});

const createInvalidCredentialsError = () =>
  createAuthError(
    "AUTH_INVALID_CREDENTIALS",
    401,
    INVALID_CREDENTIALS_MESSAGE
  );

const signup = async (input) => {
  const secret = getJwtSecret();
  const { name, email, password } = validateSignupInput(input);
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

  let user;
  try {
    user = await User.create({ name, email, passwordHash });
  } catch (error) {
    if (error?.code === 11000) {
      throw createAuthError(
        "AUTH_EMAIL_EXISTS",
        409,
        "An account with this email already exists"
      );
    }

    throw error;
  }

  return createAuthResult(user, secret);
};

const login = async (input) => {
  const secret = getJwtSecret();
  const data =
    input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const normalizedEmail = normalizeEmail(data.email);

  if (!User.isValidEmail(normalizedEmail)) {
    throw createInvalidCredentialsError();
  }

  const password = data.password;
  const passwordIsValid = isValidPassword(password);
  const passwordForComparison = passwordIsValid
    ? password
    : INVALID_LOGIN_PASSWORD;
  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordHash"
  );
  const passwordHash = user?.passwordHash || DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(
    passwordForComparison,
    passwordHash
  );

  if (!passwordIsValid || !user || !passwordMatches) {
    throw createInvalidCredentialsError();
  }

  return createAuthResult(user, secret);
};

const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw createAuthError("AUTH_UNAUTHORIZED", 401, "Authentication required");
  }
  return toPublicUser(user);
};

const updateProfile = async (userId, input) => {
  const data = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  if (Object.keys(data).some((key) => key !== "name")) {
    throw createAuthError("AUTH_VALIDATION_ERROR", 400, "Only the name can be updated");
  }
  if (typeof data.name !== "string" || !data.name.trim()) {
    throw createAuthError("AUTH_VALIDATION_ERROR", 400, "Name is required");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { name: data.name.trim() },
    { returnDocument: "after", runValidators: true }
  );
  if (!user) {
    throw createAuthError("AUTH_UNAUTHORIZED", 401, "Authentication required");
  }
  return toPublicUser(user);
};

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile,
};
