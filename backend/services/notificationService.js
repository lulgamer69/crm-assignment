const mongoose = require("mongoose");
const Notification = require("../models/notification");
const { createAuthError } = require("../config/jwt");

const createLeadNotification = async (owner, lead, action) => {
  try {
    return await Notification.create({
      owner,
      lead: lead._id,
      leadName: lead.name,
      action,
    });
  } catch {
    // A notification failure must not turn a completed lead mutation into an API failure.
    console.error("Lead notification could not be stored");
    return null;
  }
};

const listNotifications = async (ownerId) => {
  const owner = new mongoose.Types.ObjectId(ownerId);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ owner }).sort({ createdAt: -1, _id: -1 }).limit(50),
    Notification.countDocuments({ owner, readAt: null }),
  ]);
  return { notifications, unreadCount };
};

const markRead = async (notificationId, ownerId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, owner: ownerId },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" }
  );
  return notification;
};

const markAllRead = async (ownerId) => {
  const result = await Notification.updateMany(
    { owner: ownerId, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return result.modifiedCount;
};

const validateNotificationId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw createAuthError("NOTIFICATION_INVALID_ID", 400, "Invalid notification ID");
  }
};

module.exports = {
  createLeadNotification,
  listNotifications,
  markRead,
  markAllRead,
  validateNotificationId,
};
