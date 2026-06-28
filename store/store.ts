import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

import authReducer from "./Auth/authSlice";
import categoryReducer from "./Categoris/categorySlice";
import adminReducer from "./Admin/adminSlice";
import productReducer from "./products/productSlice";
import bannerReducer from "./products/bannerSlice";
import homeReducer from "./Home/homeSlice";
import cartReducer from "./cart/cartSlice";
import orderReducer from "./Order/orderSlice";
import dashboardReducer from "./Dashboard/dashboardSlice";
import walletReducer from "./wallet/walletSlice";
import reviewReducer from "./Review/reviewSlice";
import homeDashboardReducer from "./Dashboard/homeDashboardSlice";
import newsLetterReducer from "./Emails/newsLetterSlice";
import blogReducer from "./Blog/blogSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  category: categoryReducer,
  admin: adminReducer,
  product: productReducer,
  banner: bannerReducer,
  home: homeReducer,
  cart: cartReducer,
  order: orderReducer,
  dashboard: dashboardReducer,
  wallet: walletReducer,
  review: reviewReducer,
  homeDashboard: homeDashboardReducer,
  newsLetter: newsLetterReducer,
  blog: blogReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "home", "order", "wallet"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export default store;
