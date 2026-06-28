import type { Request, Response, NextFunction } from 'express';

export async function withRetry(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  retries = 2,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        await handler(req, res, next);
        return;
      } catch (err) {
        attempt += 1;
        if (attempt > retries) {
          next(err);
          return;
        }
        await new Promise((r) => setTimeout(r, 200 * attempt));
      }
    }
  };
}
