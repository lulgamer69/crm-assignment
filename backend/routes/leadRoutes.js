const express = require("express");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

const leadController = require("../controllers/leadController");

router.use(authenticate);

router.post("/", leadController.createLead);
router.get("/trends", leadController.getLeadTrends);
router.get("/stats", leadController.getLeadStats);
router.get("/", leadController.getAllLeads);
router.get("/:id", leadController.getLeadById);
router.put("/:id", leadController.updateLead);
router.delete("/:id", leadController.deleteLead);
module.exports = router;
