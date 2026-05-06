// src/middleware/correlationId.ts — Attach a stable requestId to every request.
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const HEADER = 'x-request-id';

export const correlationId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers[HEADER];
  const id = (typeof incoming === 'string' && incoming) || uuidv4();
  req.requestId = id;
  res.setHeader(HEADER, id);
  next();
};
