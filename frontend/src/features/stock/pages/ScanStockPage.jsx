import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useProductOptions } from "@/hooks/use-product-options"
import { ROUTES } from "@/constants/routes"
import { SCAN } from "@/constants/app"
import { useScanSessionStore } from "@/features/stock/stock.store"
import { useCheckBarcodes, useCreateStock } from "@/features/stock/hooks/use-stock"
import { ScanInput, playErrorBuzz } from "@/components/common/ScanInput"
import { ScanSessionForm } from "@/features/stock/components/ScanSessionForm"
import { ScannedItemsList } from "@/features/stock/components/ScannedItemsList"
import { useFormatMoney } from "@/hooks/use-warehouse-details"

export function ScanStockPage() {
  const navigate = useNavigate()
  const formatMoney = useFormatMoney()
  const { data: products = [] } = useProductOptions()
  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products])

  const header = useScanSessionStore((s) => s.header)
  const items = useScanSessionStore((s) => s.items)
  const startSession = useScanSessionStore((s) => s.startSession)
  const endSession = useScanSessionStore((s) => s.endSession)
  const hasBarcode = useScanSessionStore((s) => s.hasBarcode)
  const addItem = useScanSessionStore((s) => s.addItem)
  const removeItem = useScanSessionStore((s) => s.removeItem)
  const clearItems = useScanSessionStore((s) => s.clearItems)
  const markVerified = useScanSessionStore((s) => s.markVerified)
  const markUnverified = useScanSessionStore((s) => s.markUnverified)
  const markConflicts = useScanSessionStore((s) => s.markConflicts)
  const removeConflicts = useScanSessionStore((s) => s.removeConflicts)

  const createStock = useCreateStock()
  const checkBarcodes = useCheckBarcodes()

  const [editingHeader, setEditingHeader] = useState(false)
  const [pendingHeader, setPendingHeader] = useState(null) // product changed with items scanned — needs confirm
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [scanFeedback, setScanFeedback] = useState(null) // { type, text } for the last scan
  const [serverError, setServerError] = useState("")
  const [result, setResult] = useState(null)

  const conflictCount = useMemo(() => items.filter((i) => i.status === "conflict").length, [items])

  // Advisory duplicate check: batch freshly scanned barcodes and verify them against the
  // server, debounced so one request covers a burst of scans instead of one per scan
  // (generalLimiter is tight). Failures downgrade to "unverified" — the import call
  // re-validates everything server-side anyway.
  const checkingKey = useMemo(
    () => items.filter((i) => i.status === "checking").map((i) => i.barcode).join("\u0000"),
    [items]
  )
  useEffect(() => {
    if (!checkingKey) return undefined
    const pending = checkingKey.split("\u0000")
    const delay = pending.length >= SCAN.VERIFY_BATCH_SIZE ? 0 : SCAN.VERIFY_DEBOUNCE_MS
    const timer = setTimeout(async () => {
      const batch = pending.slice(0, 100) // backend caps one check call at 100 barcodes
      try {
        const existing = await checkBarcodes.mutateAsync(batch)
        markVerified(batch, existing)
        if (existing.length > 0) {
          playErrorBuzz()
          setScanFeedback({
            type: "danger",
            text: `${existing.length} scanned barcode${existing.length === 1 ? " is" : "s are"} already in stock — remove the highlighted row${existing.length === 1 ? "" : "s"}`,
          })
        }
      } catch {
        markUnverified(batch)
      }
    }, delay)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingKey])

  function handleScan(barcode) {
    setServerError("")
    if (barcode.length > SCAN.BARCODE_MAX_LENGTH) {
      setScanFeedback({ type: "danger", text: `Scan rejected — longer than ${SCAN.BARCODE_MAX_LENGTH} characters (check the scanner configuration)` })
      return "invalid"
    }
    if (items.length >= SCAN.MAX_ITEMS) {
      setScanFeedback({ type: "warning", text: `Batch is full (${SCAN.MAX_ITEMS} items) — import this batch first, then keep scanning` })
      return "full"
    }
    if (hasBarcode(barcode)) {
      setScanFeedback({ type: "danger", text: `"${barcode}" is already in this batch` })
      return "duplicate"
    }
    addItem(barcode)
    setScanFeedback({ type: "success", text: `Added "${barcode}"` })
    return "added"
  }

  function handleHeaderSubmit(value) {
    // Changing the product invalidates every scanned unit — confirm before clearing.
    if (header && items.length > 0 && value.productId !== header.productId) {
      setPendingHeader(value)
      return
    }
    startSession(value)
    setEditingHeader(false)
  }

  async function handleImport() {
    setServerError("")
    if (conflictCount > 0) {
      setServerError(`Remove the ${conflictCount} conflicting item${conflictCount === 1 ? "" : "s"} before importing`)
      return
    }
    try {
      const data = await createStock.mutateAsync({
        productId: header.productId,
        invoiceNo: header.invoiceNo.trim(),
        invoiceDate: header.invoiceDate || undefined,
        mrp: Number(header.mrp),
        wsp: Number(header.wsp),
        size: header.size.trim() || undefined,
        note: header.note.trim() || undefined,
        // items are stored newest-first — commit in the order they were scanned
        barcodes: [...items].reverse().map((item) => item.barcode),
      })
      setResult(data)
      setScanFeedback(null)
      clearItems() // keep the header so "Scan more" continues against the same invoice
    } catch (err) {
      const details = err.response?.data?.details
      if (Array.isArray(details) && details.length > 0) {
        markConflicts(details)
        setServerError(
          `${details.length} barcode${details.length === 1 ? "" : "s"} already exist in stock — remove the highlighted row${details.length === 1 ? "" : "s"} and import again`
        )
      } else {
        setServerError(err.response?.data?.message ?? "Import failed — nothing was saved")
      }
    }
  }

  const showHeaderForm = !header || editingHeader

  return (
    <PageWrapper>
      <PageHeader
        title="Scan Stock"
        description="Add stock with a barcode scanner — one scan per physical item, imported as a single batch"
      />

      {showHeaderForm ? (
        <div className="card">
          <div className="card-header">Batch details</div>
          <div className="card-body">
            <ScanSessionForm
              products={activeProducts}
              initial={header}
              onSubmit={handleHeaderSubmit}
              onCancel={header ? () => setEditingHeader(false) : null}
            />
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-4">
            <div className="card">
              <div className="card-header">Batch details</div>
              <div className="card-body">
                <dl className="mb-0">
                  <dt>Product</dt>
                  <dd id="scan-header-product">{header.productName}</dd>
                  <dt>Invoice</dt>
                  <dd id="scan-header-invoice">
                    {header.invoiceNo}
                    {header.invoiceDate ? <span className="text-muted"> — {header.invoiceDate}</span> : null}
                  </dd>
                  <dt>MRP / WSP</dt>
                  <dd>
                    {formatMoney(header.mrp)} / {formatMoney(header.wsp)}
                  </dd>
                  {header.size ? (
                    <>
                      <dt>Size</dt>
                      <dd>{header.size}</dd>
                    </>
                  ) : null}
                  {header.note ? (
                    <>
                      <dt>Note</dt>
                      <dd>{header.note}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
              <div className="card-footer d-flex justify-content-between">
                <button
                  type="button"
                  id="scan-edit-header-button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setEditingHeader(true)}
                >
                  <i className="fas fa-pen mr-1" />
                  Edit details
                </button>
                <button
                  type="button"
                  id="scan-discard-button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => setConfirmDiscard(true)}
                >
                  <i className="fas fa-trash mr-1" />
                  Discard batch
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            <div className="card">
              <div className="card-body">
                {result ? (
                  <div>
                    <div className="alert alert-success" id="scan-import-success">
                      Imported {result.imported} unit{result.imported === 1 ? "" : "s"} of{" "}
                      <strong>{result.productName}</strong> against invoice <strong>{result.invoiceNo}</strong>.
                    </div>
                    <button
                      type="button"
                      id="scan-more-button"
                      className="btn btn-primary mr-2"
                      onClick={() => setResult(null)}
                    >
                      <i className="fas fa-barcode mr-1" />
                      Scan more against this invoice
                    </button>
                    <button
                      type="button"
                      id="scan-done-button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        endSession()
                        navigate(ROUTES.STOCK.LIST)
                      }}
                    >
                      Done — back to Stock
                    </button>
                  </div>
                ) : (
                  <>
                    <ScanInput disabled={false} onScan={handleScan} />

                    {scanFeedback ? (
                      <div className={`alert alert-${scanFeedback.type} py-2 mt-3 mb-0`} id="scan-feedback">
                        {scanFeedback.text}
                      </div>
                    ) : null}
                    {serverError ? (
                      <div className="alert alert-danger py-2 mt-3 mb-0" id="scan-server-error">
                        {serverError}
                      </div>
                    ) : null}

                    <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
                      <h5 className="mb-0">
                        <span className="badge badge-primary" id="scan-count">
                          {items.length}
                        </span>{" "}
                        item{items.length === 1 ? "" : "s"} scanned
                      </h5>
                      <div>
                        {conflictCount > 0 ? (
                          <button
                            type="button"
                            id="scan-remove-conflicts-button"
                            className="btn btn-outline-danger mr-2"
                            onClick={removeConflicts}
                          >
                            Remove {conflictCount} conflicting
                          </button>
                        ) : null}
                        <button
                          type="button"
                          id="scan-import-button"
                          className="btn btn-success"
                          disabled={items.length === 0 || createStock.isPending}
                          onClick={handleImport}
                        >
                          {createStock.isPending ? (
                            "Importing…"
                          ) : (
                            <>
                              <i className="fas fa-file-import mr-1" />
                              Import {items.length > 0 ? items.length : ""} item{items.length === 1 ? "" : "s"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <ScannedItemsList items={items} onRemove={removeItem} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingHeader)}
        title="Change product?"
        message={`Changing the product will clear the ${items.length} scanned item${items.length === 1 ? "" : "s"} in this batch. Continue?`}
        onConfirm={() => {
          clearItems()
          startSession(pendingHeader)
          setPendingHeader(null)
          setEditingHeader(false)
        }}
        onCancel={() => setPendingHeader(null)}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this batch?"
        message={`This will discard the batch details and all ${items.length} scanned item${items.length === 1 ? "" : "s"}. Nothing has been imported yet.`}
        onConfirm={() => {
          endSession()
          setConfirmDiscard(false)
          setScanFeedback(null)
          setServerError("")
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </PageWrapper>
  )
}
