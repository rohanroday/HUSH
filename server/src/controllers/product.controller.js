import productModel from "../models/product.model.js";
import orderModel from "../models/order.model.js";
import {uploadImage,deleteFile} from "../services/storage.service.js"

const PAGE_SIZE = 20;

// Uploads every file or none: if one upload fails, the ones that already
// made it to ImageKit are deleted again so nothing is left orphaned.
async function uploadAll(files,startOrder){
    const results = await Promise.allSettled(files.map((file)=>{
        const safeName = file.originalname.replace(/[^\w.-]+/g,"-").slice(-80);
        return uploadImage(file.buffer.toString("base64"),`${Date.now()}-${safeName}`);
    }));
    const failed = results.find((r)=>r.status === "rejected");
    if(failed){
        await Promise.allSettled(
            results.filter((r)=>r.status === "fulfilled").map((r)=>deleteFile(r.value.fileId))
        );
        throw failed.reason;
    }
    return results.map((r,index)=>({
        url:r.value.url,
        imageKitId:r.value.fileId,
        order:startOrder + index,
    }));
}

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
    let urls;
    try{
        urls = await uploadAll(files,1);
    }catch(err){
        console.error("image upload failed:",err.message);
        return res.status(502).json({message:"Couldn't upload the images. Please try again."});
    }

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
        const lastOrder = product.images.reduce((max,img)=>Math.max(max,img.order),0);
        try{
            product.images.push(...await uploadAll(req.files,lastOrder + 1));
        }catch(err){
            console.error("image upload failed:",err.message);
            return res.status(502).json({message:"Couldn't upload the images. Please try again."});
        }
    }

    const {title,price,description,category,sizes} = req.body;

    if(title) product.title = title;
    if(price) product.price = { amount:price.amount, currency:price.currency || "INR" };
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

    const totalPages = Math.ceil(totalProduct/PAGE_SIZE);

    const page = clampPage(req.query.page,totalPages);

    const skip = (page-1)*PAGE_SIZE;

    const products = await productModel.find({
        isPublished:true
    }).sort({createdAt:-1,_id:-1}).skip(skip).limit(PAGE_SIZE).lean();
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
    if(!product.isPublished && product.images.length === 0){
        return res.status(400).json({
            message:"Add at least one photo before publishing"
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
    if(product.images.length <= 1){
        return res.status(400).json({
            message:"A product needs at least one photo. Upload another before deleting this one."
        })
    }
    try{
        await deleteFile(imageId);
    }catch(err){
        // the file may already be gone from ImageKit; still remove it from
        // the product
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


// Removes a product and its photos for good. Products that have been ordered
// stay (orders and refunds still refer to them); those can only be unpublished.
export async function deleteProduct(req,res){
    const user = req.user;
    if(user.role !== "seller"){
        return res.status(403).json({message:"Only sellers can delete products"});
    }
    const product = await productModel.findById(req.params.id);
    if(!product){
        return res.status(404).json({message:"Product not found"});
    }
    if(product.seller.toString() !== user.id){
        return res.status(403).json({message:"Only authenticated sellers can delete products"});
    }
    // abandoned checkouts (never paid) don't count as orders
    const ordered = await orderModel.exists({
        "products.product.productId":product._id,
        "payment.status":{ $ne:"FAILED" },
    });
    if(ordered){
        return res.status(409).json({
            message:"This product has orders, so it can't be deleted. Unpublish it to take it out of the shop instead."
        });
    }
    await productModel.deleteOne({_id:product._id});
    const results = await Promise.allSettled(product.images.map((img)=>deleteFile(img.imageKitId)));
    results.forEach((r,i)=>{
        if(r.status === "rejected"){
            console.warn(`ImageKit delete failed for ${product.images[i].imageKitId}: ${r.reason?.message}`);
        }
    });
    res.status(200).json({message:"Product deleted"});
}

export async function getProductsBySeller(req,res){
    const user = req.user;
    if(user.role !== "seller"){
        return res.status(403).json({message:"Only sellers can get products"});
    }
    const totalProduct = await productModel.countDocuments({
        seller:user.id
    })

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 5,1),50);
    const totalPages = Math.ceil(totalProduct/limit);
    const page = clampPage(req.query.page,totalPages);
    const skip = (page-1)*limit;
    const products  = await productModel.find({
        seller:user.id
    }).sort({createdAt:-1}).skip(skip).limit(limit);
    
    return res.status(200).json({
        message:"product feteched successfully",
        data:{
            products:products,
            totalPages:totalPages,
            currentPage:page
        }
    })
}

