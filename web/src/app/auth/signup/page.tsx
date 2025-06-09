'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // 기본 검증
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          organizationName: formData.organizationName || `${formData.name}의 조직`
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '회원가입 중 오류가 발생했습니다.')
      }

      // 회원가입 성공 시 로그인 페이지로 이동
      router.push('/auth/signin?message=회원가입이 완료되었습니다. 로그인해주세요.')
    } catch (error) {
      setError(error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">회원가입</CardTitle>
          <CardDescription className="text-center">
            MCP Orchestrator 계정을 생성하세요
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
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="홍길동"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organizationName">조직명 (선택사항)</Label>
              <Input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="회사명 또는 팀명"
                value={formData.organizationName}
                onChange={handleChange}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                비워두면 개인 조직이 자동으로 생성됩니다.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="최소 8자 이상"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              회원가입
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
            <Link href="/auth/signin" className="text-primary hover:underline">
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
