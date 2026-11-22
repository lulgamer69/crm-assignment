const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { once } = require("node:events");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const originalMongoUri = process.env.MONGO_URI;
const originalJwtSecret = process.env.JWT_SECRET;
const originalPort = process.env.PORT;
const TEST_SECRET = "isolated-startup-test-secret-with-at-least-32-bytes";

process.env.MONGO_URI = "mongodb://127.0.0.1:27017/startup-test-placeholder";
process.env.JWT_SECRET = TEST_SECRET;
process.env.PORT = "0";

const startServer = require("../server");
let mongoServer;
let runningServer;

const isLoopbackMongoUri = (uri) => {
  try {
    const hostname = new URL(uri).hostname;
    return ["127.0.0.1", "localhost", "[::1]", "::1"].includes(hostname);
  } catch {
    return false;
  }
};

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const testMongoUri = mongoServer.getUri();
  assert.equal(isLoopbackMongoUri(testMongoUri), true);
  process.env.MONGO_URI = testMongoUri;
});

after(async () => {
  if (runningServer?.listening) {
    await new Promise((resolve) => runningServer.close(resolve));
  }
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();

  if (originalMongoUri === undefined) delete process.env.MONGO_URI;
  else process.env.MONGO_URI = originalMongoUri;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
  if (originalPort === undefined) delete process.env.PORT;
  else process.env.PORT = originalPort;
});

test("startup fails safely before database access when JWT_SECRET is missing or too short", async () => {
  const originalExitCode = process.exitCode;
  const originalConnect = mongoose.connect;
  const originalConsoleError = console.error;
  const errors = [];
  let connectCalled = false;
  console.error = (...args) => errors.push(args.join(" "));
  mongoose.connect = async () => {
    connectCalled = true;
  };

  try {
    for (const secret of [undefined, "short"]) {
      if (secret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = secret;

      const server = await startServer();
      assert.equal(server, null);
      assert.equal(process.exitCode, 1);
    }
    assert.equal(connectCalled, false);
    assert.equal(errors.length, 2);
    assert.ok(errors.every((message) => /JWT_SECRET must be set/.test(message)));
    assert.ok(
      errors.every((message) => !/isolated-startup-test-secret|short/.test(message))
    );
  } finally {
    mongoose.connect = originalConnect;
    console.error = originalConsoleError;
    process.exitCode = originalExitCode;
    process.env.JWT_SECRET = TEST_SECRET;
  }
});

test("startup handles missing MONGO_URI separately without attempting a connection", async () => {
  const originalExitCode = process.exitCode;
  const originalConnect = mongoose.connect;
  const originalConsoleError = console.error;
  const errors = [];
  let connectCalled = false;
  process.env.JWT_SECRET = TEST_SECRET;
  delete process.env.MONGO_URI;
  console.error = (...args) => errors.push(args.join(" "));
  mongoose.connect = async () => {
    connectCalled = true;
  };

  try {
    const server = await startServer();
    assert.equal(server, null);
    assert.equal(process.exitCode, 1);
    assert.equal(connectCalled, false);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /MONGO_URI environment variable is required/);
    assert.doesNotMatch(errors[0], /isolated-startup-test-secret/);
  } finally {
    mongoose.connect = originalConnect;
    console.error = originalConsoleError;
    process.exitCode = originalExitCode;
    process.env.MONGO_URI = mongoServer.getUri();
  }
});

test("database startup failures do not expose connection strings or start the listener", async () => {
  const originalExitCode = process.exitCode;
  const originalConnect = mongoose.connect;
  const originalConsoleError = console.error;
  const errors = [];
  const connectionString = "mongodb://user:secret@127.0.0.1/private-db";
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.MONGO_URI = connectionString;
  console.error = (...args) => errors.push(args.join(" "));
  mongoose.connect = async () => {
    throw new Error(`failed connection to ${connectionString}`);
  };

  try {
    const server = await startServer();
    assert.equal(server, null);
    assert.equal(process.exitCode, 1);
    assert.equal(errors.length, 1);
    assert.doesNotMatch(errors[0], /user:secret|private-db|mongodb:\/\//);
  } finally {
    mongoose.connect = originalConnect;
    console.error = originalConsoleError;
    process.exitCode = originalExitCode;
    process.env.MONGO_URI = mongoServer.getUri();
  }
});

test("valid environment starts the app after connecting to the isolated database", async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  const testMongoUri = mongoServer.getUri();
  assert.equal(isLoopbackMongoUri(testMongoUri), true);
  process.env.MONGO_URI = testMongoUri;

  runningServer = await startServer();
  assert.ok(runningServer);
  if (!runningServer.listening) await once(runningServer, "listening");

  const response = await request(runningServer).get("/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    message: "Server Healthy",
  });

  await new Promise((resolve) => runningServer.close(resolve));
  runningServer = null;
  await mongoose.disconnect();
});
