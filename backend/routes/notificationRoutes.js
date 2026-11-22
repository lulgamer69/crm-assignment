const express = require("express");
const authenticate = require("../middleware/authenticate");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.use(authenticate);
router.get("/", notificationController.list);
router.patch("/read-all", notificationController.markAllRead);
router.patch("/:id/read", notificationController.markRead);

module.exports = router;
