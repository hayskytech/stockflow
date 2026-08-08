/**
 * Diagnoses MSG91 widget credentials without going through the app.
 *
 *   npm run msg91:check -- 919876543210            # sends a real SMS, prints which endpoint works
 *   npm run msg91:check -- 919876543210 1234       # verifies a code against the last reqId printed
 *
 * MSG91 answers HTTP 200 even for failures, so read `type` in the output, not the status:
 *   "Invalid Captcha Token."                           -> widget Captcha Validation is ON
 *   "Mobile requests are not allowed for this widget." -> widget is `web`; use sendOtp
 *   "Unauthorized"                                     -> wrong authkey (tokenAuth is NOT the authkey)
 *
 * Whichever of sendOtp / sendOtpMobile returns `{ type: 'success' }` is the value MSG91_SEND_PATH
 * must hold. Note that `curl` misdiagnoses these endpoints (they answer 302 by design) — this
 * script uses fetch for that reason.
 */
const [identifier, otp] = process.argv.slice(2);

if (!identifier) {
  console.error('Usage: npm run msg91:check -- <identifier-with-country-code> [otp] [reqId]');
  process.exit(1);
}

const authkey = process.env.MSG91_AUTH_KEY;
const widgetId = process.env.MSG91_WIDGET_ID;

if (!authkey || !widgetId) {
  console.error('MSG91_AUTH_KEY and MSG91_WIDGET_ID must be set in backend/.env');
  process.exit(1);
}

/** One MSG91 widget call — mirrors utils/msg91.js, kept standalone so the check runs without the app. */
async function post(path, body) {
  const response = await fetch(`https://api.msg91.com/api/v5/widget/${path}`, {
    method: 'POST',
    headers: { authkey, 'content-type': 'application/json' },
    body: JSON.stringify({ widgetId, ...body }),
  });
  return response.json().catch(() => ({ error: 'non-JSON response', status: response.status }));
}

if (otp) {
  const reqId = process.argv[4];
  if (!reqId) {
    console.error('Verifying needs the reqId printed by the send step: npm run msg91:check -- <phone> <otp> <reqId>');
    process.exit(1);
  }
  console.log('verifyOtp    :', await post('verifyOtp', { reqId, otp }));
} else {
  console.log('sendOtp      :', await post('sendOtp', { identifier }));
  console.log('sendOtpMobile:', await post('sendOtpMobile', { identifier }));
}
