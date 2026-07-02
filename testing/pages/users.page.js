export class UsersPage {
  constructor(page) {
    this.page = page
    this.addButton = page.getByRole("button", { name: /add user/i })
    this.searchInput = page.getByPlaceholder(/search by name or email/i)
    this.serverError = page.locator(".alert-danger")

    this.nameInput = page.locator("#user-name")
    this.emailInput = page.locator("#user-email")
    this.roleSelect = page.locator("#user-role")
    this.passwordInput = page.locator("#user-password")
    this.activeCheckbox = page.locator("#user-active")

    this.saveButton = page.getByRole("button", { name: /^save$/i })
    this.cancelButton = page.getByRole("button", { name: /^cancel$/i })

    this.confirmDialog = page.locator(".modal", { hasText: "Delete user?" })
    this.confirmDeleteButton = this.confirmDialog.getByRole("button", { name: /^confirm$/i })
  }

  async goto() {
    await this.page.goto("/#/users")
  }

  async openAddModal() {
    await this.addButton.click()
    await this.nameInput.waitFor({ state: "visible" })
  }

  async openEditModal(rowText) {
    await this.rowByText(rowText).getByRole("button", { name: /^edit$/i }).click()
    await this.nameInput.waitFor({ state: "visible" })
  }

  async fillForm({ name, email, role, password, isActive } = {}) {
    if (name !== undefined) await this.nameInput.fill(name)
    if (email !== undefined) await this.emailInput.fill(email)
    if (role !== undefined) await this.roleSelect.selectOption(role)
    if (password !== undefined) await this.passwordInput.fill(password)
    if (isActive !== undefined) {
      const checked = await this.activeCheckbox.isChecked()
      if (checked !== isActive) await this.activeCheckbox.click()
    }
  }

  async save() {
    await this.saveButton.click()
    await this.nameInput.waitFor({ state: "hidden" })
  }

  async searchFor(term) {
    await this.searchInput.fill(term)
  }

  async deleteRow(rowText) {
    await this.rowByText(rowText).getByRole("button", { name: /^delete$/i }).click()
    await this.confirmDeleteButton.click()
  }

  rowByText(text) {
    return this.page.locator("table tbody tr", { hasText: text })
  }
}
