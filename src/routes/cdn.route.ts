import { Router } from "express";
import { cdnUpload } from '../controllers/cdn.controller';
import { isAuth } from '../middlewares/cdn.middleware';

// Create router
const router = Router();

// Setup routes
router.post('/upload', isAuth, cdnUpload);

export default router;