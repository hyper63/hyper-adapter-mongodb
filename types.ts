export type AdapterConfig = {
  url: string
  options?: {
    atlas?: {
      dataSource: string
      auth: EmailPasswordAuthOptions | ApiKeyAuthOptions | CustomJwtAuthOptions
    }
  }
}

// deno-lint-ignore no-explicit-any
export type Document = Record<string, any>

export interface EmailPasswordAuthOptions {
  email: string
  password: string
}

export interface ApiKeyAuthOptions {
  apiKey: string
}

export interface CustomJwtAuthOptions {
  jwtTokenString: string
}

export type AuthOptions =
  | EmailPasswordAuthOptions
  | ApiKeyAuthOptions
  | CustomJwtAuthOptions
