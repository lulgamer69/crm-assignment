const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../app");
const Lead = require("../models/lead");
const User = require("../models/user");

const TEST_SECRET = "isolated-api-test-secret-with-at-least-32-bytes";
const VALID_PASSWORD = "test-account-password";
const VALID_LEAD = {
  name: "Morgan Lee",
  email: "morgan@example.com",
  phone: "555-0100",
  company: "Example Co",
  source: "Website",
  status: "New",
  notes: "Created by an isolated API test",
};

let mongoServer;
let originalMongoUri;
let originalJwtSecret;

const isLoopbackMongoUri = (uri) => {
  try {
    const hostname = new URL(uri).hostname;
    return ["127.0.0.1", "localhost", "[::1]", "::1"].includes(hostname);
  } catch {
    return false;
  }
};

before(async () => {
  originalMongoUri = process.env.MONGO_URI;
  originalJwtSecret = process.env.JWT_SECRET;
  mongoServer = await MongoMemoryServer.create();
  const testMongoUri = mongoServer.getUri();
  assert.equal(isLoopbackMongoUri(testMongoUri), true);
  process.env.MONGO_URI = testMongoUri;
  process.env.JWT_SECRET = TEST_SECRET;

  await mongoose.connect(process.env.MONGO_URI, { dbName: "leadflow_test" });
  await Promise.all([User.init(), Lead.init()]);
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Lead.deleteMany({})]);
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
  if (originalMongoUri === undefined) delete process.env.MONGO_URI;
  else process.env.MONGO_URI = originalMongoUri;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

const register = (email, password = VALID_PASSWORD, extra = {}) =>
  request(app)
    .post("/api/auth/signup")
    .send({ name: "Test User", email, password, ...extra });

const createUser = async (email) =>
  User.create({
    name: "Test User",
    email,
    passwordHash: await bcrypt.hash(VALID_PASSWORD, 4),
  });

const tokenFor = (userId, options = {}) =>
  jwt.sign({}, TEST_SECRET, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: "1h",
    ...options,
  });

test("signup and login return safe success responses", async () => {
  const signup = await register("PAYAL+crm@example.com");

  assert.equal(signup.status, 201);
  assert.equal(signup.body.success, true);
  assert.equal(signup.body.message, "Account created successfully");
  assert.equal(signup.body.data.user.email, "payal+crm@example.com");
  assert.equal("password" in signup.body.data.user, false);
  assert.equal("passwordHash" in signup.body.data.user, false);
  assert.equal(JSON.stringify(signup.body).includes(VALID_PASSWORD), false);

  const user = await User.findById(signup.body.data.user.id).select(
    "+passwordHash"
  );
  assert.notEqual(user.passwordHash, VALID_PASSWORD);
  assert.equal(await bcrypt.compare(VALID_PASSWORD, user.passwordHash), true);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: " PAYAL+crm@example.com ", password: VALID_PASSWORD });

  assert.equal(login.status, 200);
  assert.equal(login.body.success, true);
  assert.equal(login.body.data.user.id, signup.body.data.user.id);
  assert.equal("passwordHash" in login.body.data.user, false);
  assert.equal(JSON.stringify(login.body).includes(user.passwordHash), false);
  assert.equal(jwt.verify(login.body.data.token, TEST_SECRET).sub, user.id);
});

test("signup handles duplicate normalized emails safely", async () => {
  assert.equal((await register("same@example.com")).status, 201);

  const duplicate = await register(" SAME@example.com ");
  assert.equal(duplicate.status, 409);
  assert.deepEqual(duplicate.body, {
    success: false,
    message: "An account with this email already exists",
  });
  assert.equal(JSON.stringify(duplicate.body).includes("E11000"), false);
});

test("signup validates passwords, names, emails, and request bodies", async () => {
  for (const password of ["short", "        ", `${"x".repeat(72)}y`]) {
    const response = await register("valid@example.com", password);
    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal("password" in response.body, false);
  }

  for (const body of [
    { name: "   ", email: "valid@example.com", password: VALID_PASSWORD },
    { name: "Test", email: "not-an-email", password: VALID_PASSWORD },
    null,
    [],
  ]) {
    const response = await request(app).post("/api/auth/signup").send(body);
    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys(response.body).sort(), ["message", "success"]);
  }
});

test("login failures use a generic response for unknown users and bad passwords", async () => {
  const user = await createUser("known@example.com");
  const failedAttempts = [
    { email: "known@example.com", password: "different-password" },
    { email: "unknown@example.com", password: VALID_PASSWORD },
    { email: "known@example.com", password: "short" },
  ];

  for (const credentials of failedAttempts) {
    const response = await request(app).post("/api/auth/login").send(credentials);
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      success: false,
      message: "Invalid email or password",
    });
    assert.equal(JSON.stringify(response.body).includes(user.passwordHash), false);
  }
});

test("every lead endpoint requires a Bearer token", async () => {
  const id = new mongoose.Types.ObjectId().toString();
  const endpoints = [
    () => request(app).post("/api/leads").send(VALID_LEAD),
    () => request(app).get("/api/leads"),
    () => request(app).get("/api/leads/stats"),
    () => request(app).put(`/api/leads/${id}`).send({ name: "Changed" }),
    () => request(app).delete(`/api/leads/${id}`),
  ];

  for (const sendRequest of endpoints) {
    const response = await sendRequest();
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      success: false,
      message: "Authentication required",
    });
  }
});

test("missing, malformed, invalid, expired, and unsupported-algorithm tokens are rejected", async () => {
  const user = await createUser("tokens@example.com");
  const now = Math.floor(Date.now() / 1000);
  const expired = jwt.sign(
    { iat: now - 100, exp: now - 1, sub: user.id },
    TEST_SECRET,
    { algorithm: "HS256" }
  );
  const unsupported = jwt.sign({}, TEST_SECRET, {
    algorithm: "HS384",
    subject: user.id,
    expiresIn: "1h",
  });
  const missingSubject = jwt.sign({}, TEST_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  });
  const invalidSubject = jwt.sign({}, TEST_SECRET, {
    algorithm: "HS256",
    subject: "not-an-object-id",
    expiresIn: "1h",
  });
  const invalidSignature = jwt.sign(
    {},
    "a-different-test-secret-with-at-least-32-bytes",
    { algorithm: "HS256", subject: user.id, expiresIn: "1h" }
  );

  const requests = [
    request(app).get("/api/leads/stats"),
    request(app).get("/api/leads/stats").set("Authorization", "Bearer not-a-jwt"),
    request(app).get("/api/leads/stats").set("Authorization", "Bearer token extra"),
    request(app).get("/api/leads/stats").set("Authorization", `Bearer ${invalidSignature}`),
    request(app).get("/api/leads/stats").set("Authorization", `Bearer ${expired}`),
    request(app).get("/api/leads/stats").set("Authorization", `Bearer ${unsupported}`),
    request(app).get("/api/leads/stats").set("Authorization", `Bearer ${missingSubject}`),
    request(app).get("/api/leads/stats").set("Authorization", `Bearer ${invalidSubject}`),
  ];

  for (const [index, response] of (await Promise.all(requests)).entries()) {
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      success: false,
      message:
        index === 0
          ? "Authentication required"
          : "Invalid or expired authentication token",
    });
  }
});

test("valid tokens are accepted only while their user document exists", async () => {
  const existingUser = await createUser("existing-token-user@example.com");
  const existingResponse = await request(app)
    .get("/api/leads/stats")
    .set("Authorization", `Bearer ${tokenFor(existingUser.id)}`);
  assert.equal(existingResponse.status, 200);

  const nonexistentUserId = new mongoose.Types.ObjectId().toString();
  const missingUserResponse = await request(app)
    .get("/api/leads/stats")
    .set("Authorization", `Bearer ${tokenFor(nonexistentUserId)}`);
  assert.equal(missingUserResponse.status, 401);
  assert.deepEqual(missingUserResponse.body, {
    success: false,
    message: "Invalid or expired authentication token",
  });
});

test("user lookup database failures reach centralized handling without exposing details", async (t) => {
  const user = await createUser("lookup-failure@example.com");
  const originalExists = User.exists;
  const originalConsoleError = console.error;
  const logOutput = [];
  const sensitiveError = new Error(
    "lookup failed mongodb://user:secret@host/private-db"
  );
  User.exists = async () => {
    throw sensitiveError;
  };
  console.error = (...args) => logOutput.push(args.join(" "));
  t.after(() => {
    User.exists = originalExists;
    console.error = originalConsoleError;
  });

  const response = await request(app)
    .get("/api/leads/stats")
    .set("Authorization", `Bearer ${tokenFor(user.id)}`);

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    success: false,
    message: "Internal server error",
  });
  assert.doesNotMatch(
    JSON.stringify([response.body, logOutput]),
    /mongodb:\/\/|user:secret|private-db|lookup failed/
  );
});

test("authenticated CRUD derives ownership from the token and ignores submitted owner IDs", async () => {
  const owner = await createUser("owner@example.com");
  const otherUser = await createUser("other@example.com");
  const ownerToken = tokenFor(owner.id);

  const create = await request(app)
    .post("/api/leads")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ ...VALID_LEAD, owner: otherUser.id, userId: otherUser.id });

  assert.equal(create.status, 201);
  assert.equal(create.body.data.owner, owner.id);
  const stored = await Lead.findById(create.body.data._id);
  assert.equal(stored.owner.toString(), owner.id);

  const list = await request(app)
    .get("/api/leads")
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(list.status, 200);
  assert.equal(list.body.totalLeads, 1);

  const update = await request(app)
    .put(`/api/leads/${stored.id}`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ status: "Qualified", owner: otherUser.id });
  assert.equal(update.status, 200);
  assert.equal(update.body.data.status, "Qualified");
  assert.equal(update.body.data.owner, owner.id);

  const remove = await request(app)
    .delete(`/api/leads/${stored.id}`)
    .set("Authorization", `Bearer ${ownerToken}`);
  assert.equal(remove.status, 200);
  assert.equal(await Lead.countDocuments({ _id: stored._id }), 0);
});

test("users cannot list, count, update, or delete another user's leads", async () => {
  const owner = await createUser("first@example.com");
  const otherUser = await createUser("second@example.com");
  const ownerToken = tokenFor(owner.id);
  const otherToken = tokenFor(otherUser.id);
  const lead = await Lead.create({ ...VALID_LEAD, owner: owner._id });

  const otherList = await request(app)
    .get("/api/leads")
    .set("Authorization", `Bearer ${otherToken}`);
  assert.equal(otherList.status, 200);
  assert.equal(otherList.body.totalLeads, 0);
  assert.deepEqual(otherList.body.data, []);

  const otherStats = await request(app)
    .get("/api/leads/stats")
    .set("Authorization", `Bearer ${otherToken}`);
  assert.deepEqual(otherStats.body.data, {
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    lost: 0,
  });

  const update = await request(app)
    .put(`/api/leads/${lead.id}`)
    .set("Authorization", `Bearer ${otherToken}`)
    .send({ name: "Attempted takeover" });
  const remove = await request(app)
    .delete(`/api/leads/${lead.id}`)
    .set("Authorization", `Bearer ${otherToken}`);
  assert.equal(update.status, 404);
  assert.equal(remove.status, 404);

  const stillOwned = await Lead.findById(lead.id);
  assert.equal(stillOwned.name, VALID_LEAD.name);
  assert.equal(stillOwned.owner.toString(), owner.id);
  assert.equal((await request(app).get("/api/leads").set("Authorization", `Bearer ${ownerToken}`)).body.totalLeads, 1);
});

test("ownerless legacy leads remain unchanged and inaccessible", async () => {
  const user = await createUser("legacy-test@example.com");
  const token = tokenFor(user.id);
  const legacy = {
    ...VALID_LEAD,
    email: "legacy@example.com",
    name: "Legacy ownerless lead",
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
    updatedAt: new Date("2020-01-01T00:00:00.000Z"),
  };
  const inserted = await Lead.collection.insertOne(legacy);
  const before = await Lead.collection.findOne({ _id: inserted.insertedId });

  const list = await request(app)
    .get("/api/leads")
    .set("Authorization", `Bearer ${token}`);
  const stats = await request(app)
    .get("/api/leads/stats")
    .set("Authorization", `Bearer ${token}`);
  const update = await request(app)
    .put(`/api/leads/${inserted.insertedId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Must remain unchanged" });
  const remove = await request(app)
    .delete(`/api/leads/${inserted.insertedId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(list.body.totalLeads, 0);
  assert.equal(stats.body.data.total, 0);
  assert.equal(update.status, 404);
  assert.equal(remove.status, 404);

  const after = await Lead.collection.findOne({ _id: inserted.insertedId });
  assert.equal(after.owner, undefined);
  assert.equal(after.name, before.name);
  assert.equal(after.email, before.email);
  assert.equal(after.updatedAt.getTime(), before.updatedAt.getTime());
});

test("search, status filtering, pagination, deterministic sorting, and stats remain scoped", async () => {
  const user = await createUser("regression@example.com");
  const token = tokenFor(user.id);
  const timestamp = new Date("2025-01-01T00:00:00.000Z");
  const ids = [1, 2, 3, 4].map((number) =>
    new mongoose.Types.ObjectId(`00000000000000000000000${number}`)
  );
  await Lead.create([
    { ...VALID_LEAD, _id: ids[0], owner: user._id, name: "Acme A.B", status: "New", createdAt: timestamp, updatedAt: timestamp },
    { ...VALID_LEAD, _id: ids[1], owner: user._id, email: "second@example.com", name: "Acme AxB", status: "Contacted", createdAt: timestamp, updatedAt: timestamp },
    { ...VALID_LEAD, _id: ids[2], owner: user._id, email: "third@example.com", name: "Third prospect", status: "Qualified", createdAt: timestamp, updatedAt: timestamp },
    { ...VALID_LEAD, _id: ids[3], owner: user._id, email: "fourth@example.com", name: "Fourth prospect", status: "Lost", createdAt: timestamp, updatedAt: timestamp },
  ]);
  await Lead.collection.insertOne({
    ...VALID_LEAD,
    _id: new mongoose.Types.ObjectId("000000000000000000000000"),
    owner: user._id,
    email: "converted@example.com",
    status: "Converted",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const literalSearch = await request(app)
    .get("/api/leads")
    .query({ search: "A.B" })
    .set("Authorization", `Bearer ${token}`);
  assert.equal(literalSearch.body.totalLeads, 1);
  assert.equal(literalSearch.body.data[0].name, "Acme A.B");

  const filtered = await request(app)
    .get("/api/leads")
    .query({ status: "Contacted" })
    .set("Authorization", `Bearer ${token}`);
  assert.equal(filtered.body.totalLeads, 1);
  assert.equal(filtered.body.data[0].status, "Contacted");

  const page = await request(app)
    .get("/api/leads")
    .query({ page: 1, limit: 1 })
    .set("Authorization", `Bearer ${token}`);
  assert.equal(page.body.totalLeads, 5);
  assert.equal(page.body.totalPages, 5);
  assert.equal(page.body.currentPage, 1);
  assert.equal(page.body.data[0]._id, ids[3].toString());

  const invalidPage = await request(app)
    .get("/api/leads")
    .query({ page: 0 })
    .set("Authorization", `Bearer ${token}`);
  const invalidStatus = await request(app)
    .get("/api/leads")
    .query({ status: "Converted" })
    .set("Authorization", `Bearer ${token}`);
  assert.equal(invalidPage.status, 400);
  assert.equal(invalidStatus.status, 400);

  const stats = await request(app)
    .get("/api/leads/stats")
    .set("Authorization", `Bearer ${token}`);
  assert.deepEqual(stats.body.data, {
    total: 4,
    new: 1,
    contacted: 1,
    qualified: 1,
    lost: 1,
  });
});

test("lead validation and invalid or nonexistent IDs keep their expected statuses", async () => {
  const user = await createUser("validation@example.com");
  const token = tokenFor(user.id);
  const invalidPayloads = [
    { ...VALID_LEAD, email: "bad-email" },
    { ...VALID_LEAD, source: "Unknown" },
    { ...VALID_LEAD, status: "Converted" },
    { ...VALID_LEAD, name: undefined },
  ];

  for (const payload of invalidPayloads) {
    const response = await request(app)
      .post("/api/leads")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    assert.equal(response.status, 400);
  }

  const invalidUpdate = await request(app)
    .put("/api/leads/not-an-object-id")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Updated" });
  const invalidDelete = await request(app)
    .delete("/api/leads/not-an-object-id")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(invalidUpdate.status, 400);
  assert.equal(invalidDelete.status, 400);

  const missingId = new mongoose.Types.ObjectId().toString();
  const missingUpdate = await request(app)
    .put(`/api/leads/${missingId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Updated" });
  const missingDelete = await request(app)
    .delete(`/api/leads/${missingId}`)
    .set("Authorization", `Bearer ${token}`);
  assert.equal(missingUpdate.status, 404);
  assert.equal(missingDelete.status, 404);
});

test("unexpected auth and lead errors reach central handling without leaking details", async (t) => {
  const user = await createUser("errors@example.com");
  const token = tokenFor(user.id);
  const sensitiveError = new Error(
    "database failure mongodb://user:secret@host/db passwordHash=hidden"
  );
  const oldFind = Lead.find;
  const oldFindOne = User.findOne;
  const oldConsoleError = console.error;
  const logOutput = [];
  console.error = (...args) => logOutput.push(args.join(" "));
  t.after(() => {
    Lead.find = oldFind;
    User.findOne = oldFindOne;
    console.error = oldConsoleError;
  });

  Lead.find = () => {
    throw sensitiveError;
  };
  const leadFailure = await request(app)
    .get("/api/leads")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(leadFailure.status, 500);
  assert.deepEqual(leadFailure.body, {
    success: false,
    message: "Internal server error",
  });

  User.findOne = () => {
    throw sensitiveError;
  };
  const authFailure = await request(app)
    .post("/api/auth/login")
    .send({ email: "errors@example.com", password: VALID_PASSWORD });
  assert.equal(authFailure.status, 500);
  assert.deepEqual(authFailure.body, {
    success: false,
    message: "Internal server error",
  });
  assert.doesNotMatch(JSON.stringify([leadFailure.body, authFailure.body, logOutput]), /mongodb:\/\/|secret@|passwordHash=hidden|database failure/);
});

test("malformed JSON uses the safe centralized 400 response", async () => {
  const response = await request(app)
    .post("/api/auth/signup")
    .set("Content-Type", "application/json")
    .send("{\"email\":");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    success: false,
    message: "Malformed JSON request body",
  });
});
