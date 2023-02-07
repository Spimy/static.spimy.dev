import { Router } from "express";
import { cdnUpload } from '../controllers/cdn.controller';

// Create router
const router = Router();

// Setup routes
router.post('/upload', cdnUpload);

export default router;