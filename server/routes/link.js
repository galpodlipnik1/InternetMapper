import express from 'express';

const router = express.Router();

import { getKnownLinks, getLinks, purgeModel, test } from '../controllers/link.js';

router.get('/link', getLinks);
router.get('/', getKnownLinks)
router.get('/purge', purgeModel)
router.get('/test', test)

export default router;