import jwt from 'jsonwebtoken';
import config from '../config/config.js';

const authenticate = async (req,res,next)=>{
    const header = req.headers.authorization;
    if(!header || !header.startsWith('Bearer ')){
        return res.status(401).json({message:'Authentication token missing'});
    }
    try{
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token,config.JWT_SECRET);
        req.user = decoded;
        next();
    }catch(err){
        res.status(401).json({message:'Error authenticating user',error:err.message});
    }
}
export default authenticate;
