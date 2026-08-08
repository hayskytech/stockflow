import { useMutation } from "@tanstack/react-query"
import { completeProfileApi } from "@/features/auth/auth.api"

const COMPLETE_PROFILE_MUTATION_KEY = "authCompleteProfile"

/** Submits the profile an OTP-created account is still missing. Resolves to the saved profile. */
export function useCompleteProfile() {
  return useMutation({
    mutationKey: [COMPLETE_PROFILE_MUTATION_KEY],
    mutationFn: completeProfileApi,
  })
}
