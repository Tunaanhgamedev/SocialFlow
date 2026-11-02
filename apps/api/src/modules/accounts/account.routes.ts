import { Router } from 'express';
import { listAccounts, createAccount, deleteAccount } from './account.controller.js';

const router = Router();

router.get('/', listAccounts);
router.post('/', createAccount);
router.delete('/:id', deleteAccount);

export { router as accountRoutes };
