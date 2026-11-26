import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User, Astrologer, Admin } from '../models/index.js';

export const sign = (role, id) => jwt.sign({ role, id }, config.jwtSecret, { expiresIn: config.jwtExpires });
export const verify = (token) => jwt.verify(token, config.jwtSecret);

const models = { user: User, astrologer: Astrologer, admin: Admin };

export const auth = (role) => async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Login required' });
    const payload = verify(token);
    if (payload.role !== role) return res.status(403).json({ message: 'Forbidden' });
    const doc = await models[role].findById(payload.id);
    if (!doc) return res.status(401).json({ message: 'Account not found' });
    if (doc.blocked || doc.status === 'blocked') return res.status(403).json({ message: 'Account blocked' });
    req[role] = doc;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
};

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
