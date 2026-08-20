export interface PaymentOptions {
    currency?: "inr"
    amount: number
    orderId: string
    tenantId: number
    idempotencyKey?: string
}

export type GatewayPaymentStatus = "no_payment_required" | "paid" | "unpaid"

export interface PaymentSession {
    id: string
    paymentUrl: string
    paymentStatus : GatewayPaymentStatus
}

export interface CustomMetaData {
    orderId: string
}

export interface VerifiedSession {
    id: string
    metaData: CustomMetaData
    paymentStatus :GatewayPaymentStatus
}

export interface PaymentGateway {
    createSession: (options:PaymentOptions)=> Promise<PaymentSession> 
    getSession:(id:string)=> Promise<VerifiedSession>
}