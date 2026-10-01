import Router from 'express';
import {createProduct,updateProduct,getProducts,getProductById,togglePublishProduct,deleteImage,deleteProduct,getProductsBySeller} from '../controllers/product.controller.js';
import {createProductValidator,updateProductValidator} from "../validators/product.validator.js"
import authenticate from "../middleware/auth.middleware.js"
import multer from "multer";
import { param } from "express-validator";
import { validateRequest } from "../utils/validate.js";

const upload = multer({
    storage:multer.memoryStorage(),
    limits:{ fileSize:5 * 1024 * 1024, files:5 },
    fileFilter:(req,file,cb)=>{
        if(!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)){
            const err = new Error("Only JPEG, PNG, WebP, GIF or AVIF images can be uploaded");
            err.status = 400;
            err.expose = true;
            return cb(err);
        }
        cb(null,true);
    },
})

// multipart forms can't nest objects, so the client sends these as JSON strings
function parseJsonFields(req,res,next){
    for(const field of ["category","sizes","price"]){
        if(typeof req.body[field] === "string"){
            try{
                req.body[field] = JSON.parse(req.body[field]);
            }catch{
                return res.status(400).json({message:`Invalid ${field}`});
            }
        }
    }
    next();
}

// only sellers get as far as uploading files
function sellerOnly(req,res,next){
    if(req.user.role !== "seller"){
        return res.status(403).json({message:"Only sellers can manage products"});
    }
    next();
}

const idValidator = [param("id").isMongoId().withMessage("Invalid Product ID"),validateRequest];

const router= Router();

router.post("/create",authenticate,sellerOnly,upload.array("images",5),parseJsonFields,createProductValidator,createProduct);

router.patch("/update/:id",authenticate,sellerOnly,idValidator,upload.array("images",5),parseJsonFields,updateProductValidator,updateProduct);

router.get("/",getProducts);

router.patch("/publish/:id",authenticate,idValidator,togglePublishProduct);

router.delete("/image/:id/:imageId",authenticate,idValidator,deleteImage);

router.get("/seller",authenticate,getProductsBySeller);

router.delete("/:id",authenticate,idValidator,deleteProduct);

// must stay after "/seller" so that path isn't treated as an id
router.get("/:id",idValidator,getProductById);

export default router;
