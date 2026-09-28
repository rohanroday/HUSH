import ImageKit from '@imagekit/nodejs';
import config from '../config/config.js';

const client = new ImageKit({
  privateKey: config.IMAGEKIT_API_KEY,
});

export async function uploadImage(file,fileName){
    const result = await client.files.upload({
        file,
        fileName,
        folder: '/snitch',
    });
    return result;
}

export async function deleteFile(fileId){
    await client.files.delete(fileId);
}
