import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup multer upload middleware
const fileFilter = (
  _: Request,
  file: Express.Multer.File,
  callback: Function
) => {
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

// Used to avoid duplicated file name when using fs.rename
const getFilePath = (
  targetPath: string,
  folder: string | undefined,
  increment: number = 1
): string => {
  const defaultPath = getPath(targetPath, folder);
  if (!fs.existsSync(defaultPath)) return defaultPath;

  const fileName = `${path.basename(defaultPath, path.extname(defaultPath))}${
    `_${increment}` || ''
  }${path.extname(defaultPath)}`;

  const filePath = getPath(fileName, folder);

  if (fs.existsSync(filePath))
    return getFilePath(defaultPath, folder, increment + 1);
  return filePath;
};

// Used to actually get the path of destination
const getPath = (defaultFilePath: string, folder: string | undefined) => {
  const fileName = path.basename(defaultFilePath);
  let filePath: string;

  if (!folder) {
    filePath = path.join(__dirname, '..', '..', 'uploads');
  } else {
    filePath = path.join(__dirname, '..', '..', 'uploads', folder);
  }

  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true });
  }

  return path.join(filePath, fileName);
};

class FileTypeError extends Error {}

// Controllers start here
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

    const folder = request.body.folder;
    const tempPath = request.file.path;

    const targetPath = getFilePath(
      path.join(__dirname, '..', '..', 'uploads', request.file.originalname),
      request.body.folder || undefined
    );
    const fileName = path.basename(targetPath);

    fs.rename(tempPath, targetPath, (error) => {
      if (error) {
        return response.status(500).send({
          message: `Something went wrong processing the file: ${error.message}`
        });
      }

      return response.status(200).send({
        message: `Successfully uploaded ${fileName}.`,
        url: `http://${request.get('host')}/${
          folder ? `${folder}/${fileName}` : fileName
        }`
      });
    });
  });
};

export const deleteFile = (request: Request, response: Response) => {
  const url = request.body.url;
  if (!url) {
    return response
      .status(422)
      .send({ message: 'A URL needs to the file needs to be provided.' });
  }

  const extractedPath = url.replace(/^.*\/\/[^\/]+/, '');
  const fileName = path.basename(extractedPath);
  const filePath = path.join(__dirname, '..', '..', 'uploads', extractedPath);

  if (!fs.existsSync(filePath)) {
    return response.status(404).send({
      message: 'URL provided does not seem to lead to a file on the server.'
    });
  }

  if (fs.lstatSync(filePath).isDirectory()) {
    return response.status(403).send({
      message: 'Cannot delete a directory. URL provided must lead to a file.'
    });
  }

  fs.unlink(filePath, (error) => {
    if (error) {
      return response.status(403).send({
        message: 'Cannot delete a directory. URL provided must lead to a file.'
      });
    }

    return response
      .status(200)
      .send({ message: `File '${fileName}' deleted.` });
  });
};
