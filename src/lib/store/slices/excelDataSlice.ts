import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as XLSX from 'xlsx';

// Define the structure of a row in your Excel data
export interface ExcelRow {
  [key: string]: any;
}

// Define the state structure for this slice
interface ExcelDataState {
  data: ExcelRow[];
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ExcelDataState = {
  data: [],
  loading: 'idle',
  error: null,
};

// Define constants for Excel processing (can be moved to a config file if needed)
const FILE_PATH = '/Inpatient_Pharmacy_Reference_Build.xlsx';
const SHEET_NAME = 'Order Sentences';
const HEADER_ROW = 2; // 1-indexed

// Async thunk for fetching and parsing Excel data
export const fetchExcelData = createAsyncThunk<
  ExcelRow[], // Return type of the payload creator
  void,       // First argument to the payload creator (not used here)
  { rejectValue: string } // Optional types for thunkAPI
>(
  'excelData/fetchData',
  async (_, { rejectWithValue }) => {
    console.log('[excelDataSlice] Starting fetch for:', FILE_PATH);
    try {
      const response = await fetch(FILE_PATH);
      if (!response.ok) {
        console.error('[excelDataSlice] Failed to fetch Excel file:', response.statusText);
        return rejectWithValue(`Failed to fetch Excel file: ${response.statusText}`);
      }
      console.log('[excelDataSlice] Successfully fetched:', FILE_PATH);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      if (!workbook.SheetNames.includes(SHEET_NAME)) {
        console.error(`[excelDataSlice] Sheet "${SHEET_NAME}" not found.`);
        return rejectWithValue(`Sheet "${SHEET_NAME}" not found.`);
      }
      const worksheet = workbook.Sheets[SHEET_NAME];

      console.log(`[excelDataSlice] Parsing sheet data. Using data from row ${HEADER_ROW} (1-indexed) as headers.`);
      const rowsAsArrays: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (rowsAsArrays.length < HEADER_ROW) {
        const errorMsg = `Header row ${HEADER_ROW} is out of bounds. Sheet has ${rowsAsArrays.length} rows.`;
        console.error('[excelDataSlice]', errorMsg);
        return rejectWithValue(errorMsg);
      }

      const actualHeaders = rowsAsArrays[HEADER_ROW - 1];
      console.log('[excelDataSlice] Actual headers identified:', actualHeaders);

      const dataRowsAsArrays = rowsAsArrays.slice(HEADER_ROW);
      const jsonData: ExcelRow[] = dataRowsAsArrays.map((rowArray) => {
        const obj: ExcelRow = {};
        actualHeaders.forEach((header, index) => {
          if (header) {
            obj[String(header).trim()] = rowArray[index];
          }
        });
        return obj;
      });

      console.log(`[excelDataSlice] Successfully converted ${jsonData.length} rows to objects.`);
      if (jsonData.length > 0) {
        console.log('[excelDataSlice] Sample of parsed data (first object raw):', jsonData[0]);
      }
      return jsonData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[excelDataSlice] Error in fetchExcelData thunk:', err);
      return rejectWithValue(err.message);
    }
  }
);

const excelDataSlice = createSlice({
  name: 'excelData',
  initialState,
  reducers: {
    // Potential future sync reducers:
    // clearExcelData: (state) => {
    //   state.data = [];
    //   state.loading = 'idle';
    //   state.error = null;
    //   console.log('[excelDataSlice] Excel data cleared.');
    // },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExcelData.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
        console.log('[excelDataSlice] Fetching data: pending');
      })
      .addCase(fetchExcelData.fulfilled, (state, action: PayloadAction<ExcelRow[]>) => {
        state.loading = 'succeeded';
        state.data = action.payload;
        console.log('[excelDataSlice] Fetching data: succeeded. Rows:', action.payload.length);
      })
      .addCase(fetchExcelData.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload || action.error.message || 'Failed to fetch Excel data';
        console.error('[excelDataSlice] Fetching data: failed. Error:', state.error);
      });
  },
});

// Export reducer
export default excelDataSlice.reducer;

// Export potential synchronous actions if you add them
// export const { clearExcelData } = excelDataSlice.actions;

// Selectors (optional, but good practice)
export const selectAllExcelData = (state: { excelData: ExcelDataState }) => state.excelData.data;
export const selectExcelDataLoading = (state: { excelData: ExcelDataState }) => state.excelData.loading;
export const selectExcelDataError = (state: { excelData: ExcelDataState }) => state.excelData.error; 