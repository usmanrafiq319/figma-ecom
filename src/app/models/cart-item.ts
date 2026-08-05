
export interface CartModel{
cartItems:CartItem[]
total:number
}
export interface CartItem{
        productId: string,
        title: string,
        quantity: number,
        url: string,
        price: number,
}