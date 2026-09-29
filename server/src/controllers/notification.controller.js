import notificationModel from "../models/notification.model.js";

export async function getNotifications(req, res) {
  const userId = req.user.id;
  const [notifications, unread] = await Promise.all([
    notificationModel.find({ userId }).sort({ createdAt: -1 }).limit(40).lean(),
    notificationModel.countDocuments({ userId, read: false }),
  ]);
  return res.status(200).json({ message: "Notifications fetched", data: { notifications, unread } });
}

export async function markRead(req, res) {
  await notificationModel.updateOne({ _id: req.params.id, userId: req.user.id }, { $set: { read: true } });
  return res.status(200).json({ message: "Notification marked as read" });
}

export async function markAllRead(req, res) {
  await notificationModel.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
  return res.status(200).json({ message: "All notifications marked as read" });
}
