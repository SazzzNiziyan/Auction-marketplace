import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers so errors are forwarded to Express error middleware
 * without boilerplate try/catch in every route.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
