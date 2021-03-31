import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>()
  useEffect(() => {
    prevCartRef.current = cart
  })
  const cartPreviousValue = prevCartRef.current ?? cart;
  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {

      const tempCart = [...cart];

      const productIndex = tempCart.findIndex(product => product.id === productId);
      const productExists = productIndex !== -1 && tempCart[productIndex];

      const response = await api.get<Stock>(`stock/${productId}`)
      const stockAmount = response.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;

      if (stockAmount <= currentAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = currentAmount + 1;
        tempCart[productIndex] = productExists;
      } else {
        const product = await api.get<Product>(`products/${productId}`);
        const tempProduct = {
          ...product.data,
          amount: 1
        }
        tempCart.push(tempProduct)
      }

      setCart(tempCart)

    } catch (e) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const tempCart = [...cart];

      const index = tempCart.findIndex(cart => cart.id === productId)

      if (index === -1) {
        throw Error;
      }

      tempCart.splice(index, 1)

      setCart(tempCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const response = await api.get<Stock>(`stock/${productId}`)

      const stockAmount = response.data.amount;

      if (stockAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const tempCart = [...cart];

      const index = tempCart.findIndex(cart => cart.id === productId)

      tempCart[index] = {
        ...tempCart[index],
        amount
      }

      setCart(tempCart)

    } catch (e) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
