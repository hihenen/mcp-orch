'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Check for signup success message
  useEffect(() => {
    const signupSuccess = sessionStorage.getItem('signup-success')
    if (signupSuccess) {
      try {
        const data = JSON.parse(signupSuccess)
        const timeElapsed = Date.now() - data.timestamp
        
        // Show message if less than 10 minutes old
        if (timeElapsed < 10 * 60 * 1000) {
          toast({
            title: "가입 완료! 🎉",
            description: `${data.name}님, 이제 새 계정으로 로그인해주세요.`,
            variant: "default",
            duration: 4000,
          })
        }
        
        // Clean up
        sessionStorage.removeItem('signup-success')
      } catch (e) {
        console.error('Error parsing signup success data:', e)
        sessionStorage.removeItem('signup-success')
      }
    }
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email or password is incorrect.')
      } else {
        // Refresh session info and navigate to projects page
        await getSession()
        
        // Check if this is the first login from signup
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('from') === 'signup') {
          // Show welcome toast for first login
          toast({
            title: "첫 로그인 성공! 🚀",
            description: "MCP Orchestrator에 오신 것을 환영합니다! 이제 프로젝트를 시작해보세요.",
            variant: "default",
            duration: 6000,
          })
        }
        
        router.push('/projects')
        router.refresh()
      }
    } catch (error) {
      setError('An error occurred during login.')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Sign in to MCP Orchestrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
