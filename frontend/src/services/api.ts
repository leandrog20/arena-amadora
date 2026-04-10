const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api'

interface RequestConfig extends RequestInit {
  requireAuth?: boolean
}

interface CacheEntry {
  data: unknown
  timestamp: number
}

const DEFAULT_CACHE_TTL = 60_000 // 60s
const STALE_TTL = 300_000 // 5min — dados stale ainda podem ser mostrados enquanto revalida

class ApiClient {
  private baseUrl: string
  private cache = new Map<string, CacheEntry>()
  private inflightRequests = new Map<string, Promise<unknown>>()
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }

  private clearTokens() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  private async refreshAccessToken(): Promise<boolean> {
    // Dedup: se já tem um refresh em andamento, reutiliza
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) return false

      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })

        if (!response.ok) {
          this.clearTokens()
          return false
        }

        const data = await response.json()
        this.setTokens(data.data.accessToken, data.data.refreshToken)
        return true
      } catch {
        this.clearTokens()
        return false
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  private getCached<T>(key: string, ttl: number): { data: T; fresh: boolean } | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    const age = Date.now() - entry.timestamp
    if (age < ttl) return { data: entry.data as T, fresh: true }
    if (age < STALE_TTL) return { data: entry.data as T, fresh: false } // stale mas usável
    this.cache.delete(key)
    return null
  }

  invalidateCache(prefix?: string) {
    if (!prefix) {
      this.cache.clear()
      return
    }
    for (const key of this.cache.keys()) {
      if (key.includes(prefix)) this.cache.delete(key)
    }
  }

  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { requireAuth = true, ...fetchConfig } = config
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      ...(fetchConfig.headers as Record<string, string>),
    }

    // Só envia Content-Type json se tiver body
    if (fetchConfig.body) {
      headers['Content-Type'] = 'application/json'
    }

    if (requireAuth) {
      const token = this.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    let response = await fetch(url, {
      ...fetchConfig,
      headers,
    })

    // Token expirado, tentar refresh
    if (response.status === 401 && requireAuth) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`
        response = await fetch(url, { ...fetchConfig, headers })
      } else {
        this.clearTokens()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        throw new Error('Sessão expirada')
      }
    }

    const data = await response.json()

    if (!response.ok) {
      throw {
        status: response.status,
        code: data.code,
        message: data.message,
        errors: data.errors,
      }
    }

    return data
  }

  async get<T>(endpoint: string, config?: RequestConfig & { cacheTtl?: number }): Promise<T> {
    const ttl = config?.cacheTtl ?? DEFAULT_CACHE_TTL
    const cacheKey = endpoint

    const cached = this.getCached<T>(cacheKey, ttl)

    // Cache fresco: retorna direto, sem request
    if (cached?.fresh) return cached.data

    // Dedup: se já tem uma requisição idêntica em voo, retorna stale enquanto espera
    const inflight = this.inflightRequests.get(cacheKey)
    if (inflight) {
      return cached ? cached.data : (inflight as Promise<T>)
    }

    const promise = this.request<T>(endpoint, { ...config, method: 'GET' })
      .then((data) => {
        this.cache.set(cacheKey, { data, timestamp: Date.now() })
        return data
      })
      .finally(() => {
        this.inflightRequests.delete(cacheKey)
      })

    this.inflightRequests.set(cacheKey, promise)

    // Stale-while-revalidate: retorna stale de imediato, revalida em background
    if (cached) return cached.data

    return promise
  }

  async post<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
    this.invalidateCache()
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
    this.invalidateCache()
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> {
    this.invalidateCache()
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    this.invalidateCache()
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }
}

export const api = new ApiClient(API_URL)
