import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { InfoTooltip } from "@/components/ui/InfoTooltip"
import { NumberField } from "@/components/ui/NumberField"
import { formatMoney } from "@/lib/format"
import { setEffectivePrice } from "@/lib/pricing"
import { MediaPickerField } from "@/components/common/MediaPickerField"
import { MediaGalleryPickerField } from "@/components/common/MediaGalleryPickerField"
import { useCategoryOptions, useSubCategoryOptions } from "@/hooks/use-catalog-options"
import { useSizeOptions } from "@/hooks/use-size-options"
import { productSchema } from "@/features/products/products.schema"
import { useCreateProduct, useDeleteProduct, useProduct, useUpdateProduct } from "@/features/products/hooks/use-products"
import { ROUTES } from "@/constants/routes"

export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: product, isLoading: isLoadingProduct } = useProduct(id)
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  async function handleSubmit(value) {
    const { initialStock, ...rest } = value
    const input = {
      ...rest,
      subCategoryId: value.subCategoryId || undefined,
      description: value.description || undefined,
      color: value.color || undefined,
      size: value.size || undefined,
    }
    if (id) {
      await updateProduct.mutateAsync({ id, input })
    } else {
      if (initialStock?.addStock) {
        input.initialStock = {
          quantity: Number(initialStock.quantity),
          invoiceNo: initialStock.invoiceNo,
          invoiceDate: initialStock.invoiceDate || undefined,
          note: initialStock.note || undefined,
        }
      }
      await createProduct.mutateAsync(input)
    }
    navigate(ROUTES.PRODUCTS.LIST)
  }

  async function handleDelete() {
    try {
      await deleteProduct.mutateAsync(id)
      navigate(ROUTES.PRODUCTS.LIST)
    } catch (err) {
      setDeleteError(err.response?.data?.message ?? "Could not delete product")
      setConfirmingDelete(false)
    }
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
      <PageHeader
        title={id ? "Edit Product" : "Add Product"}
        description={id ? "Update an existing product" : "Create a new product"}
        actions={
          id ? (
            <button type="button" className="btn btn-outline-danger" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          ) : null
        }
      />

      {deleteError ? <div className="alert alert-danger">{deleteError}</div> : null}

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

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete product?"
        message={`Are you sure you want to delete "${product?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </PageWrapper>
  )
}

function ProductForm({ product, onSubmit, onCancel, isSubmitting }) {
  const [serverError, setServerError] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState(product?.categoryId ?? "")
  const [photoUrl, setPhotoUrl] = useState(product?.productPhotoUrl ?? null)
  const [galleryImages, setGalleryImages] = useState(
    (product?.galleryImages ?? []).map((img) => ({ mediaId: img.mediaId, url: img.url }))
  )

  const { data: categories = [] } = useCategoryOptions()
  const { data: subCategories = [] } = useSubCategoryOptions(selectedCategoryId)
  const { data: sizes = [] } = useSizeOptions()

  const form = useForm({
    defaultValues: {
      productCode: product?.productCode ?? "",
      categoryId: product?.categoryId ?? "",
      subCategoryId: product?.subCategoryId ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      color: product?.color ?? "",
      size: product?.size ?? "",
      piecesPerSet: product?.piecesPerSet ?? 1,
      price: product?.price !== undefined ? Number(product.price) : 0,
      discountPercent: product?.discountPercent !== undefined ? Number(product.discountPercent) : 0,
      reorderLevel: product?.reorderLevel ?? 0,
      productPhotoMediaId: product?.productPhotoMediaId ?? null,
      galleryMediaIds: (product?.galleryImages ?? []).map((img) => img.mediaId),
      isActive: product ? Boolean(product.isActive) : true,
      initialStock: { addStock: false, quantity: "", invoiceNo: "", invoiceDate: "", note: "" },
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

  function handleReset() {
    form.reset()
    setServerError("")
    setSelectedCategoryId(product?.categoryId ?? "")
    setPhotoUrl(product?.productPhotoUrl ?? null)
    setGalleryImages((product?.galleryImages ?? []).map((img) => ({ mediaId: img.mediaId, url: img.url })))
  }

  return (
    <form
      id="product-form"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <h6 className="text-uppercase text-muted small font-weight-bold mb-3">Product Details</h6>

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

      <h6 className="text-uppercase text-muted small font-weight-bold mb-3 mt-4 pt-3 border-top">Classification</h6>

      <div className="row">
        <div className="col-md-6">
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

        <div className="col-md-6">
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
                <select
                  id="product-size"
                  className="form-control"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                >
                  <option value="">None</option>
                  {/* An existing product's size may predate this predefined list — keep it selectable
                      so re-saving the form doesn't silently blank it out. */}
                  {field.state.value && !sizes.some((s) => s.value === field.state.value) ? (
                    <option value={field.state.value}>{field.state.value} (not in list)</option>
                  ) : null}
                  {sizes.map((size) => (
                    <option key={size.id} value={size.value}>
                      {size.value}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <h6 className="text-uppercase text-muted small font-weight-bold mb-3 mt-4 pt-3 border-top">Pricing &amp; Stock</h6>

      <div className="row">
        <div className="col-md-3">
          <form.Field name="price">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-price">
                  Price
                  <InfoTooltip text="Listed price shown to customers." />
                </label>
                <NumberField id="product-price" field={field} step="0.01" min="0" max="10000000" prefix="₹" />
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-3">
          <form.Field name="discountPercent">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-discount-percent">
                  Discount %
                  <InfoTooltip text="Percentage off price. What the customer pays." />
                </label>
                <NumberField id="product-discount-percent" field={field} step="0.01" min="0" max="100" suffix="%" />
              </div>
            )}
          </form.Field>
        </div>
        {product ? (
          <div className="col-md-3">
            <div className="form-group">
              <label htmlFor="product-stock">
                Stock
                <InfoTooltip text="Available units, from stock intake." />
              </label>
              <input
                id="product-stock"
                className="form-control"
                value={`${product.quantityAvailable} available`}
                disabled
                readOnly
              />
              <small className="form-text text-muted">Add more via Stock Import.</small>
            </div>
          </div>
        ) : null}
        <div className="col-md-3">
          <form.Field name="reorderLevel">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-reorder-level">Reorder Level</label>
                <NumberField id="product-reorder-level" field={field} step="1" min="0" max="100000" />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <div className="row">
        <div className="col-md-3">
          <form.Field name="piecesPerSet">
            {(field) => (
              <div className="form-group">
                <label htmlFor="product-pieces-per-set">
                  Pieces per Set
                  <InfoTooltip text="How many physical pieces make up one sellable unit/order. Leave at 1 for a single item." />
                </label>
                <NumberField id="product-pieces-per-set" field={field} step="1" min="1" max="100" />
                {field.state.meta.errors.length > 0 ? (
                  <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                ) : null}
              </div>
            )}
          </form.Field>
        </div>
        <div className="col-md-9 d-flex align-items-center">
          <form.Subscribe selector={(state) => [state.values.price, state.values.discountPercent, state.values.piecesPerSet]}>
            {([price, discountPercent, piecesPerSet]) =>
              Number(piecesPerSet) > 1 ? (
                <p className="text-muted small mb-0" id="product-set-price-preview">
                  Set price: <strong>{formatMoney(setEffectivePrice(price, discountPercent, piecesPerSet))}</strong>{" "}
                  ({formatMoney(price)}/piece × {piecesPerSet})
                </p>
              ) : null
            }
          </form.Subscribe>
        </div>
      </div>

      {!product ? (
        <div className="row">
          <div className="col-12">
            <form.Field name="initialStock.addStock">
              {(field) => (
                <div className="form-group form-check">
                  <input
                    id="product-add-stock"
                    type="checkbox"
                    className="form-check-input"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="product-add-stock">
                    Add initial stock
                  </label>
                </div>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.values.initialStock.addStock}>
            {(addStock) =>
              addStock ? (
                <>
                  <div className="col-md-3">
                    <form.Field name="initialStock.quantity">
                      {(field) => (
                        <div className="form-group">
                          <label htmlFor="product-initial-stock-quantity">Quantity</label>
                          <input
                            id="product-initial-stock-quantity"
                            type="number"
                            min="1"
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
                  <div className="col-md-3">
                    <form.Field name="initialStock.invoiceNo">
                      {(field) => (
                        <div className="form-group">
                          <label htmlFor="product-initial-stock-invoice-no">Invoice number</label>
                          <input
                            id="product-initial-stock-invoice-no"
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
                  <div className="col-md-3">
                    <form.Field name="initialStock.invoiceDate">
                      {(field) => (
                        <div className="form-group">
                          <label htmlFor="product-initial-stock-invoice-date">Invoice date (optional)</label>
                          <input
                            id="product-initial-stock-invoice-date"
                            type="date"
                            className="form-control"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                  <div className="col-md-3">
                    <form.Field name="initialStock.note">
                      {(field) => (
                        <div className="form-group">
                          <label htmlFor="product-initial-stock-note">Note (optional)</label>
                          <input
                            id="product-initial-stock-note"
                            className="form-control"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                </>
              ) : null
            }
          </form.Subscribe>
        </div>
      ) : null}

      <div className="row">
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

      <h6 className="text-uppercase text-muted small font-weight-bold mb-3 mt-4 pt-3 border-top">Images</h6>

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

      <div
        className="d-flex justify-content-between align-items-center bg-white py-3 mt-3 border-top"
        style={{ position: "sticky", bottom: 0, zIndex: 10 }}
      >
        <button type="button" className="btn btn-outline-secondary" onClick={handleReset} disabled={isSubmitting}>
          Reset
        </button>
        <div>
          <button type="button" className="btn btn-secondary mr-2" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  )
}
