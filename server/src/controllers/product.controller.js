import productModel from "../models/product.model.js";
import {uploadImage,deleteFile} from "../services/storage.service.js"

// Keeps ?page= within 1..totalPages (and handles missing / non-numeric values)
function clampPage(rawPage,totalPages){
    const page = parseInt(rawPage) || 1;
    return Math.max(1,Math.min(page,Math.max(totalPages,1)));
}

export async function createProduct(req,res){

    const user = req.user;
    if(user.role !== "seller"){
        return res.status(403).json({message:"Only sellers can create products"});
    }
    const {title,price:{amount,currency},description,category,sizes} = req.body;
    const error = [];

    const files = req.files;
    if(!files || files.length === 0){
        error.push({
            message:"Please upload images",
            field:"images"
        });
    }
    if(error.length > 0){
        return res.status(400).json({message:error});
    }
    const urls = await Promise.all(files.map(async (file,index)=>{
         const fileName = `${Date.now()}-${file.originalname}`;
         const response = await uploadImage(file.buffer.toString("base64"),fileName);
         return {
            url:response.url,
            imageKitId:response.fileId,
            order:index+1
         };
    }))

    const product = await productModel.create({
        title,
        price:{
            amount,
            currency
        },
        description,
        category,
        sizes,
        images:urls,
        seller:user.id
    })
    res.status(201).json({
        message:"Product created successfully",
        product:{
            id:product._id,
            title,
            price:{
                amount,
                currency
            },
            description,
            category,
            sizes,
            images:urls,
            seller:user.id,
            isPublished:product.isPublished
        }
    })
}

export async function updateProduct(req,res){
    const user = req.user;
    if(user.role !== "seller"){
        return res.status(403).json({message:"Only sellers can update products"});
    }
    const {id} = req.params;
    const product = await productModel.findById(id);
    if(!product){
        return res.status(404).json({message:"Product not found"});
    }
    if(product.seller.toString() !== user.id){
        return res.status(403).json({message:"Only authenticated sellers can update products"});
    }
    const numberOfImages = product.images.length + (req.files ? req.files.length : 0);

    if(numberOfImages>5){
        return res.status(400).json({
            message:"Max 5 images",
        })
    }
    if(req.files && req.files.length>0){
        const urls = await Promise.all(req.files.map(async (file, index) => {

            const fileName = `${Date.now()}-${file.originalname}`
            const response = await uploadImage(file.buffer.toString("base64"), fileName)

            return {
                url: response.url,
                imageKitId: response.fileId,
                order: product.images.length + index + 1,
            }
        }))

        product.images.push(...urls)
    }

    const {title,price,description,category,sizes} = req.body;
    
    if(title) product.title = title;
   if(price) product.price=price;
    if(description) product.description = description;
    if(category) product.category = category;
    if(sizes) product.sizes = sizes;
    await product.save();
    res.status(200).json({
        message:"Product updated successfully",
        data:{
            product:{
                id:product._id,
                title:product.title,
                price:{
                    amount:product.price.amount,
                    currency:product.price.currency
                },
                description:product.description,
                category:product.category,
                sizes:product.sizes,
                images:product.images,
                seller:product.seller,
                isPublished:product.isPublished
            }
        }
    })


}

export async function getProducts(req,res){
    const totalProduct = await productModel.countDocuments({
        isPublished:true
    });

    const totalPages = Math.ceil(totalProduct/20);

    const page = clampPage(req.query.page,totalPages);

    const skip = (page-1)*20;

    const products = await productModel.find({
        isPublished:true
    }).skip(skip).limit(20);
    res.status(200).json({
        message:"product feteched successfully",
        data:{
            products,
            totalPages:totalPages,
            currentPage:page
        }
    })
}

export async function getProductById(req,res){
    const product = await productModel.findOne({
        _id:req.params.id,
        isPublished:true
    });
    if(!product){
        return res.status(404).json({message:"Product not found"});
    }
    res.status(200).json({
        message:"product feteched successfully",
        data:{product}
    })
}

export async function togglePublishProduct(req,res) {
    const user = req.user;
    if(user.role !== "seller"){
        return res.status(403).json({message:"Only sellers can publish products"});
    }
    const {id:productId}= req.params;

    const product = await productModel.findById(productId);
    if(!product){
        return res.status(404).json({
            message:"Product not found"
        })
    }
    if(product.seller.toString() !== user.id){
        return res.status(403).json({
            message:"Only authenticated sellers can publish products"
        })
    }
    await productModel.findByIdAndUpdate({
        _id:productId
    },{
        isPublished:!product.isPublished
    })
    res.status(200).json({
        message: product.isPublished ? "Product unpublished successfully" : "Product published successfully",
        data:{
            product:{
                id:product._id,
                isPublished:!product.isPublished
            }
        }
    })
}

export async function deleteImage(req,res){
    const user = req.user;
    if(user.role !== "seller"){
        return res.status(403).json({message:"Only sellers can delete images"});
    }
    const {id:productId,imageId}= req.params;
    const product = await productModel.findById(productId);
    if(!product){
        return res.status(404).json({
            message:"Product not found"
        })
    }
    if(product.seller.toString() !== user.id){
        return res.status(403).json({
            message:"Only authenticated sellers can delete images"
        })
    }
    const image = product.images.find((img)=>img.imageKitId === imageId);
    if(!image){
        return res.status(404).json({
            message:"Image not found"
        })
    }
    try{
        await deleteFile(imageId);
    }catch(err){
        // the file may already be gone from ImageKit (or be seed data that was
        // never uploaded there); still remove it from the product
        console.warn(`ImageKit delete failed for ${imageId}: ${err.message}`);
    }
    await productModel.findByIdAndUpdate({
        _id:productId
    },{
        $pull:{
            images:{
                imageKitId:imageId
            }
        }
    })
    res.status(200).json({
        message:"Image deleted successfully",
    })
}


export async function getProductsBySeller(req,res){
    const user = req.user;
    if(user.role !== "seller"){
        return res.status(403).json({message:"Only sellers can get products"});
    }
    const totalProduct = await productModel.countDocuments({
        seller:user.id
    })

    const totalPages = Math.ceil(totalProduct/5);
    const page = clampPage(req.query.page,totalPages);
    const skip = (page-1)*5;
    const products  = await productModel.find({
        seller:user.id
    }).skip(skip).limit(5);
    
    return res.status(200).json({
        message:"product feteched successfully",
        data:{
            products:products,
            totalPages:totalPages,
            currentPage:page
        }
    })
}

