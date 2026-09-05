/**
 * Per-business Members (`/#/b/:businessId/members`) — replaces the old in-shell `/users` page
 * (multitenant_plan.md Phase 8; feature `frontend/src/features/members/`).
 *
 * A business admin adds admin/staff accounts to *this* business by email. A brand-new email also
 * needs a name + policy-compliant password; an existing user just gets a membership.
 *
 * Ids (from AddMemberModal / MemberRoleModal / MembersPage):
 *   #add-member-btn #members-search
 *   #member-email #member-role #member-name #member-password #add-member-submit
 *   #member-role-select #member-role-submit
 * Row actions ("Change role", "Remove") are behind the three-dot `RowActionsMenu`.
 */
export class MembersPage {
  constructor(page, businessId) {
    this.page = page
    this.businessId = businessId

    this.addButton = page.locator("#add-member-btn")
    this.searchInput = page.locator("#members-search")

    this.emailInput = page.locator("#member-email")
    this.roleSelect = page.locator("#member-role")
    this.nameInput = page.locator("#member-name")
    this.passwordInput = page.locator("#member-password")
    this.submitButton = page.locator("#add-member-submit")

    this.roleModalSelect = page.locator("#member-role-select")
    this.roleModalSubmit = page.locator("#member-role-submit")

    this.serverError = page.locator(".alert-danger")
  }

  async goto() {
    await this.page.goto(`/#/b/${this.businessId}/members`)
  }

  async openAddModal() {
    await this.addButton.click()
    await this.emailInput.waitFor({ state: "visible" })
  }

  async fillForm({ email, role, name, password } = {}) {
    if (email !== undefined) await this.emailInput.fill(email)
    if (role !== undefined) await this.roleSelect.selectOption(role)
    if (name !== undefined) await this.nameInput.fill(name)
    if (password !== undefined) await this.passwordInput.fill(password)
  }

  async submit() {
    await this.submitButton.click()
    await this.emailInput.waitFor({ state: "hidden" })
  }

  async searchFor(term) {
    await this.searchInput.fill(term)
  }

  rowByText(text) {
    return this.page.locator("table tbody tr", { hasText: text })
  }

  async _rowAction(rowText, nameRe) {
    await this.rowByText(rowText).getByRole("button", { name: /row actions/i }).click()
    await this.page.getByRole("button", { name: nameRe }).click()
  }

  async changeRole(rowText, role) {
    await this._rowAction(rowText, /change role/i)
    await this.roleModalSelect.waitFor({ state: "visible" })
    await this.roleModalSelect.selectOption(role)
    await this.roleModalSubmit.click()
    await this.roleModalSelect.waitFor({ state: "hidden" })
  }

  async removeMember(rowText) {
    await this._rowAction(rowText, /remove/i)
    await this.page
      .locator(".modal", { hasText: "Remove member?" })
      .getByRole("button", { name: /^confirm$/i })
      .click()
  }
}
