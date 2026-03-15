import cron from 'node-cron';
import Asset from '../models/asset.model.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const checkAssetRepairs = async () => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - THIRTY_DAYS_MS);

  const assets = await Asset.find({ 'repairHistory.0': { $exists: true } })
    .populate({
      path: 'repairHistory.complaint',
      select: 'title status createdAt',
    })
    .lean();

  const recommendations = [];

  assets.forEach((asset) => {
    const recentRepairs = (asset.repairHistory || []).filter((entry) => {
      const date = new Date(entry.repairedAt || entry.createdAt);
      return date >= windowStart;
    });

    if (recentRepairs.length >= 3) {
      recommendations.push({
        assetId: asset._id,
        assetName: asset.assetName,
        roomNumber: asset.roomNumber,
        repairCount: recentRepairs.length,
        lastMaintenanceDate: asset.lastMaintenanceDate,
        recommendation: 'Replacement suggested due to frequent repairs',
      });
    }
  });

  if (recommendations.length) {
    await Promise.all(
      recommendations.map((rec) =>
        Asset.findByIdAndUpdate(rec.assetId, { replacementSuggested: true }),
      ),
    );
  }

  return recommendations;
};

export const startMaintenanceCron = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      const recommendations = await checkAssetRepairs();
      if (recommendations.length) {
        // eslint-disable-next-line no-console
        console.log('Replacement recommendations:', recommendations);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Maintenance cron failed:', error.message);
    }
  });
};
