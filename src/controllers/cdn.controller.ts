import { Request, Response } from "express";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup multer upload middleware
const checkFileType = (file: Express.Multer.File, callback: Function) => {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname){
    return callback(null, true);
  } 

  return callback(new FileTypeError('Only images are allowed.'))
}

const upload = multer({
  dest: path.join(__dirname, '../temp'),
  limits: {
    fileSize: 8 * 1024 * 1024 // 8 MiB
  },
  fileFilter: (_request, file: Express.Multer.File, callback: Function) => checkFileType(file, callback)
});

class FileTypeError extends Error {}

export const cdnUpload = (request: Request, response: Response) => {
  upload.single('file')(request, response, error => {
    if (error) {
      if (error instanceof FileTypeError) {
        return response.status(422).send({ message: 'Only images are allowed.' });
      }
    }

    if (typeof request.file === 'undefined') {
      return response.status(422).send({ message: 'A file was not provided in the request.' });
    }

    const tempPath = request.file.path;
    const fileName = request.file.originalname;
    const targetPath = path.join(__dirname, '..', '..', 'uploads', fileName);
  
    fs.rename(tempPath, targetPath, error => {
      if (error) {
        return response
          .status(500)
          .send({ message: `Something went wrong processing the file: ${error.message}` });
      }
  
      return response
        .status(200)
        .send({ 
          message: `Successfully uploaded ${fileName}.`,
          url: `http://${request.get('host')}/${fileName}`
        });
    });
  });
}