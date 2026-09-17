import { Router } from 'express';
import { InventoryService } from '../inventory';

export const transactionsRouter = Router();

transactionsRouter.get('/', (req, res) => {
  const { type, startDate, endDate, search } = req.query as {
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };

  const transactions = InventoryService.getUnifiedTransactions({
    type,
    startDate,
    endDate,
    search,
  });

  return res.json(transactions);
});
