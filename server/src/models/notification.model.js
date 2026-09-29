import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["NEW_ORDER", "ORDER_CANCELLED", "LOW_STOCK", "CANCEL_REQUEST"],
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    orderId: { type: mongoose.Schema.Types.ObjectId },
    productId: { type: mongoose.Schema.Types.ObjectId },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

const notificationModel = mongoose.model("notification", notificationSchema);

export default notificationModel;
