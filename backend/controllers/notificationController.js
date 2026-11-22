const notificationService = require("../services/notificationService");

const list = async (req, res, next) => {
  try {
    const result = await notificationService.listNotifications(req.auth.userId);
    return res.status(200).json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    notificationService.validateNotificationId(req.params.id);
    const notification = await notificationService.markRead(
      req.params.id,
      req.auth.userId
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    return next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const modifiedCount = await notificationService.markAllRead(req.auth.userId);
    return res.status(200).json({ success: true, data: { modifiedCount } });
  } catch (error) {
    return next(error);
  }
};

module.exports = { list, markRead, markAllRead };
