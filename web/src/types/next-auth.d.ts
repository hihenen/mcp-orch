import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      teamId?: string
      teamName?: string
      isAdmin?: boolean
      teams?: Array<{
        id: string
        name: string
        role: string
      }>
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    teamId?: string
    teamName?: string
    isAdmin?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    teamId?: string
    teamName?: string
    isAdmin?: boolean
    teams?: Array<{
      id: string
      name: string
      role: string
    }>
  }
}
