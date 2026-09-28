import Router from 'express';
import {createProduct,updateProduct,getProducts,getProductById,togglePublishProduct,deleteImage,getProductsBySeller} from '../controllers/product.controller.js';
import {createProductValidator,updateProductValidator} from "../validators/product.validator.js"
import authenticate from "../middleware/auth.middleware.js"
import multer from "multer";
import { param } from "express-validator";
import { validateRequest } from "../utils/validate.js";

const upload = multer({storage:multer.memoryStorage()})

const router= Router();
router.post("/create",authenticate,upload.array("images",5),    
    (req,res,next)=>{
        if(req.body.category){
            req.body.category = JSON.parse(req.body.category);
        }
        if(req.body.sizes){
            req.body.sizes = JSON.parse(req.body.sizes);
        }
        if(req.body.price){
            req.body.price = JSON.parse(req.body.price);
        }
        next();
    },createProductValidator,createProduct);

    router.patch("/update/:id",authenticate,upload.array("images",5),    
    (req,res,next)=>{
        if(req.body.category){
            req.body.category = JSON.parse(req.body.category);
        }
        if(req.body.sizes){
            req.body.sizes = JSON.parse(req.body.sizes);
        }
        if(req.body.price){
            req.body.price = JSON.parse(req.body.price);
        }
        next();
    },
    updateProductValidator,
    updateProduct);


    router.get("/",getProducts);

    router.patch("/publish/:id",authenticate,togglePublishProduct);

    router.delete("/image/:id/:imageId",authenticate,deleteImage);

    router.get("/seller",authenticate,getProductsBySeller);

    // must stay after "/seller" so that path isn't treated as an id
    router.get("/:id",param("id").isMongoId().withMessage("Invalid Product ID"),validateRequest,getProductById);

export default router;
