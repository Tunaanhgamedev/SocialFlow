import { Router } from 'express';
import { listCampaigns, createCampaign, getCampaignById } from './campaign.controller.js';

const router = Router();

router.get('/', listCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaignById);

export { router as campaignRoutes };
