import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Modal } from "@/components/ui/Modal"
import { MediaPickerField } from "@/components/common/MediaPickerField"
import { heroSlideSchema } from "@/features/heroSlides/heroSlides.schema"

export function HeroSlideFormModal({ open, slide, onClose, onSubmit, isSubmitting, serverError }) {
  const [imageUrl, setImageUrl] = useState(slide?.mediaUrl ?? null)

  const form = useForm({
    defaultValues: {
      mediaId: slide?.mediaId ?? "",
      linkUrl: slide?.linkUrl ?? "",
      isActive: slide ? Boolean(slide.isActive) : true,
    },
    validators: { onSubmit: heroSlideSchema },
    onSubmit: async ({ value }) => onSubmit(value),
  })

  return (
    <Modal
      open={open}
      title={slide ? "Edit Slide" : "Add Slide"}
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="hero-slide-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        id="hero-slide-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="mediaId">
          {(field) => (
            <>
              <MediaPickerField
                label="Slide Image"
                imageUrl={imageUrl}
                onChange={(media) => {
                  field.handleChange(media?.id ?? "")
                  setImageUrl(media?.url ?? null)
                }}
              />
              <small className="form-text text-muted d-block mb-3" style={{ marginTop: "-0.5rem" }}>
                Recommended aspect ratio: 16:9 — other ratios will be cropped to fit.
              </small>
              {field.state.meta.errors.length > 0 ? (
                <div className="invalid-feedback d-block mb-3">{field.state.meta.errors[0]?.message}</div>
              ) : null}
            </>
          )}
        </form.Field>

        <form.Field name="linkUrl">
          {(field) => (
            <div className="form-group">
              <label htmlFor="hero-slide-link">Link URL (optional)</label>
              <input
                id="hero-slide-link"
                type="url"
                className="form-control"
                placeholder="https://…"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <small className="form-text text-muted">Where the slide goes when clicked. Leave blank for a plain image.</small>
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
                id="hero-slide-active"
                type="checkbox"
                className="form-check-input"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="hero-slide-active">
                Active
              </label>
            </div>
          )}
        </form.Field>

        {serverError ? <div className="alert alert-danger py-2 mb-0">{serverError}</div> : null}
      </form>
    </Modal>
  )
}
