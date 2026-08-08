import { ENV } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from './logger.js';

/**
 * Server-to-server MSG91 OTP Widget client — no browser SDK, no captcha, no `tokenAuth`.
 * MSG91 owns code generation, delivery, expiry and attempt limits; this app never sees or stores
 * the code itself, only the widget's `reqId` (bound to a phone in `otp_requests` — see
 * auth.service.js).
 *
 * Which send endpoint works depends on the widget's dashboard configuration and cannot be
 * detected from the widget id, so it is env-driven (`MSG91_SEND_PATH`):
 *   - `sendOtp`       — widget Integration = `web` AND Captcha Validation OFF
 *   - `sendOtpMobile` — widget Integration = `Mobile`
 * Point it at the wrong one and MSG91 answers HTTP 200 with `type: "error"` and either
 * "Invalid Captcha Token." or "Mobile requests are not allowed for this widget."
 * Run `npm run msg91:check -- 919876543210` to find out which one this account's widget accepts.
 */
const WIDGET_API_BASE = 'https://api.msg91.com/api/v5/widget';

/**
 * Every MSG91 call. Failures arrive at HTTP 200 with `type: "error"`, not as a 4xx, so callers
 * must branch on `type` rather than on the response status.
 */
async function postWidget(path, body) {
  let response;
  try {
    response = await fetch(`${WIDGET_API_BASE}/${path}`, {
      method: 'POST',
      headers: { authkey: ENV.MSG91_AUTH_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgetId: ENV.MSG91_WIDGET_ID, ...body }),
    });
  } catch (err) {
    logger.error({ err, path }, 'MSG91 request failed to reach the provider');
    throw new AppError(502, 'Could not reach the verification service. Please try again.');
  }

  if (!response.ok) {
    logger.error({ path, status: response.status }, 'MSG91 returned a non-OK status');
    throw new AppError(502, 'The verification service rejected the request. Please try again.');
  }

  return (await response.json().catch(() => ({}))) ?? {};
}

/**
 * Sends a code to `identifier` (a phone with country code and no leading `+`, e.g. 919876543210).
 * Returns MSG91's `reqId` — persist it server-side paired with the phone it went to; the client
 * must never supply its own `reqId`.
 */
export async function sendOtp(identifier) {
  const result = await postWidget(ENV.MSG91_SEND_PATH, { identifier });

  if (result.type !== 'success' || typeof result.message !== 'string') {
    // Widget misconfiguration lands here too — the raw provider text is logged, never returned.
    logger.error({ result, sendPath: ENV.MSG91_SEND_PATH }, 'MSG91 sendOtp failed');
    throw new AppError(502, 'Could not send the verification code. Please try again.');
  }

  return result.message;
}

/**
 * Asks MSG91 to verify `code` against a previously issued `reqId`. A wrong, expired or
 * already-used code comes back as `type: "error"` at HTTP 200 — hence the explicit `type` check.
 */
export async function verifyOtp(reqId, code) {
  const result = await postWidget('verifyOtp', { reqId, otp: code });
  return result.type === 'success';
}
