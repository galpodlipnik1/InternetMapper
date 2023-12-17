import express from 'express';

const router = express.Router();

import { getKnownLinks, getLinks, purgeModel } from '../controllers/link.js';

router.get('/link', getLinks);
router.get('/', getKnownLinks)
router.get('/purge', purgeModel)

export default router;