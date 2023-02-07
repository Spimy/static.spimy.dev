import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup multer upload middleware
const fileFilter = (_: Request, file: Express.Multer.File, callback: Function) => {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return callback(null, true);
  }

  return callback(new FileTypeError('Only images are allowed.'));
};

const upload = multer({
  dest: path.join(__dirname, '../temp'),
  limits: {
    fileSize: 8 * 1024 * 1024 // 8 MiB
  },
  fileFilter
});

const getFilePath = (targetPath: string, increment: number = 1): string => {
  if (!fs.existsSync(targetPath)) return targetPath;

  const fileName = `${path.basename(targetPath, path.extname(targetPath))}${
    `_${increment}` || ''
  }${path.extname(targetPath)}`;
  const filePath = path.join(__dirname, '..', '..', 'uploads', fileName);

  if (fs.existsSync(filePath)) return getFilePath(targetPath, increment + 1);
  return filePath;
};

class FileTypeError extends Error {}

export const cdnUpload = (request: Request, response: Response) => {
  upload.single('file')(request, response, (error) => {
    if (error) {
      if (error instanceof FileTypeError) {
        return response
          .status(422)
          .send({ message: 'Only images are allowed.' });
      }
    }

    if (typeof request.file === 'undefined') {
      return response
        .status(422)
        .send({ message: 'A file was not provided in the request.' });
    }

    const tempPath = request.file.path;
    const targetPath = getFilePath(
      path.join(__dirname, '..', '..', 'uploads', request.file.originalname)
    );
    const fileName = path.basename(targetPath);

    fs.rename(tempPath, targetPath, (error) => {
      if (error) {
        return response
          .status(500)
          .send({
            message: `Something went wrong processing the file: ${error.message}`
          });
      }

      return response.status(200).send({
        message: `Successfully uploaded ${fileName}.`,
        url: `http://${request.get('host')}/${fileName}`
      });
    });
  });
};
