import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { MediaPickerField } from "@/components/common/MediaPickerField"
import { siteBrandingSchema, socialLinksSchema } from "@/features/settings/settings.schema"
import {
  useDeleteAllData,
  useSiteBranding,
  useSocialLinks,
  useUpdateSiteBranding,
  useUpdateSocialLinks,
} from "@/features/settings/hooks/use-settings"

const DELETED_LABELS = {
  products: "Products",
  orders: "Orders",
  stock: "Stock units",
  stockLedger: "Stock ledger entries",
  divisions: "Divisions",
  categories: "Categories",
  subCategories: "Sub-categories",
  media: "Media uploads",
  users: "Users",
}

export function SettingsPage() {
  const isDev = import.meta.env.DEV

  const [confirmText, setConfirmText] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState(null)
  const [serverError, setServerError] = useState("")

  const deleteAllData = useDeleteAllData()

  async function handleDelete() {
    setConfirmOpen(false)
    setServerError("")
    setResult(null)
    try {
      const data = await deleteAllData.mutateAsync()
      setResult(data.deleted)
      setConfirmText("")
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Delete failed — nothing may have been removed")
    }
  }

  return (
    <PageWrapper>
      <PageHeader title="Settings" description="Branding, social media links, and system administration" />

      <div className="card">
        <div className="card-body">
          <SiteBrandingForm />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <SocialLinksForm />
        </div>
      </div>

      {isDev ? (
        <div className="card border-danger">
          <div className="card-header bg-danger">
            <i className="fas fa-exclamation-triangle mr-1" />
            Danger Zone — development only
          </div>
          <div className="card-body">
            <p>
              <strong>Delete All Data</strong> removes every product, order, stock unit, stock ledger entry,
              the whole catalog (divisions, categories, sub-categories), media uploads (including files on
              disk) and all users except the seeded admin/staff accounts. Only warehouse settings and the
              seed users are kept. This cannot be undone.
            </p>

            {result ? (
              <div className="alert alert-success" id="settings-delete-result">
                <strong>All data deleted.</strong>
                <ul className="mb-0 mt-2">
                  {Object.entries(DELETED_LABELS).map(([key, label]) => (
                    <li key={key}>
                      {label}: {result[key] ?? 0}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {serverError ? (
              <div className="alert alert-danger py-2" id="settings-delete-error">
                {serverError}
              </div>
            ) : null}

            <div className="form-group">
              <label htmlFor="settings-delete-confirm-input">
                Type <strong>DELETE</strong> to enable the button
              </label>
              <input
                id="settings-delete-confirm-input"
                type="text"
                className="form-control"
                style={{ maxWidth: "16rem" }}
                value={confirmText}
                autoComplete="off"
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
            <button
              type="button"
              id="settings-delete-all-button"
              className="btn btn-danger"
              disabled={confirmText !== "DELETE" || deleteAllData.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {deleteAllData.isPending ? (
                "Deleting…"
              ) : (
                <>
                  <i className="fas fa-trash mr-1" />
                  Delete All Data
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete all data?"
        message="This permanently deletes all products, orders, stock, ledger entries, the catalog tree, media files and non-seed users. There is no way to undo this."
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </PageWrapper>
  )
}

function SiteBrandingForm() {
  const { data: branding, isLoading } = useSiteBranding()
  const updateSiteBranding = useUpdateSiteBranding()

  const [logoUrl, setLogoUrl] = useState(branding?.logoUrl ?? null)
  const [faviconUrl, setFaviconUrl] = useState(branding?.faviconUrl ?? null)
  const [serverError, setServerError] = useState("")
  const [savedMessage, setSavedMessage] = useState("")

  const form = useForm({
    defaultValues: {
      logoMediaId: branding?.logoMediaId ?? "",
      faviconMediaId: branding?.faviconMediaId ?? "",
    },
    validators: { onSubmit: siteBrandingSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      setSavedMessage("")
      try {
        await updateSiteBranding.mutateAsync(value)
        setSavedMessage("Branding saved.")
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not save branding")
      }
    },
  })

  if (isLoading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  return (
    <form
      id="site-branding-form"
      key={branding ? "loaded" : "new"}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <h5 className="mb-3">Branding</h5>
      <p className="text-muted small">The logo is shown in the storefront header. The favicon appears in the browser tab.</p>

      <div className="row">
        <div className="col-md-6">
          <form.Field name="logoMediaId">
            {(field) => (
              <>
                <MediaPickerField
                  label="Logo"
                  imageUrl={logoUrl}
                  onChange={(media) => {
                    field.handleChange(media?.id ?? "")
                    setLogoUrl(media?.url ?? null)
                  }}
                />
                {field.state.meta.errors.length > 0 ? (
                  <div className="invalid-feedback d-block mb-3">{field.state.meta.errors[0]?.message}</div>
                ) : null}
              </>
            )}
          </form.Field>
        </div>
        <div className="col-md-6">
          <form.Field name="faviconMediaId">
            {(field) => (
              <>
                <MediaPickerField
                  label="Favicon"
                  imageUrl={faviconUrl}
                  onChange={(media) => {
                    field.handleChange(media?.id ?? "")
                    setFaviconUrl(media?.url ?? null)
                  }}
                />
                <small className="form-text text-muted d-block mb-3" style={{ marginTop: "-0.5rem" }}>
                  A square image works best.
                </small>
                {field.state.meta.errors.length > 0 ? (
                  <div className="invalid-feedback d-block mb-3">{field.state.meta.errors[0]?.message}</div>
                ) : null}
              </>
            )}
          </form.Field>
        </div>
      </div>

      {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}
      {savedMessage ? <div className="alert alert-success py-2">{savedMessage}</div> : null}

      <div className="d-flex justify-content-end">
        <button id="site-branding-save-button" type="submit" className="btn btn-primary" disabled={updateSiteBranding.isPending}>
          {updateSiteBranding.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}

function SocialLinksForm() {
  const { data: socialLinks, isLoading } = useSocialLinks()
  const updateSocialLinks = useUpdateSocialLinks()

  const [serverError, setServerError] = useState("")
  const [savedMessage, setSavedMessage] = useState("")

  const form = useForm({
    defaultValues: {
      facebookUrl: socialLinks?.facebookUrl ?? "",
      instagramUrl: socialLinks?.instagramUrl ?? "",
      youtubeUrl: socialLinks?.youtubeUrl ?? "",
      whatsappUrl: socialLinks?.whatsappUrl ?? "",
    },
    validators: { onSubmit: socialLinksSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      setSavedMessage("")
      try {
        await updateSocialLinks.mutateAsync(value)
        setSavedMessage("Social media links saved.")
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not save social media links")
      }
    },
  })

  if (isLoading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  return (
    <form
      id="social-links-form"
      key={socialLinks ? "loaded" : "new"}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <h5 className="mb-3">Social Media Links</h5>
      <p className="text-muted small">Shown as icons in the storefront footer. Leave a field blank to hide it.</p>

      <div className="row">
        <div className="col-md-6">
          <form.Field name="facebookUrl">
            {(field) => (
              <div className="form-group">
                <label htmlFor="social-facebook-url">
                  <i className="fab fa-facebook mr-1" /> Facebook
                </label>
                <input
                  id="social-facebook-url"
                  className="form-control"
                  placeholder="https://facebook.com/yourpage"
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
        <div className="col-md-6">
          <form.Field name="instagramUrl">
            {(field) => (
              <div className="form-group">
                <label htmlFor="social-instagram-url">
                  <i className="fab fa-instagram mr-1" /> Instagram
                </label>
                <input
                  id="social-instagram-url"
                  className="form-control"
                  placeholder="https://instagram.com/yourpage"
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

      <div className="row">
        <div className="col-md-6">
          <form.Field name="youtubeUrl">
            {(field) => (
              <div className="form-group">
                <label htmlFor="social-youtube-url">
                  <i className="fab fa-youtube mr-1" /> YouTube
                </label>
                <input
                  id="social-youtube-url"
                  className="form-control"
                  placeholder="https://youtube.com/@yourchannel"
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
        <div className="col-md-6">
          <form.Field name="whatsappUrl">
            {(field) => (
              <div className="form-group">
                <label htmlFor="social-whatsapp-url">
                  <i className="fab fa-whatsapp mr-1" /> WhatsApp Channel
                </label>
                <input
                  id="social-whatsapp-url"
                  className="form-control"
                  placeholder="https://whatsapp.com/channel/..."
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

      {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}
      {savedMessage ? <div className="alert alert-success py-2">{savedMessage}</div> : null}

      <div className="d-flex justify-content-end">
        <button id="social-links-save-button" type="submit" className="btn btn-primary" disabled={updateSocialLinks.isPending}>
          {updateSocialLinks.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
