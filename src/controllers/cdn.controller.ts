import { Request, Response } from 'express';
import fs, { promises as fsPromises } from 'fs';
import multer from 'multer';
import path from 'path';

const MAX_UPLOAD_SIZE = 100; // in MiB

// Cache configuration
interface CacheEntry {
  files: { name: string; url: string; mtime: number }[];
  expiresAt: number;
}
const fileCache: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Setup multer upload middleware
const fileFilter = (
  _: Request,
  file: Express.Multer.File,
  callback: Function
) => {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif|mp4/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return callback(null, true);
  }

  return callback(new FileTypeError('Only images and videos are allowed.'));
};

const upload = multer({
  dest: path.join(__dirname, '../temp'),
  limits: {
    fileSize: MAX_UPLOAD_SIZE * 1024 * 1024 // 20 MiB
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

// File listing
const getUploadsDir = () => path.join(__dirname, '..', '..', 'uploads');

function yearMonthFolder() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0'); // month is 0-based
  return `${yyyy}-${mm}`;
}

// Controllers start here
export const cdnUpload = (request: Request, response: Response) => {
  upload.single('file')(request, response, (error) => {
    if (error) {
      if (error instanceof FileTypeError) {
        return response
          .status(422)
          .send({ message: 'Only images are allowed.' });
      }

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return response.status(413).send({
            message: `The file uploaded was larger than the max size limit of ${MAX_UPLOAD_SIZE}MiB.`
          });
        }
      }
    }

    if (typeof request.file === 'undefined') {
      return response
        .status(422)
        .send({ message: 'A file was not provided in the request.' });
    }

    const folder =
      request.body.folder == 'screenshots'
        ? `screenshots/${yearMonthFolder()}`
        : request.body.folder;
    const tempPath = request.file.path;

    const targetPath = getFilePath(
      path.join(__dirname, '..', '..', 'uploads', request.file.originalname),
      folder || undefined
    );
    const fileName = path.basename(targetPath);

    fs.rename(tempPath, targetPath, (error) => {
      if (error) {
        return response.status(500).send({
          message: `Something went wrong processing the file: ${error.message}`
        });
      }

      delete fileCache[folder || ''];

      return response.status(200).send({
        message: `Successfully uploaded ${fileName}.`,
        url: `${request.protocol}://${request.get('host')}/${
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
      .send({ message: 'A URL to the file needs to be provided.' });
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

    const folder = path.dirname(extractedPath).replace(/^\/+/, ''); // Remove leading slashes
    delete fileCache[folder || ''];

    return response
      .status(200)
      .send({ message: `File '${fileName}' deleted.` });
  });
};

export const getFolders = async (request: Request, response: Response) => {
  try {
    const uploadsDir = getUploadsDir();
    if (!fs.existsSync(uploadsDir))
      fs.mkdirSync(uploadsDir, { recursive: true });

    // Helper function to recursively map all directories
    const walkDirectories = async (
      dir: string,
      baseDir: string
    ): Promise<string[]> => {
      let results: string[] = [];
      const entries = await fsPromises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);

          // Calculate the relative path from the root uploads folder
          // and ensure we use forward slashes (/) for the web, even on Windows
          const relativePath = path
            .relative(baseDir, fullPath)
            .replace(/\\/g, '/');
          results.push(relativePath);

          // Recursively scan this subdirectory
          const subResults = await walkDirectories(fullPath, baseDir);
          results = results.concat(subResults);
        }
      }
      return results;
    };

    // Start the recursive scan from the root uploads directory
    const folders = await walkDirectories(uploadsDir, uploadsDir);

    // Sort alphabetically so the tree view looks neat
    folders.sort();

    return response.status(200).json(folders);
  } catch (error: any) {
    return response
      .status(500)
      .json({ message: `Failed to fetch folders: ${error.message}` });
  }
};

export const getFiles = async (request: Request, response: Response) => {
  const folderParam = (request.query.folder as string) || '';
  const limit = parseInt(request.query.limit as string) || 20;
  const offset = parseInt(request.query.offset as string) || 0;

  const now = Date.now();
  const cacheKey = folderParam;

  let sortedFiles = [];

  // Check Cache
  if (fileCache[cacheKey] && fileCache[cacheKey].expiresAt > now) {
    sortedFiles = fileCache[cacheKey].files;
  } else {
    // Cache Miss - Read Disk
    const targetDir = path.join(getUploadsDir(), folderParam);

    if (!fs.existsSync(targetDir)) {
      return response.status(200).json({ files: [], hasMore: false });
    }

    try {
      const filenames = await fsPromises.readdir(targetDir);

      const filePromises = filenames.map(async (filename) => {
        const filePath = path.join(targetDir, filename);
        const stat = await fsPromises.stat(filePath);

        if (stat.isDirectory()) return null;

        return {
          name: filename,
          url: `${request.protocol}://${request.get('host')}/${folderParam ? `${folderParam}/` : ''}${filename}`,
          mtime: stat.mtimeMs
        };
      });

      const resolvedFiles = await Promise.all(filePromises);

      // Filter out nulls and sort newest first
      sortedFiles = resolvedFiles
        .filter(
          (f): f is { name: string; url: string; mtime: number } => f !== null
        )
        .sort((a, b) => b.mtime - a.mtime);

      // Save to cache
      fileCache[cacheKey] = {
        files: sortedFiles,
        expiresAt: Date.now() + CACHE_TTL
      };
    } catch (error: any) {
      return response
        .status(500)
        .json({ message: `Error reading directory: ${error.message}` });
    }
  }

  // Slice for Pagination
  const slicedFiles = sortedFiles.slice(offset, offset + limit);
  const hasMore = offset + limit < sortedFiles.length;

  return response.status(200).json({
    files: slicedFiles.map(({ name, url }) => ({ name, url })), // Strip mtime before sending
    hasMore
  });
};
