import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Request, Response } from 'express';
import { emailQueue, getQueueStats } from '../queues/emailQueue';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue as any) as any],
  serverAdapter,
});

export const bullBoardRouter = serverAdapter.getRouter();

export const getQueueMetrics = async (req: Request, res: Response) => {
  try {
    const stats = await getQueueStats();
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch queue statistics.',
      error: error.message,
    });
  }
};
