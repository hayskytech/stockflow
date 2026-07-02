import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { warehouseSchema } from "@/features/warehouse/warehouse.schema"
import { useUpdateWarehouse, useWarehouse } from "@/features/warehouse/hooks/use-warehouse"

export function WarehousePage() {
  const { data: warehouse, isLoading } = useWarehouse()
  const updateWarehouse = useUpdateWarehouse()

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
      <PageHeader title="Warehouse" description="Warehouse name, address, contact, and bank transfer details" />
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
      phone: warehouse?.phone ?? "",
      email: warehouse?.email ?? "",
      bankName: warehouse?.bankName ?? "",
      accountHolderName: warehouse?.accountHolderName ?? "",
      accountNumber: warehouse?.accountNumber ?? "",
      ifscCode: warehouse?.ifscCode ?? "",
      upiId: warehouse?.upiId ?? "",
    },
    validators: { onSubmit: warehouseSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      setSavedMessage("")
      try {
        await onSubmit(value)
        setSavedMessage("Warehouse settings saved.")
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not save warehouse settings")
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
                <input
                  id="warehouse-phone"
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
