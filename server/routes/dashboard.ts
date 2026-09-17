import { Router } from 'express';
import { InventoryService } from '../inventory';

export const dashboardRouter = Router();

dashboardRouter.get('/', (req, res) => {
  const { startDate, endDate } = req.query as {
    startDate?: string;
    endDate?: string;
  };

  const metrics = InventoryService.getDashboardMetrics(startDate, endDate);
  return res.json(metrics);
});
