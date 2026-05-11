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

// Create a transform specifically for FDA data to exclude large fields
const fdaDataTransform = {
  in: (inboundState: any) => {
    // During rehydration, restore the state structure but without large data
    if (process.env.NODE_ENV === 'development') {
      console.log('[fdaDataTransform IN] Rehydrating FDA data');
    }
    
    // Handle null or undefined state
    if (!inboundState) {
      return inboundState;
    }
    
    // Ensure we have the proper structure even if data was excluded
    return {
      ...inboundState,
      dailyMedDetails: inboundState.dailyMedDetails || {},
      prioritizedSplsByDosageForm: inboundState.prioritizedSplsByDosageForm || {},
    };
  },
  out: (outboundState: any) => {
    // During persistence, exclude large data
    if (outboundState) {
      const originalSize = JSON.stringify(outboundState).length;
      
      // Create a new object excluding large fields
      const { dailyMedDetails, prioritizedSplsByDosageForm, ...smallData } = outboundState;
      
      // Include empty objects to maintain state structure
      const transformed = {
        ...smallData,
        dailyMedDetails: {}, // Don't persist XML content
        prioritizedSplsByDosageForm: {}, // Don't persist processed SPL data
      };
      
      const transformedSize = JSON.stringify(transformed).length;
      const savings = originalSize > 0 ? ((originalSize - transformedSize) / originalSize * 100).toFixed(1) : '0';
      
      if (process.env.NODE_ENV === 'development' && originalSize > 1024) {
        console.log(`[fdaDataTransform OUT] Applying storage transform - Original: ${(originalSize/1024).toFixed(1)}KB, Transformed: ${(transformedSize/1024).toFixed(1)}KB, Savings: ${savings}%`);
      }
      
      return transformed;
    }
    return outboundState;
  }
};

// Create slice-specific persist config for FDA data
const fdaDataPersistConfig = {
  key: 'fdaData',
  storage,
  transforms: [fdaDataTransform],
};

// Root persist config - don't include fdaData here since it has its own config
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['excelData', 'drugSearch'], // fdaData is handled separately
};

const rootReducer = combineReducers({
  drugSearch: drugSearchReducer,
  excelData: excelDataReducer,
  fdaData: persistReducer(fdaDataPersistConfig, fdaDataReducer),
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        // Ignore large data paths for serializability checks
        ignoredPaths: [
          'excelData.data',
          'fdaData.dailyMedDetails',
          'fdaData.prioritizedSplsByDosageForm'
        ],
      },
      // Configure immutableCheck to ignore large data paths
      immutableCheck: {
        ignoredPaths: [
          'excelData.data',
          'fdaData.dailyMedDetails', 
          'fdaData.prioritizedSplsByDosageForm'
        ],
      },
    }),
});

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
