import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist-indexeddb-storage';

import drugSearchReducer from './slices/drugSearchSlice';
import excelDataReducer from './slices/excelDataSlice';

// We will import and add reducers here later
// import drugSearchReducer from './slices/drugSearchSlice';

const persistConfig = {
  key: 'root',
  version: 1,
  storage: storage('orderSentenceAppDB'), // Name your IndexedDB database
  whitelist: ['excelData'], // Only persist the excelData slice
};

const rootReducer = combineReducers({
  drugSearch: drugSearchReducer,
  excelData: excelDataReducer,
});

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

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;