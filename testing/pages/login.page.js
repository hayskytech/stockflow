export class LoginPage {
  constructor(page) {
    this.page = page
    this.passwordModeTab = page.locator("#login-mode-password")
    this.otpModeTab = page.locator("#login-mode-otp")
    this.identifierInput = page.locator("#login-identifier")
    this.passwordInput = page.locator("#login-password")
    this.passwordSubmitButton = page.locator("#login-password-submit")
    this.phoneInput = page.locator("#login-phone")
    this.otpInput = page.locator("#login-otp")
    this.sendOtpButton = page.locator("#login-otp-send")
    this.otpSubmitButton = page.locator("#login-otp-submit")
    this.serverError = page.locator(".alert-danger")
  }

  /** The app routes with `createHashRouter`, so the path lives after the `#`. */
  async goto() {
    await this.page.goto("/#/login")
  }

  /**
   * Signs in with a password. `identifier` is an email (admin/staff) or a phone number
   * (customers). The page opens on the OTP tab, so this switches tabs first — the password form
   * is not in the DOM until then.
   */
  async login(identifier, password) {
    await this.passwordModeTab.click()
    await this.identifierInput.fill(identifier)
    await this.passwordInput.fill(password)
    await this.passwordSubmitButton.click()
  }

  /**
   * Signs in with phone + OTP. Only usable against an MSG91 Demo Credential — a real number
   * gets a real SMS that no test can read (see CLAUDE.md > OTP).
   *
   * The OTP tab is a two-step form: the code input does not exist until "Send Code" has been
   * clicked, so the fills below must stay in this order.
   */
  async loginWithOtp(phone, otp) {
    await this.otpModeTab.click()
    await this.phoneInput.fill(phone)
    await this.sendOtpButton.click()
    await this.otpInput.fill(otp)
    await this.otpSubmitButton.click()
  }
}
