import mongoose from 'mongoose';

const userSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
    },
  email:{
    type:String,
    match:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
  },
  passwordHash:{
    type:String,
    required:true,
    minlength:6,
    select:false,
  },
  role:{
    type:String,
    enum:['user','seller'],
    default:'user',
  },
},{timestamps:true})

const userModel = mongoose.model('user',userSchema);

export default userModel;
