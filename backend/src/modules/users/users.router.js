import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { requireSuperAdmin } from '../../middleware/requireSuperAdmin.js';
import {
  createUser,
  deleteUser,
  getUser,
  listAllSessions,
  listMySessions,
  listUsers,
  revokeAllSessionsForUser,
  revokeAnySession,
  revokeMySession,
  updateUser,
} from './users.controller.js';

export const usersRouter = Router();

// Sessions are user data, so they live in this module rather than a new one — but CLAUDE.md's
// Session Management section documents the admin endpoints under an `/admin` path distinct from
// `/users`, so this router is mounted separately (see app.js) to produce that exact external
// shape: GET /admin/sessions, DELETE /admin/sessions/:sessionId, DELETE /admin/users/:id/sessions.
export const adminSessionsRouter = Router();

const usersPagination = pagination({
  sortable: ['name', 'email', 'role', 'created_at'],
  defaultSort: 'created_at',
});

const adminSessionsPagination = pagination({
  sortable: ['created_at', 'last_used_at'],
  defaultSort: 'created_at',
});

// Self-service session management — any authenticated role (admin/staff/customer) manages
// their own sessions. Declared before `/:id` so `/me` is never captured by that param route.
usersRouter.get('/me/sessions', authenticate, listMySessions);
usersRouter.delete('/me/sessions/:sessionId', authenticate, revokeMySession);

// Global user directory — platform super-admin only (this router stays flat, no business context).
usersRouter.get('/', authenticate, requireSuperAdmin, usersPagination, listUsers);
usersRouter.get('/:id', authenticate, requireSuperAdmin, getUser);
usersRouter.post('/', authenticate, requireSuperAdmin, createUser);
usersRouter.put('/:id', authenticate, requireSuperAdmin, updateUser);
usersRouter.delete('/:id', authenticate, requireSuperAdmin, deleteUser);

// Admin session management — viewing/terminating another user's session is platform super-admin only.
adminSessionsRouter.get('/sessions', authenticate, requireSuperAdmin, adminSessionsPagination, listAllSessions);
adminSessionsRouter.delete('/sessions/:sessionId', authenticate, requireSuperAdmin, revokeAnySession);
adminSessionsRouter.delete('/users/:id/sessions', authenticate, requireSuperAdmin, revokeAllSessionsForUser);
