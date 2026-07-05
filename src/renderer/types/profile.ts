export interface Profile {
  id: string
  email: string
  paystack_customer_code: string | null
  credits_balance: number
  created_at?: string
}
