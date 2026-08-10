export interface Coupon {
    title: string,
    code: string,
    discount: number,
    tenantId:number
    validUpTo: Date
}