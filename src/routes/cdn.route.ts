import { Router } from "express";
import { cdnUpload, deleteFile } from '../controllers/cdn.controller';
import { isAuth } from '../middlewares/cdn.middleware';

// Create router
const router = Router();

// Setup routes
router.post('/upload', isAuth, cdnUpload);
router.delete('/delete', isAuth, deleteFile);

export default router;