import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createUser, deleteUser, getUser, listUsers, updateUser } from './users.controller.js';

export const usersRouter = Router();

const usersPagination = pagination({
  sortable: ['name', 'email', 'role', 'created_at'],
  defaultSort: 'created_at',
});

// User management is admin-only across the board.
usersRouter.get('/', authenticate, requireRole('admin'), usersPagination, listUsers);
usersRouter.get('/:id', authenticate, requireRole('admin'), getUser);
usersRouter.post('/', authenticate, requireRole('admin'), createUser);
usersRouter.put('/:id', authenticate, requireRole('admin'), updateUser);
usersRouter.delete('/:id', authenticate, requireRole('admin'), deleteUser);
