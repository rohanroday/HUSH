import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
    },
    products:[
        {
            productId:{
                type:mongoose.Schema.Types.ObjectId,
                required:true,
                ref:"products",
            },
            quantity:{
                type:Number,
                required:true,
                min:1,
            },
            size:{
                type:String,
                required:true,
                enum:['XS','S','M','L','XL','XXL'],
            },
        }
    ]
})

const cartModel = mongoose.model("cart",cartSchema);

export default cartModel;