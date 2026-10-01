import notificationModel from "../models/notification.model.js";
import userModel from "../models/user.model.js";

// Contact-form messages land in every seller's notifications, where they can
// read them and reply by email.
export async function sendContactMessage(req, res) {
  const { name, email, orderNumber, message } = req.body;
  const sellers = await userModel.find({ role: "seller" }).select("_id").lean();
  if (sellers.length === 0) {
    return res.status(503).json({ message: "We can't take messages right now. Please try again later." });
  }
  const order = orderNumber ? ` (order #${orderNumber.replace(/^#/, "").toUpperCase()})` : "";
  await notificationModel.insertMany(
    sellers.map((seller) => ({
      userId: seller._id,
      type: "CONTACT_MESSAGE",
      title: `Message from ${name}${order}`,
      body: message,
      replyTo: email,
    }))
  );
  return res.status(201).json({ message: "Message sent. We'll reply within one business day." });
}
