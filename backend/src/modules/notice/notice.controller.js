import { AppError } from '../../middleware/errorHandler.js';
import { updateNoticeSchema } from './notice.schema.js';
import * as noticeService from './notice.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/notice */
export async function getNotice(req, res, next) {
  try {
    const notice = await noticeService.getNotice();
    res.status(200).json(notice);
  } catch (err) {
    next(err);
  }
}

/** GET /api/notice/public — unauthenticated, empty unless the notice is active */
export async function getPublicNotice(req, res, next) {
  try {
    const notice = await noticeService.getPublicNotice();
    res.status(200).json(notice);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/notice */
export async function updateNotice(req, res, next) {
  try {
    const input = parseOrThrow(updateNoticeSchema, req.body);
    const notice = await noticeService.updateNotice(input);
    res.status(200).json(notice);
  } catch (err) {
    next(err);
  }
}
