import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useForm } from "@tanstack/react-form"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PageHeader } from "@/components/common/PageHeader"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { ScanInput, playErrorBuzz } from "@/components/common/ScanInput"
import { ROUTES } from "@/constants/routes"
import { SCAN } from "@/constants/app"
import { useDispatchScanStore } from "@/features/dispatches/dispatches.store"
import { dispatchDetailsSchema } from "@/features/dispatches/dispatches.schema"
import {
  useCheckDispatchBarcodes,
  useCreateDispatch,
  useDispatchOrder,
} from "@/features/dispatches/hooks/use-dispatches"
import { DispatchImportModal } from "@/features/dispatches/components/DispatchImportModal"
import { DispatchScannedList } from "@/features/dispatches/components/DispatchScannedList"

const PROBLEM_STATUSES = ["wrong_product", "unavailable", "unknown"]

export function DispatchOrderPage() {
  const { id: orderId } = useParams()
  const { data: order, isLoading, isError } = useDispatchOrder(orderId)

  const items = useDispatchScanStore((s) => s.items)
  const startSession = useDispatchScanStore((s) => s.startSession)
  const endSession = useDispatchScanStore((s) => s.endSession)
  const hasBarcode = useDispatchScanStore((s) => s.hasBarcode)
  const addItem = useDispatchScanStore((s) => s.addItem)
  const removeItem = useDispatchScanStore((s) => s.removeItem)
  const applyCheckResults = useDispatchScanStore((s) => s.applyCheckResults)
  const markUnverified = useDispatchScanStore((s) => s.markUnverified)
  const removeProblems = useDispatchScanStore((s) => s.removeProblems)

  const createDispatch = useCreateDispatch()
  const checkBarcodes = useCheckDispatchBarcodes()

  const [scanFeedback, setScanFeedback] = useState(null)
  const [serverError, setServerError] = useState("")
  const [serverProblems, setServerProblems] = useState([])
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [result, setResult] = useState(null)

  // Opening a different order's dispatch page resets any stale scan session.
  useEffect(() => {
    startSession(orderId)
  }, [orderId, startSession])

  const problemCount = useMemo(() => items.filter((i) => PROBLEM_STATUSES.includes(i.status)).length, [items])

  const scannedByProduct = useMemo(() => {
    const counts = new Map()
    for (const item of items) {
      if (item.status !== "matched" && item.status !== "swap") continue
      counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1)
    }
    return counts
  }, [items])

  const totalOrdered = useMemo(
    () => (order?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    [order]
  )
  const countsMatch = useMemo(() => {
    if (!order) return false
    return order.items.every((item) => (scannedByProduct.get(item.productId) ?? 0) === item.quantity)
  }, [order, scannedByProduct])

  // Advisory check: batch freshly scanned barcodes, debounced so one request covers a burst
  // of scans (generalLimiter is tight). Failures downgrade to "unverified" — the dispatch
  // call re-validates everything server-side anyway.
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
        const results = await checkBarcodes.mutateAsync({ orderId, barcodes: batch })
        applyCheckResults(results)
        const problems = results.filter((r) => PROBLEM_STATUSES.includes(r.status))
        if (problems.length > 0) {
          playErrorBuzz()
          setScanFeedback({
            type: "danger",
            text: `${problems.length} scanned barcode${problems.length === 1 ? " has" : "s have"} a problem — check the highlighted row${problems.length === 1 ? "" : "s"}`,
          })
        }
      } catch {
        markUnverified(batch)
      }
    }, delay)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingKey])

  const form = useForm({
    defaultValues: { courierName: "", awbNumber: "", note: "" },
    validators: { onSubmit: dispatchDetailsSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      setServerProblems([])
      try {
        const data = await createDispatch.mutateAsync({
          orderId,
          // items are stored newest-first — commit in the order they were scanned
          barcodes: [...items].reverse().map((item) => item.barcode),
          courierName: value.courierName.trim() || undefined,
          awbNumber: value.awbNumber.trim() || undefined,
          note: value.note.trim() || undefined,
        })
        setResult(data)
        setScanFeedback(null)
        endSession()
      } catch (err) {
        const details = err.response?.data?.details
        if (Array.isArray(details) && details.length > 0) setServerProblems(details)
        else setServerError(err.response?.data?.message ?? "Dispatch failed — nothing was saved")
      }
    },
  })

  function handleScan(barcode) {
    setServerError("")
    setServerProblems([])
    if (barcode.length > SCAN.BARCODE_MAX_LENGTH) {
      setScanFeedback({ type: "danger", text: `Scan rejected — longer than ${SCAN.BARCODE_MAX_LENGTH} characters (check the scanner configuration)` })
      return "invalid"
    }
    if (hasBarcode(barcode)) {
      setScanFeedback({ type: "danger", text: `"${barcode}" is already in this batch` })
      return "duplicate"
    }
    if (items.length >= totalOrdered && totalOrdered > 0) {
      setScanFeedback({ type: "warning", text: `All ${totalOrdered} ordered unit${totalOrdered === 1 ? " is" : "s are"} already scanned — remove a row first to swap in a different unit` })
      return "full"
    }
    addItem(barcode)
    setScanFeedback({ type: "success", text: `Added "${barcode}"` })
    return "added"
  }

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </PageWrapper>
    )
  }

  if (isError || !order) {
    return (
      <PageWrapper>
        <div className="alert alert-danger">Order not found.</div>
        <Link to={ROUTES.ORDERS.LIST}>Back to Orders</Link>
      </PageWrapper>
    )
  }

  if (result) {
    return (
      <PageWrapper>
        <PageHeader title={`Dispatch ${result.dispatchNumber}`} description={`Order ${order.orderNumber} dispatched`} />
        <div className="alert alert-success" id="dispatch-success">
          Dispatched {result.items.length} unit{result.items.length === 1 ? "" : "s"} against order{" "}
          <strong>{order.orderNumber}</strong>.
        </div>
        <Link to={ROUTES.DISPATCHES.DETAIL(result.id)} id="dispatch-view-button" className="btn btn-primary mr-2">
          View dispatch
        </Link>
        <Link to={ROUTES.ORDERS.DETAIL(orderId)} className="btn btn-outline-secondary">
          Back to order
        </Link>
      </PageWrapper>
    )
  }

  if (order.status !== "accepted") {
    return (
      <PageWrapper>
        <PageHeader title={`Dispatch order ${order.orderNumber}`} />
        <div className="alert alert-warning" id="dispatch-wrong-status">
          This order is <strong>{order.status}</strong> — only accepted orders can be dispatched.
        </div>
        <Link to={ROUTES.ORDERS.DETAIL(orderId)} className="btn btn-outline-secondary">
          Back to order
        </Link>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title={`Dispatch order ${order.orderNumber}`}
        description="Scan each physical unit as it leaves the warehouse — scanning a different unit of the same product swaps it in automatically"
        actions={
          <>
            <button
              type="button"
              id="dispatch-import-button"
              className="btn btn-outline-primary mr-2"
              onClick={() => setImportOpen(true)}
            >
              <i className="fas fa-file-import mr-1" />
              Import barcodes
            </button>
            <Link to={ROUTES.ORDERS.DETAIL(orderId)} id="dispatch-back-button" className="btn btn-outline-secondary">
              <i className="fas fa-arrow-left mr-1" />
              Back to order
            </Link>
          </>
        }
      />

      <div className="row">
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">Order progress</div>
            <div className="card-body p-0">
              <table className="table mb-0" id="dispatch-progress-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Scanned</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const scanned = scannedByProduct.get(item.productId) ?? 0
                    const done = scanned === item.quantity
                    return (
                      <tr key={item.id}>
                        <td>{item.productName}</td>
                        <td className={`text-right ${done ? "text-success" : scanned > item.quantity ? "text-danger" : ""}`}>
                          {done ? <i className="fas fa-check mr-1" /> : null}
                          {scanned} / {item.quantity}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Courier details (optional)</div>
            <div className="card-body">
              <form
                id="dispatch-details-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
              >
                <form.Field name="courierName">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="dispatch-courier-name">Courier</label>
                      <input
                        id="dispatch-courier-name"
                        type="text"
                        className="form-control"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                      ) : null}
                    </div>
                  )}
                </form.Field>
                <form.Field name="awbNumber">
                  {(field) => (
                    <div className="form-group">
                      <label htmlFor="dispatch-awb-number">AWB / tracking number</label>
                      <input
                        id="dispatch-awb-number"
                        type="text"
                        className="form-control"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                      ) : null}
                    </div>
                  )}
                </form.Field>
                <form.Field name="note">
                  {(field) => (
                    <div className="form-group mb-0">
                      <label htmlFor="dispatch-note">Note</label>
                      <textarea
                        id="dispatch-note"
                        className="form-control"
                        rows={2}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <div className="invalid-feedback d-block">{field.state.meta.errors[0]?.message}</div>
                      ) : null}
                    </div>
                  )}
                </form.Field>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <ScanInput disabled={false} onScan={handleScan} />

              {scanFeedback ? (
                <div className={`alert alert-${scanFeedback.type} py-2 mt-3 mb-0`} id="dispatch-scan-feedback">
                  {scanFeedback.text}
                </div>
              ) : null}
              {serverError ? (
                <div className="alert alert-danger py-2 mt-3 mb-0" id="dispatch-server-error">
                  {serverError}
                </div>
              ) : null}
              {serverProblems.length > 0 ? (
                <div className="alert alert-danger py-2 mt-3 mb-0" id="dispatch-server-problems">
                  <strong>Dispatch rejected — nothing was saved:</strong>
                  <ul className="mb-0 pl-3">
                    {serverProblems.map((problem, index) => (
                      <li key={index}>{problem}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
                <h5 className="mb-0">
                  <span className="badge badge-primary" id="dispatch-scan-count">
                    {items.length}
                  </span>{" "}
                  of {totalOrdered} unit{totalOrdered === 1 ? "" : "s"} scanned
                </h5>
                <div>
                  {problemCount > 0 ? (
                    <button
                      type="button"
                      id="dispatch-remove-problems-button"
                      className="btn btn-outline-danger mr-2"
                      onClick={removeProblems}
                    >
                      Remove {problemCount} problem row{problemCount === 1 ? "" : "s"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    id="dispatch-discard-button"
                    className="btn btn-outline-secondary mr-2"
                    disabled={items.length === 0}
                    onClick={() => setConfirmDiscard(true)}
                  >
                    Discard scans
                  </button>
                  <button
                    type="submit"
                    form="dispatch-details-form"
                    id="dispatch-submit-button"
                    className="btn btn-success"
                    disabled={!countsMatch || problemCount > 0 || createDispatch.isPending}
                  >
                    {createDispatch.isPending ? (
                      "Dispatching…"
                    ) : (
                      <>
                        <i className="fas fa-truck mr-1" />
                        Dispatch {items.length > 0 ? items.length : ""} unit{items.length === 1 ? "" : "s"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              <DispatchScannedList items={items} onRemove={removeItem} />
            </div>
          </div>
        </div>
      </div>

      <DispatchImportModal
        open={importOpen}
        orderId={orderId}
        onClose={() => setImportOpen(false)}
        onImported={(data) => {
          setImportOpen(false)
          setResult(data)
          endSession()
        }}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard scanned units?"
        message={`This will clear all ${items.length} scanned unit${items.length === 1 ? "" : "s"}. Nothing has been dispatched yet.`}
        onConfirm={() => {
          endSession()
          startSession(orderId)
          setConfirmDiscard(false)
          setScanFeedback(null)
          setServerError("")
          setServerProblems([])
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </PageWrapper>
  )
}
