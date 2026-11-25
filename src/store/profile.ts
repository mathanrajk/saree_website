import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ICartItem {
  product: string;
  quantity: number;
}

export interface UserProfile {
  _id?: string;
  firebaseUid: string;
  name: string;
  email: string;
  emailVerified: boolean;
  photoURL?: string;
  OrderIds?: string[];
  cart?: ICartItem[];
}

export interface ProfileState {
  profile: UserProfile | null;
  token: string;
}

const initialState: ProfileState = {
  profile: null,
  token: localStorage.getItem("token") || "",
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.profile = action.payload;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      if (action.payload) {
        localStorage.setItem("token", action.payload);
      } else {
        localStorage.removeItem("token");
      }
    },
    clearProfile: (state) => {
      state.profile = null;
      state.token = "";
      localStorage.removeItem("token");
    },
    addToCartItem: (
      state,
      action: PayloadAction<{ product: string; quantity?: number }>
    ) => {
      if (state.profile) {
        if (!state.profile.cart) {
          state.profile.cart = [];
        }
        const exists = state.profile.cart.some(
          (item) =>
            (typeof item.product === "string"
              ? item.product
              : (item.product as any)?._id) === action.payload.product
        );
        if (!exists) {
          state.profile.cart.push({
            product: action.payload.product,
            quantity: action.payload.quantity ?? 1,
          });
        }
      }
    },
    removeFromCartItem: (state, action: PayloadAction<string>) => {
      if (state.profile && state.profile.cart) {
        state.profile.cart = state.profile.cart.filter(
          (item) =>
            (typeof item.product === "string"
              ? item.product
              : (item.product as any)?._id) !== action.payload
        );
      }
    },
    updateCartItemQuantity: (
      state,
      action: PayloadAction<{ product: string; quantity: number }>
    ) => {
      if (state.profile && state.profile.cart) {
        if (action.payload.quantity <= 0) {
          state.profile.cart = state.profile.cart.filter(
            (item) =>
              (typeof item.product === "string"
                ? item.product
                : (item.product as any)?._id) !== action.payload.product
          );
        } else {
          const item = state.profile.cart.find(
            (i) =>
              (typeof i.product === "string"
                ? i.product
                : (i.product as any)?._id) === action.payload.product
          );
          if (item) {
            item.quantity = action.payload.quantity;
          }
        }
      }
    },
    setCart: (state, action: PayloadAction<ICartItem[]>) => {
      if (state.profile) {
        state.profile.cart = action.payload;
      }
    },
    clearCart: (state) => {
      if (state.profile) {
        state.profile.cart = [];
      }
    },
  },
});

export const {
  setProfile,
  setToken,
  clearProfile,
  addToCartItem,
  removeFromCartItem,
  updateCartItemQuantity,
  setCart,
  clearCart,
} = profileSlice.actions;
export default profileSlice.reducer;
