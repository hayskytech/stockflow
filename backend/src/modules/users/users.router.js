import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  createUser,
  deleteUser,
  getUser,
  listMySessions,
  listUsers,
  revokeMySession,
  updateUser,
} from './users.controller.js';

export const usersRouter = Router();

const usersPagination = pagination({
  sortable: ['name', 'email', 'role', 'created_at'],
  defaultSort: 'created_at',
});

// Self-service session management — any authenticated role (admin/staff/customer) manages
// their own sessions. Declared before `/:id` so `/me` is never captured by that param route.
usersRouter.get('/me/sessions', authenticate, listMySessions);
usersRouter.delete('/me/sessions/:sessionId', authenticate, revokeMySession);

// User management is admin-only across the board.
usersRouter.get('/', authenticate, requireRole('admin'), usersPagination, listUsers);
usersRouter.get('/:id', authenticate, requireRole('admin'), getUser);
usersRouter.post('/', authenticate, requireRole('admin'), createUser);
usersRouter.put('/:id', authenticate, requireRole('admin'), updateUser);
usersRouter.delete('/:id', authenticate, requireRole('admin'), deleteUser);
