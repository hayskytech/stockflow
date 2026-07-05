import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { MediaPickerField } from "@/components/common/MediaPickerField"
import { MediaGalleryPickerField } from "@/components/common/MediaGalleryPickerField"
import { useCategoryOptions, useDivisionOptions, useSubCategoryOptions } from "@/hooks/use-catalog-options"
import { productSchema } from "@/features/products/products.schema"
import { useCreateProduct, useProduct, useUpdateProduct } from "@/features/products/hooks/use-products"
import { ROUTES } from "@/constants/routes"

export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: product, isLoading: isLoadingProduct } = useProduct(id)
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  async function handleSubmit(value) {
    const input = {
      ...value,
      subCategoryId: value.subCategoryId || undefined,
      description: value.description || undefined,
      color: value.color || undefined,
      size: value.size || undefined,
    }
    if (id) {
      await updateProduct.mutateAsync({ id, input })
    } else {
      await createProduct.mutateAsync(input)
    }
    navigate(ROUTES.PRODUCTS.LIST)
  }

  if (id && isLoadingProduct) {
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
      <PageHeader title={id ? "Edit Product" : "Add Product"} description={id ? "Update an existing product" : "Create a new product"} />

      <div className="card">
        <div className="card-body">
          <ProductForm
            key={id ?? "new"}
            product={product}
            onSubmit={handleSubmit}
            onCancel={() => navigate(ROUTES.PRODUCTS.LIST)}
            isSubmitting={createProduct.isPending || updateProduct.isPending}
          />
        </div>
      </div>
    </PageWrapper>
  )
}

function ProductForm({ product, onSubmit, onCancel, isSubmitting }) {
  const [serverError, setServerError] = useState("")
  const [selectedDivisionId, setSelectedDivisionId] = useState(product?.divisionId ?? "")
  const [selectedCategoryId, setSelectedCategoryId] = useState(product?.categoryId ?? "")
  const [photoUrl, setPhotoUrl] = useState(product?.productPhotoUrl ?? null)
  const [galleryImages, setGalleryImages] = useState(
    (product?.galleryImages ?? []).map((img) => ({ mediaId: img.mediaId, url: img.url }))
  )

  const { data: divisions = [] } = useDivisionOptions()
  const { data: categories = [] } = useCategoryOptions(selectedDivisionId)
  const { data: subCategories = [] } = useSubCategoryOptions(selectedCategoryId)

  const form = useForm({
    defaultValues: {
      productCode: product?.productCode ?? "",
      categoryId: product?.categoryId ?? "",
      subCategoryId: product?.subCategoryId ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      color: product?.color ?? "",
      size: product?.size ?? "",
      mrp: product?.mrp !== undefined ? Number(product.mrp) : 0,
      wsp: product?.wsp !== undefined ? Number(product.wsp) : 0,
      reorderLevel: product?.reorderLevel ?? 0,
      unit: product?.unit ?? "pc",
      productPhotoMediaId: product?.productPhotoMediaId ?? null,
      galleryMediaIds: (product?.galleryImages ?? []).map((img) => img.mediaId),
      isActive: product ? Boolean(product.isActive) : true,
    },
    validators: { onSubmit: productSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      try {
        await onSubmit(value)
      } catch (err) {
        setServerError(err.response?.data?.message ?? "Could not save product")
      }
    },
  })

  return (
    <form
      id="product-form"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="productCode">
        {(field) => (
          <div className="form-group">
            <label htmlFor="product-code">Product Code</label>
            <input
              id="product-code"
              className="form-control"
              placeholder="e.g. MW-SHRT-0042"
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

      <form.Field name="name">
        {(field) => (
          <div className="form-group">
            <label htmlFor="product-name">Name</label>
            <input
              id="product-name"
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

      <form.Field name="description">
        {(field) => (
          <div className="form-group">
            <label htmlFor="product-description">Description (optional)</label>
            <textarea
              id="product-description"
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
        <div className="col-md-4">
          <div className="form-group">
            <label htmlFor="product-division">Division</label>
            <select
              id="product-division"
              className="form-control"
              value={selectedDivisionId}
              onChange={(e) => {
                setSelectedDivisionId(e.target.value)
                setSelectedCategoryId("")
                form.setFieldValue("categoryId", "")
                form.setFieldValue("subCategoryId", "")
              }}
            >
              <option value="">Select a division…</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="col-md-4">
          <form.Field name="categoryId">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-category">Category</label>
                <select
                  id="product-category"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                    setSelectedCategoryId(e.target.value)
                    form.setFieldValue("subCategoryId", "")
                  }}
                  onBlur={field.handleBlur}
                  disabled={!selectedDivisionId}
                >
                  <option value="">Select a category…</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {field.state.meta.errors.length > 0 ? (
                  <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                ) : null}
              </div>
            )}
          </form.Field>
        </div>

        <div className="col-md-4">
          <form.Field name="subCategoryId">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-sub-category">Sub-category (optional)</label>
                <select
                  id="product-sub-category"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!selectedCategoryId}
                >
                  <option value="">None</option>
                  {subCategories.map((subCategory) => (
                    <option key={subCategory.id} value={subCategory.id}>
                      {subCategory.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <form.Field name="color">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-color">Color (optional)</label>
                <input
                  id="product-color"
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
          <form.Field name="size">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-size">Size (optional)</label>
                <input
                  id="product-size"
                  className="form-control"
                  placeholder="S / M / L / 32…"
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
        <div className="col-md-3">
          <form.Field name="mrp">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-mrp">MRP</label>
                <input
                  id="product-mrp"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber || 0)}
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
          <form.Field name="wsp">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-wsp">WSP</label>
                <input
                  id="product-wsp"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber || 0)}
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
          <div className="form-group">
            <label htmlFor="product-stock">Stock</label>
            <input
              id="product-stock"
              className="form-control"
              value={product ? `${product.quantityAvailable} available` : "Starts at 0"}
              disabled
              readOnly
            />
            <small className="form-text text-muted">Add inventory via Stock Import.</small>
          </div>
        </div>
        <div className="col-md-3">
          <form.Field name="reorderLevel">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-reorder-level">Reorder Level</label>
                <input
                  id="product-reorder-level"
                  type="number"
                  step="1"
                  min="0"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber || 0)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          <form.Field name="unit">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-unit">Unit</label>
                <input
                  id="product-unit"
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
        <div className="col-md-4 d-flex align-items-center">
          <form.Field name="isActive">
            {(field) => (
              <div className="form-group form-check mt-4">
                <input
                  id="product-active"
                  type="checkbox"
                  className="form-check-input"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="product-active">
                  Active
                </label>
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <form.Field name="productPhotoMediaId">
        {(field) => (
          <MediaPickerField
            label="Product Photo (optional)"
            imageUrl={photoUrl}
            onChange={(media) => {
              field.handleChange(media?.id ?? null)
              setPhotoUrl(media?.url ?? null)
            }}
          />
        )}
      </form.Field>

      <form.Field name="galleryMediaIds">
        {(field) => (
          <MediaGalleryPickerField
            label="Gallery Images (optional, up to 5)"
            images={galleryImages}
            onChange={(images) => {
              setGalleryImages(images)
              field.handleChange(images.map((img) => img.mediaId))
            }}
          />
        )}
      </form.Field>

      {serverError ? <div className="alert alert-danger py-2">{serverError}</div> : null}

      <div className="d-flex justify-content-end">
        <button type="button" className="btn btn-secondary mr-2" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
