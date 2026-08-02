import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { noticeSchema } from "@/features/notice/notice.schema"
import { useNotice, useUpdateNotice } from "@/features/notice/hooks/use-notice"

export function NoticePage() {
  const { data: notice, isLoading } = useNotice()
  const updateNotice = useUpdateNotice()

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
      <PageHeader title="Notice Board" description="Scrolling announcement text shown at the top of the storefront" />
      <div className="card">
        <div className="card-body">
          <NoticeForm
            key={notice ? "loaded" : "new"}
            notice={notice}
            onSubmit={(value) => updateNotice.mutateAsync(value)}
            isSubmitting={updateNotice.isPending}
          />
        </div>
      </div>
    </PageWrapper>
  )
}

function NoticeForm({ notice, onSubmit, isSubmitting }) {
  const [serverError, setServerError] = useState("")
  const [savedMessage, setSavedMessage] = useState("")

  const form = useForm({
    defaultValues: {
      message: notice?.message ?? "",
      isActive: notice ? Boolean(notice.isActive) : false,
    },
    validators: { onSubmit: noticeSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      setSavedMessage("")
      try {
        await onSubmit(value)
        setSavedMessage("Notice board saved.")
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not save notice board")
      }
    },
  })

  return (
    <form
      id="notice-form"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="message">
        {(field) => (
          <div className="form-group">
            <label htmlFor="notice-message">Notice text</label>
            <textarea
              id="notice-message"
              className="form-control"
              rows={3}
              maxLength={500}
              placeholder="e.g. Free shipping on orders above ₹2,000 — offer valid till 15th August."
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

      <form.Field name="isActive">
        {(field) => (
          <div className="form-group form-check">
            <input
              id="notice-active"
              type="checkbox"
              className="form-check-input"
              checked={field.state.value}
              onChange={(e) => field.handleChange(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="notice-active">
              Show on storefront
            </label>
          </div>
        )}
      </form.Field>

      {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}
      {savedMessage ? <div className="alert alert-success py-2">{savedMessage}</div> : null}

      <div className="d-flex justify-content-end">
        <button id="notice-save-button" type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
