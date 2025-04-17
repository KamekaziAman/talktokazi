"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page as we're using a simplified login/registration flow
    router.push("/login")
  }, [router])

  return <div className="min-h-screen flex items-center justify-center">Redirecting to login...</div>
}
