export interface CartProduct {
  _id: string;
  title: string;
  description?: string;
  price: number;
  newPrice?: number;
  offer: boolean;
  tag?: string;
  stock?: number;
  images?: {
    publicId?: string;
    url?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}
