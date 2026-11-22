const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const authService = require("../services/authService");

const TEST_SECRET = "a-test-secret-that-is-at-least-32-bytes-long";
const VALID_PASSWORD = "a-valid-password";

const restorePropertyAfter = (t, target, property) => {
  const original = target[property];
  t.after(() => {
    target[property] = original;
  });
};

const setJwtSecretForTest = (t, secret = TEST_SECRET) => {
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  t.after(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });
};

const assertOperationalError = (error, { code, statusCode, message }) =>
  error.name === "AuthError" &&
  error.isOperational === true &&
  error.code === code &&
  error.statusCode === statusCode &&
  error.message === message;

test("User schema normalizes unique email and excludes password hashes by default", () => {
  const emailPath = User.schema.path("email");
  const passwordHashPath = User.schema.path("passwordHash");
  const emailIndex = User.schema
    .indexes()
    .find(([keys, options]) => keys.email === 1 && options.unique === true);

  assert.equal(emailPath.options.lowercase, true);
  assert.equal(emailPath.options.trim, true);
  assert.equal(passwordHashPath.options.select, false);
  assert.ok(emailIndex, "email should have a unique MongoDB index declared");
});

test("signup hashes the password and returns a one-hour token with the user subject", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "create");

  let createdUser;
  User.create = async (userData) => {
    createdUser = { _id: "user-123", ...userData };
    return createdUser;
  };

  const result = await authService.signup({
    name: "  Payal Goswami  ",
    email: " PAYAL+lead@Example.COM ",
    password: VALID_PASSWORD,
  });

  assert.equal(createdUser.name, "Payal Goswami");
  assert.equal(createdUser.email, "payal+lead@example.com");
  assert.notEqual(createdUser.passwordHash, VALID_PASSWORD);
  assert.equal(await bcrypt.compare(VALID_PASSWORD, createdUser.passwordHash), true);
  assert.deepEqual(result.user, {
    id: "user-123",
    name: "Payal Goswami",
    email: "payal+lead@example.com",
  });
  assert.equal("passwordHash" in result.user, false);
  assert.equal(JSON.stringify(result).includes(createdUser.passwordHash), false);

  const claims = jwt.verify(result.token, TEST_SECRET);
  assert.equal(claims.sub, "user-123");
  assert.equal(claims.exp - claims.iat, 60 * 60);
});

test("signup rejects malformed email addresses with a typed validation error", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "create");
  User.create = async () => assert.fail("invalid email must not reach persistence");

  const malformedEmails = [
    "plain-address",
    "missing-at.example.com",
    "one@@example.com",
    "first..last@example.com",
    "first name@example.com",
    "first@-example.com",
    "first@example-.com",
    "first@example..com",
    "first@example.com.",
    `${"a".repeat(65)}@example.com`,
    `first@${"a".repeat(64)}.com`,
  ];

  for (const email of malformedEmails) {
    await assert.rejects(
      authService.signup({ name: "Test", email, password: VALID_PASSWORD }),
      (error) =>
        assertOperationalError(error, {
          code: "AUTH_VALIDATION_ERROR",
          statusCode: 400,
          message: "A valid email is required",
        })
    );
  }

  assert.equal(User.isValidEmail("first.last+tag@sub-domain.example.com"), true);
  assert.equal(User.isValidEmail("x@y.co"), true);
});

test("signup rejects whitespace-only name, email, or password", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "create");
  User.create = async () => assert.fail("invalid input must not reach persistence");

  const invalidInputs = [
    { name: "   ", email: "test@example.com", password: VALID_PASSWORD },
    { name: "Test", email: "   ", password: VALID_PASSWORD },
    { name: "Test", email: "test@example.com", password: "        " },
  ];

  for (const input of invalidInputs) {
    await assert.rejects(
      authService.signup(input),
      (error) => error.name === "AuthError" && error.statusCode === 400
    );
  }
});

test("signup rejects passwords over 72 UTF-8 bytes, including collisions after byte 72", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "create");
  User.create = async () => assert.fail("oversized password must not reach persistence");

  const sharedPrefix = "a".repeat(72);
  const passwords = [
    `${sharedPrefix}x`,
    `${sharedPrefix}y`,
    `${"😀".repeat(18)}a`,
  ];

  assert.equal(Buffer.byteLength("😀".repeat(18), "utf8"), 72);
  for (const password of passwords) {
    assert.ok(Buffer.byteLength(password, "utf8") > 72);
    await assert.rejects(
      authService.signup({ name: "Test", email: "test@example.com", password }),
      (error) => error.code === "AUTH_VALIDATION_ERROR" && error.statusCode === 400
    );
  }
});

test("signup converts MongoDB duplicate-key errors into a safe conflict error", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "create");
  User.create = async () => {
    const error = new Error("duplicate key details and database information");
    error.code = 11000;
    throw error;
  };

  await assert.rejects(
    authService.signup({
      name: "Test",
      email: "test@example.com",
      password: VALID_PASSWORD,
    }),
    (error) =>
      assertOperationalError(error, {
        code: "AUTH_EMAIL_EXISTS",
        statusCode: 409,
        message: "An account with this email already exists",
      })
  );
});

test("login returns a token for valid credentials and generic errors for failures", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "findOne");
  restorePropertyAfter(t, bcrypt, "compare");

  const originalCompare = bcrypt.compare.bind(bcrypt);
  const comparisons = [];
  bcrypt.compare = async (password, hash) => {
    comparisons.push({ password, hash });
    return originalCompare(password, hash);
  };
  const passwordHash = await bcrypt.hash(VALID_PASSWORD, 4);
  const user = {
    _id: "user-456",
    name: "Test User",
    email: "test@example.com",
    passwordHash,
  };
  User.findOne = ({ email }) => ({
    select: async () => (email === user.email ? user : null),
  });

  const result = await authService.login({
    email: " TEST@example.com ",
    password: VALID_PASSWORD,
  });
  assert.equal(jwt.verify(result.token, TEST_SECRET).sub, "user-456");
  assert.equal("passwordHash" in result.user, false);
  assert.equal(JSON.stringify(result).includes(passwordHash), false);

  for (const input of [
    { email: "test@example.com", password: "wrong-password" },
    { email: "missing@example.com", password: VALID_PASSWORD },
  ]) {
    await assert.rejects(
      authService.login(input),
      (error) =>
        assertOperationalError(error, {
          code: "AUTH_INVALID_CREDENTIALS",
          statusCode: 401,
          message: "Invalid email or password",
        })
    );
  }

  assert.equal(comparisons.length, 3);
  assert.equal(comparisons[0].hash, passwordHash);
  assert.equal(comparisons[1].hash, passwordHash);
  assert.equal(comparisons[2].password, VALID_PASSWORD);
  assert.equal(comparisons[2].hash.length, 60);
  assert.equal(bcrypt.getRounds(comparisons[2].hash), 12);
});

test("login performs a dummy bcrypt comparison when the email is unknown", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "findOne");
  restorePropertyAfter(t, bcrypt, "compare");

  let compareCalls = 0;
  let comparedHash;
  User.findOne = () => ({ select: async () => null });
  bcrypt.compare = async (_password, hash) => {
    compareCalls += 1;
    comparedHash = hash;
    return false;
  };

  await assert.rejects(
    authService.login({ email: "unknown@example.com", password: VALID_PASSWORD }),
    (error) => error.message === "Invalid email or password"
  );

  assert.equal(compareCalls, 1);
  assert.equal(comparedHash.length, 60);
  assert.equal(bcrypt.getRounds(comparedHash), 12);
});

test("login rejects malformed email before database lookup", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "findOne");
  let findOneCalled = false;
  User.findOne = () => {
    findOneCalled = true;
    return { select: async () => null };
  };

  await assert.rejects(
    authService.login({ email: "malformed@@example.com", password: VALID_PASSWORD }),
    (error) =>
      assertOperationalError(error, {
        code: "AUTH_INVALID_CREDENTIALS",
        statusCode: 401,
        message: "Invalid email or password",
      })
  );
  assert.equal(findOneCalled, false);
});

test("login compares invalid password inputs for valid email shapes and still rejects them", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "findOne");
  restorePropertyAfter(t, bcrypt, "compare");

  const user = {
    _id: "user-789",
    name: "Test User",
    email: "test@example.com",
    passwordHash: await bcrypt.hash(VALID_PASSWORD, 4),
  };
  const compareInputs = [];
  let findOneCalls = 0;
  User.findOne = () => {
    findOneCalls += 1;
    return { select: async () => user };
  };
  bcrypt.compare = async (password, hash) => {
    compareInputs.push({ password, hash });
    return true;
  };

  const commonPrefix = "a".repeat(72);
  const invalidPasswords = [
    undefined,
    null,
    12345678,
    "short",
    "        ",
    `${commonPrefix}x`,
    `${commonPrefix}y`,
  ];

  for (const password of invalidPasswords) {
    await assert.rejects(
      authService.login({ email: "test@example.com", password }),
      (error) =>
        assertOperationalError(error, {
          code: "AUTH_INVALID_CREDENTIALS",
          statusCode: 401,
          message: "Invalid email or password",
        })
    );
  }

  assert.equal(findOneCalls, invalidPasswords.length);
  assert.equal(compareInputs.length, invalidPasswords.length);
  assert.ok(
    compareInputs.every(
      ({ password, hash }) =>
        password === "invalid-login-password-input" && hash === user.passwordHash
    )
  );
});

test("unexpected database errors propagate without being converted or exposed", async (t) => {
  setJwtSecretForTest(t);
  restorePropertyAfter(t, User, "findOne");
  restorePropertyAfter(t, User, "create");

  const databaseError = new Error(
    "database internal detail mongodb://user:secret@host/db"
  );
  User.findOne = () => ({
    select: async () => {
      throw databaseError;
    },
  });

  await assert.rejects(
    authService.login({ email: "test@example.com", password: VALID_PASSWORD }),
    (error) => error === databaseError
  );

  User.create = async () => {
    throw databaseError;
  };
  await assert.rejects(
    authService.signup({
      name: "Test",
      email: "test@example.com",
      password: VALID_PASSWORD,
    }),
    (error) => error === databaseError
  );
});

test("signup and login fail safely when JWT_SECRET is missing or too short", async (t) => {
  const original = process.env.JWT_SECRET;
  t.after(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  for (const secret of [undefined, "short"]) {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;

    await assert.rejects(
      authService.signup({
        name: "Test",
        email: "test@example.com",
        password: VALID_PASSWORD,
      }),
      (error) =>
        assertOperationalError(error, {
          code: "AUTH_CONFIGURATION_ERROR",
          statusCode: 500,
          message: "Authentication is not configured",
        })
    );
    await assert.rejects(
      authService.login({ email: "test@example.com", password: VALID_PASSWORD }),
      (error) =>
        assertOperationalError(error, {
          code: "AUTH_CONFIGURATION_ERROR",
          statusCode: 500,
          message: "Authentication is not configured",
        })
    );
  }
});
