import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import {
  addMemberSchema,
  createBusinessSchema,
  idParamSchema,
  listBusinessesQuerySchema,
  updateBusinessSchema,
  updateMemberSchema,
  userIdParamSchema,
} from './businesses.schema.js';
import * as businessesService from './businesses.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Businesses — super admin only (see businesses.router.js)
// ---------------------------------------------------------------------------

/** GET /api/businesses */
export async function listBusinesses(req, res, next) {
  try {
    const filters = parseOrThrow(listBusinessesQuerySchema, {
      isActive: req.query.is_active,
      search: req.query.search,
    });
    const { rows, total } = await businessesService.listBusinesses(req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/businesses/:id */
export async function getBusiness(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    res.status(200).json(await businessesService.getBusinessById(id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/businesses */
export async function createBusiness(req, res, next) {
  try {
    const input = parseOrThrow(createBusinessSchema, req.body);
    const business = await businessesService.createBusiness(input, req.user.sub);
    res.status(201).json(business);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/businesses/:id */
export async function updateBusiness(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(updateBusinessSchema, req.body);
    res.status(200).json(await businessesService.updateBusiness(id, input));
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/businesses/:id — deactivate (plan decision 5). */
export async function deactivateBusiness(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await businessesService.deactivateBusiness(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** GET /api/businesses/:id/members — super admin inspecting any business's members. */
export async function listMembersForBusiness(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await businessesService.getBusinessById(id); // 404s for an unknown business
    const { rows, total } = await businessesService.listMembers(id, req.listQuery);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Members — scoped to /api/b/:businessId/members (businessId from req.business.id,
// set by resolveBusiness; never re-parsed from params here)
// ---------------------------------------------------------------------------

/** GET /api/b/:businessId/members */
export async function listMembers(req, res, next) {
  try {
    const { rows, total } = await businessesService.listMembers(req.business.id, req.listQuery);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/members */
export async function addMember(req, res, next) {
  try {
    const input = parseOrThrow(addMemberSchema, req.body);
    const member = await businessesService.addMember(req.business.id, input, req.user.sub);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/b/:businessId/members/:userId */
export async function updateMemberRole(req, res, next) {
  try {
    const { userId } = parseOrThrow(userIdParamSchema, req.params);
    const { role } = parseOrThrow(updateMemberSchema, req.body);
    const member = await businessesService.updateMemberRole(req.business.id, userId, role, req.user.sub);
    res.status(200).json(member);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/b/:businessId/members/:userId */
export async function removeMember(req, res, next) {
  try {
    const { userId } = parseOrThrow(userIdParamSchema, req.params);
    await businessesService.removeMember(req.business.id, userId, req.user.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
