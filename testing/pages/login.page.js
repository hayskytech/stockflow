export class LoginPage {
  constructor(page) {
    this.page = page
    this.emailInput = page.getByPlaceholder("Email")
    this.passwordInput = page.getByPlaceholder("Password")
    this.submitButton = page.getByRole("button", { name: /sign in/i })
    this.serverError = page.locator(".alert-danger")
  }

  async goto() {
    await this.page.goto("/login")
  }

  async login(email, password) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
