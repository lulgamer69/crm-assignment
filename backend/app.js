const express = require("express");
const cors = require("cors");

const app = express();
const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const notFound = require("./middleware/notfound");
const errorHandler = require("./middleware/errorhandler");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://leadflow-crm-three-flame.vercel.app",
      "https://leadflow-b5smdwqvr-krishnasproject1.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);

app.get("/", (req, res) => {
  res.send("CRM API Running...");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server Healthy",
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
