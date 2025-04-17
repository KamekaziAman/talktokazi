"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { loginUser, setUserPublicKey } from "@/lib/auth"
import { generateKeyPair, exportPublicKey, exportPrivateKey } from "@/lib/encryption"
import type { User } from "@/lib/types"

// Define a type for the error response
interface ErrorResponse {
  error: string;
  status: "error";
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true once the component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Clear any existing keys from localStorage
    if (isClient) {
      localStorage.removeItem("privateKey")
    }
  }, [isClient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!username.trim()) {
      setError("Username is required")
      setIsLoading(false)
      return
    }

    try {
      console.log("Attempting login with username:", username)
      
      // Login user
      const result = await loginUser(username, password)
      
      // Check if result is an error response
      if (result && typeof result === 'object' && 'status' in result && result.status === 'error') {
        // Cast to unknown first to avoid type errors
        const errorResult = result as unknown as ErrorResponse;
        setError(errorResult.error || "Login failed. Please try again.")
        setIsLoading(false)
        return
      }
      
      // If we got here, login was successful
      const user = result as User
      console.log("Login successful for user:", user)

      // Generate key pair for encryption
      const keyPair = await generateKeyPair()
      console.log("Key pair generated successfully")

      // Export keys
      const publicKeyString = await exportPublicKey(keyPair.publicKey)
      const privateKeyString = await exportPrivateKey(keyPair.privateKey)
      console.log("Keys exported successfully")

      // Store public key with user
      setUserPublicKey(user.id, publicKeyString)
      console.log("Public key stored for user")

      // Store private key in localStorage (in a real app, this would be more secure)
      if (isClient) {
        localStorage.setItem("privateKey", privateKeyString)
      }
      console.log("Private key stored in localStorage")

      // Redirect to appropriate page
      if (user.isAdmin) {
        console.log("User is admin, redirecting to admin page")
        router.push("/admin")
      } else {
        console.log("User is client, redirecting to chat page")
        router.push("/chat")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Login failed. Please try again. " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white p-4">
      <div className="w-full max-w-md">
        <Card className="bg-[#1e1e1e] border-[#2a2a2a] text-white">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <img src="/logo1.jpeg" alt="Logo" className="h-12 w-12 rounded-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold">TalkToKazi</h1>
            <p className="text-gray-400">Enter your credentials to continue</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-800 text-red-400 text-sm rounded-md">{error}</div>
              )}
              <div className="space-y-2">
                <Input
                  id="username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-[#2a2a2a] border-[#3a3a3a] text-white"
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-[#2a2a2a] border-[#3a3a3a] text-white"
                />
                <p className="text-xs text-gray-400">If this is your first time, a new account will be created.</p>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white"
                disabled={isLoading || !isClient} // Disable if not client or loading
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
