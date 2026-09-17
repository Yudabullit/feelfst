import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './server/routes/auth';
import { productsRouter } from './server/routes/products';
import { stockInRouter } from './server/routes/stockIn';
import { salesRouter } from './server/routes/sales';
import { stockOutRouter } from './server/routes/stockOut';
import { expensesRouter } from './server/routes/expenses';
import { adjustmentsRouter } from './server/routes/adjustments';
import { dashboardRouter } from './server/routes/dashboard';
import { transactionsRouter } from './server/routes/transactions';
import { excelRouter } from './server/routes/excel';
import { settingsRouter } from './server/routes/settings';
import { chatRouter } from './server/routes/chat';
import { initChatWebSocketServer } from './server/chatService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS and Headers for Iframe & Cross-Origin Proxy Support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/stock-in', stockInRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/stock-out', stockOutRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/adjustments', adjustmentsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/excel', excelRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/chat', chatRouter);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  initChatWebSocketServer(server);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`FEELFST Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

