// types/index.ts

export interface Profile {
  id: string
  kakao_id: string | null
  name: string
  birth_year: string
  topics: string[]
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Memory {
  id: string
  user_id: string
  session_id: string | null
  quote: string
  wc_index: number
  created_at: string
}
