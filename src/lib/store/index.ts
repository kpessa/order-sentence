import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';

import drugSearchReducer from './slices/drugSearchSlice';
import excelDataReducer from './slices/excelDataSlice';
import fdaDataReducer from './slices/fdaDataSlice';

// Create a noop storage for server-side rendering
const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

// Use localStorage on client, noop on server
const storage =
  typeof window !== 'undefined'
    ? createWebStorage('local')
    : createNoopStorage();

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['excelData', 'drugSearch', 'fdaData'], // Only persist these slices
};

const rootReducer = combineReducers({
  drugSearch: drugSearchReducer,
  excelData: excelDataReducer,
  fdaData: fdaDataReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        // Ignore the excelData.data path for serializability checks
        ignoredPaths: ['excelData.data'],
      },
      // Configure immutableCheck to ignore the large excelData.data path
      immutableCheck: {
        ignoredPaths: ['excelData.data'],
      },
    }),
});

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
