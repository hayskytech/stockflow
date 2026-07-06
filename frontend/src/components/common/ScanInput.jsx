import { useEffect, useRef, useState } from "react"
import { SCAN } from "@/constants/app"

// Web Audio beeps instead of sound assets — the operator is watching the garment,
// not the screen, so audio is the primary success/error channel while scanning.
let audioContext = null

function tone(frequency, durationMs, delayMs = 0) {
  try {
    audioContext = audioContext ?? new (window.AudioContext || window.webkitAudioContext)()
    const start = audioContext.currentTime + delayMs / 1000
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.25, start)
    oscillator.start(start)
    oscillator.stop(start + durationMs / 1000)
  } catch {
    // Audio unavailable (autoplay policy, no device) — visual feedback still works.
  }
}

export function playSuccessBeep() {
  tone(1320, 80)
}

export function playErrorBuzz() {
  tone(220, 140)
  tone(220, 140, 200)
}

/**
 * Dedicated capture input for a USB barcode scanner (HID keyboard emulation: the scanner
 * "types" the code and sends Enter). Keeps itself focused, guards against double-fired
 * scans, and beeps/buzzes based on the parent's verdict. `onScan(barcode)` must return
 * "added" for a good scan or any other string for a rejected one.
 */
export function ScanInput({ disabled, onScan }) {
  const inputRef = useRef(null)
  const [value, setValue] = useState("")
  const [focused, setFocused] = useState(false)
  const lastScanRef = useRef({ barcode: "", at: 0 })

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  function handleKeyDown(event) {
    if (event.key !== "Enter") return
    event.preventDefault()
    const barcode = value.trim()
    setValue("")
    if (!barcode) return

    const now = Date.now()
    if (lastScanRef.current.barcode === barcode && now - lastScanRef.current.at < SCAN.DOUBLE_SCAN_GUARD_MS) return
    lastScanRef.current = { barcode, at: now }

    if (onScan(barcode) === "added") playSuccessBeep()
    else playErrorBuzz()
  }

  return (
    <div>
      <div className="input-group input-group-lg">
        <div className="input-group-prepend">
          <span className="input-group-text">
            <i className="fas fa-barcode" />
          </span>
        </div>
        <input
          id="scan-barcode-input"
          ref={inputRef}
          type="text"
          className="form-control"
          placeholder={disabled ? "Fill in the batch details to start scanning" : "Scan a barcode…"}
          value={value}
          disabled={disabled}
          autoComplete="off"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
      {disabled ? null : focused ? (
        <small id="scan-status-ready" className="text-success">
          <i className="fas fa-circle mr-1" />
          Scanner ready — scan items now
        </small>
      ) : (
        <button
          type="button"
          id="scan-status-paused"
          className="btn btn-link btn-sm p-0 text-danger"
          onClick={() => inputRef.current?.focus()}
        >
          <i className="fas fa-pause-circle mr-1" />
          Scanner paused — click here to resume
        </button>
      )}
    </div>
  )
}
