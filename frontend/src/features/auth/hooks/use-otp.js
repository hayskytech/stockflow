import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { otpLoginApi, sendOtpApi } from "@/features/auth/auth.api"
import { apiErrorMessage } from "@/lib/errors"

const SEND_OTP_MUTATION_KEY = "authSendOtp"
const OTP_LOGIN_MUTATION_KEY = "authOtpLogin"

/** Long enough to discourage hammering the send endpoint, short enough that a genuinely
 *  undelivered SMS can be retried without the user giving up. */
const RESEND_COOLDOWN_SECONDS = 30

/** Requests a verification code for a phone number. `purpose` is "login" or "register". */
export function useSendOtp() {
  return useMutation({
    mutationKey: [SEND_OTP_MUTATION_KEY],
    mutationFn: sendOtpApi,
  })
}

/** Exchanges a phone number + code for a session. */
export function useOtpLogin() {
  return useMutation({
    mutationKey: [OTP_LOGIN_MUTATION_KEY],
    mutationFn: otpLoginApi,
  })
}

/**
 * The send half of an OTP flow: the mutation plus the resend cooldown and the number the code
 * actually went to.
 *
 * It wraps `useSendOtp` here rather than living inside a step component because the phone step
 * and the code step are never mounted at the same time — a cooldown owned by either would reset
 * the moment the flow moved between them, handing back a free resend.
 */
export function useOtpSender(purpose) {
  const sendOtp = useSendOtp()
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [sentTo, setSentTo] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (secondsLeft <= 0) return undefined
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  /** Resolves true only once the code is genuinely on its way, so callers can gate the step
   *  advance on it and never strand someone on a code step for a code that was never sent. */
  async function send(phone) {
    setError("")
    try {
      await sendOtp.mutateAsync({ phone, purpose })
      setSentTo(phone)
      setSecondsLeft(RESEND_COOLDOWN_SECONDS)
      return true
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send the code. Please try again."))
      return false
    }
  }

  return { send, sentTo, secondsLeft, error, isPending: sendOtp.isPending }
}
