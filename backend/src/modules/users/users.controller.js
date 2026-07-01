import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import { createUserSchema, idParamSchema, listUsersQuerySchema, updateUserSchema } from './users.schema.js';
import * as usersService from './users.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/users */
export async function listUsers(req, res, next) {
  try {
    const filters = parseOrThrow(listUsersQuerySchema, { role: req.query.role });
    const { rows, total } = await usersService.listUsers(req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/:id */
export async function getUser(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const user = await usersService.getUserById(id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

/** POST /api/users */
export async function createUser(req, res, next) {
  try {
    const input = parseOrThrow(createUserSchema, req.body);
    const user = await usersService.createUser(input);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/users/:id */
export async function updateUser(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(updateUserSchema, req.body);

    // Guard against an admin locking themselves out of their own account.
    if (id === req.user.sub && input.isActive === false) {
      throw new AppError(400, 'You cannot deactivate your own account');
    }

    const user = await usersService.updateUser(id, input);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/users/:id */
export async function deleteUser(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);

    // An admin deleting their own account would orphan the session — block it.
    if (id === req.user.sub) {
      throw new AppError(400, 'You cannot delete your own account');
    }

    await usersService.deleteUser(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
