import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  address:{
        state:{
            type:String,
            required:true,
        },
        city:{
            type:String,
            required:true,
        },
        street:{
            type:String,
            required:true,
        },
        house:{
            type:String,
            required:true,
        },
        zip:{
            type:String,
            required:true,
        },
    },
  products:[
    {
        product:{

            title:{
                type:String,
                required:true,
            },
            description:{
                type:String,
                required:true,
            },
            price:{
                amount:{
                    type:Number,
                    required:true,
                },
                currency:{
                    type:String,
                    required:true,
                }
            },
            image:{
                type:String,
                required:true,
            },
            productId:{
                type:mongoose.Schema.Types.ObjectId,
                required:true,
            },
        },
    quantity:{
        type:Number,
        required:true,
    },
    size:{
        type:String,
        required:true,
    }
},
  ],
  totalPrice:{
    amount:{
        type:Number,
        required:true,
    },
    currency:{
        type:String,
        required:true,
    }
  },
  // flat shipping charged on top of the items; totalPrice includes it
  shippingFee:{
    type:Number,
    default:0,
  },
  status:{
    type:String,
    required:true,
    // PAYMENT_PENDING: stock is held while the buyer is paying; not a real order yet
    enum:['PAYMENT_PENDING','PENDING','SHIPPED','DELIVERED','PLACED','CANCELLED'],
    default:'PLACED',
  },
  // A buyer can ask to cancel once the parcel has shipped; a seller decides.
  cancellationRequest:{
    status:{ type:String, enum:["REQUESTED","APPROVED","DECLINED"] },
    reason:{ type:String, maxlength:300 },
    requestedAt:Date,
    respondedAt:Date,
    sellerNote:{ type:String, maxlength:300 },
  },
  payment:{
    provider:{ type:String, enum:['razorpay'] },
    status:{
      type:String,
      enum:['CREATED','PAID','FAILED','REFUND_PENDING','REFUNDED'],
    },
    razorpayOrderId:{ type:String, index:true },
    razorpayPaymentId:String,
    razorpaySignature:String,
    method:String,
    paidAt:Date,
    refundId:String,
    refundedAt:Date,
  },
},{timestamps:true});


const orderModel = mongoose.model("order",orderSchema);

export default orderModel;
