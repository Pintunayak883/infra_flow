import express from 'express';
import authRoutes from '../../routes/auth.routes.js';
import complaintRoutes from '../../routes/complaint.routes.js';
import adminRoutes from '../../routes/admin.routes.js';

export const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  app.use('/complaints', complaintRoutes);
  app.use('/admin', adminRoutes);
  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error('Test server error:', err);
    res.status(500).json({ message: err.message || 'Test server error' });
  });
  return app;
};
