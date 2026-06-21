import { Router } from 'express';
import {
  cdnUpload,
  deleteFile,
  getFiles,
  getFolders,
  getStorageStats
} from '../controllers/cdn.controller';
import { canRead, isAuth } from '../middlewares/cdn.middleware';

// Create router
const router = Router();

// Setup routes
router.post('/upload', isAuth, cdnUpload);
router.delete('/delete', isAuth, deleteFile);

router.get('/api/folders', canRead, getFolders);
router.get('/api/files', canRead, getFiles);
router.get('/api/storage', canRead, getStorageStats);

export default router;
