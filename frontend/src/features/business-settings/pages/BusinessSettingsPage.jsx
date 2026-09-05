import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { NumberField } from "@/components/ui/NumberField"
import { PhoneField } from "@/components/ui/PhoneField"
import { businessSettingsSchema } from "@/features/business-settings/business-settings.schema"
import { useBusinessSettings, useUpdateBusinessSettings } from "@/hooks/use-business-settings"

export function BusinessSettingsPage() {
  const { data: warehouse, isLoading } = useBusinessSettings()
  const updateWarehouse = useUpdateBusinessSettings()

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Business Settings"
        description="Business name, address, contact, phone/currency format, and bank transfer details"
      />
      <div className="card">
        <div className="card-body">
          <WarehouseForm
            key={warehouse?.id ?? "new"}
            warehouse={warehouse}
            onSubmit={(value) => updateWarehouse.mutateAsync(value)}
            isSubmitting={updateWarehouse.isPending}
          />
        </div>
      </div>
    </PageWrapper>
  )
}

function WarehouseForm({ warehouse, onSubmit, isSubmitting }) {
  const [serverError, setServerError] = useState("")
  const [savedMessage, setSavedMessage] = useState("")

  const form = useForm({
    defaultValues: {
      name: warehouse?.name ?? "",
      address: warehouse?.address ?? "",
      // Strip any pre-existing formatting (e.g. a baked-in "+91-" prefix from before this
      // field was digit-only) so it doesn't visually double up with the new prefix box —
      // keep only the last N digits, since a leading country code would otherwise remain.
      phone: (warehouse?.phone ?? "").replace(/\D/g, "").slice(-(warehouse?.phoneNumberLength ?? 10)),
      email: warehouse?.email ?? "",
      bankName: warehouse?.bankName ?? "",
      accountHolderName: warehouse?.accountHolderName ?? "",
      accountNumber: warehouse?.accountNumber ?? "",
      ifscCode: warehouse?.ifscCode ?? "",
      upiId: warehouse?.upiId ?? "",
      phoneCountryCode: warehouse?.phoneCountryCode ?? "+91",
      phoneNumberLength: warehouse?.phoneNumberLength ?? 10,
      currencySymbol: warehouse?.currencySymbol ?? "₹",
      currencyDecimalDigits: warehouse?.currencyDecimalDigits ?? 2,
    },
    validators: { onSubmit: businessSettingsSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      setSavedMessage("")
      try {
        await onSubmit(value)
        setSavedMessage("Business settings saved.")
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not save business settings")
      }
    },
  })

  return (
    <form
      id="warehouse-form"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <h5 className="mb-3">Warehouse Details</h5>

      <form.Field name="name">
        {(field) => (
          <div className="form-group">
            <label htmlFor="warehouse-name">Name</label>
            <input
              id="warehouse-name"
              className="form-control"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 ? (
              <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
            ) : null}
          </div>
        )}
      </form.Field>

      <form.Field name="address">
        {(field) => (
          <div className="form-group">
            <label htmlFor="warehouse-address">Address (optional)</label>
            <textarea
              id="warehouse-address"
              className="form-control"
              rows={2}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </div>
        )}
      </form.Field>

      <div className="row">
        <div className="col-md-6">
          <form.Field name="phone">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-phone">Phone (optional)</label>
                <PhoneField id="warehouse-phone" field={field} />
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-6">
          <form.Field name="email">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-email">Email (optional)</label>
                <input
                  id="warehouse-email"
                  type="email"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 ? (
                  <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                ) : null}
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <hr />
      <h5 className="mb-3">Bank Transfer Details</h5>
      <p className="text-muted small">Shown to customers on the checkout page so they can pay by bank transfer.</p>

      <div className="row">
        <div className="col-md-6">
          <form.Field name="bankName">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-bank-name">Bank name</label>
                <input
                  id="warehouse-bank-name"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-6">
          <form.Field name="accountHolderName">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-account-holder">Account holder name</label>
                <input
                  id="warehouse-account-holder"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          <form.Field name="accountNumber">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-account-number">Account number</label>
                <input
                  id="warehouse-account-number"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-4">
          <form.Field name="ifscCode">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-ifsc">IFSC code</label>
                <input
                  id="warehouse-ifsc"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-4">
          <form.Field name="upiId">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-upi">UPI ID (optional)</label>
                <input
                  id="warehouse-upi"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <hr />
      <h5 className="mb-3">App Settings</h5>
      <p className="text-muted small">Applied app-wide to every phone number field and every displayed money amount.</p>

      <div className="row">
        <div className="col-md-3">
          <form.Field name="phoneCountryCode">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-phone-country-code">Phone country code</label>
                <input
                  id="warehouse-phone-country-code"
                  className="form-control"
                  placeholder="+91"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 ? (
                  <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                ) : null}
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-3">
          <form.Field name="phoneNumberLength">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-phone-number-length">Phone number digits</label>
                <NumberField id="warehouse-phone-number-length" field={field} min="6" max="15" step="1" />
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-3">
          <form.Field name="currencySymbol">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-currency-symbol">Currency symbol</label>
                <input
                  id="warehouse-currency-symbol"
                  className="form-control"
                  placeholder="₹"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 ? (
                  <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                ) : null}
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-3">
          <form.Field name="currencyDecimalDigits">
            {(field) => (
              <div className="form-group">
                <label htmlFor="warehouse-currency-decimal-digits">Currency decimal digits</label>
                <NumberField id="warehouse-currency-decimal-digits" field={field} min="0" max="4" step="1" />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}
      {savedMessage ? <div className="alert alert-success py-2">{savedMessage}</div> : null}

      <div className="d-flex justify-content-end">
        <button id="warehouse-save-button" type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
