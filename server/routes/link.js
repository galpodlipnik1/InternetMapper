import express from 'express';

const router = express.Router();

import { getLinks } from '../controllers/link.js';

router.get('/', getLinks);

export default router;