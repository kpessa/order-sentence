declare module 'redux-persist-indexeddb-storage' {
  import { Storage } from 'redux-persist';
  function createIndexedDBStorage(options?: { name?: string; storeName?: string }): Storage;
  export default createIndexedDBStorage;
} 