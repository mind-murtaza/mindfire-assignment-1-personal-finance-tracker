import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
	listCategories,
	createCategory,
	updateCategory,
	deleteCategory,
	type Category,
} from "../services/api/categories";
import type {
	CategoryCreateInput,
	CategoryUpdateInput,
} from "../lib/validation/category";
import { createLogger } from "../lib/logger";

const log = createLogger("categories");

export interface CategoriesState {
	byId: Record<string, Category>;
	allIds: string[];
	status: "idle" | "loading" | "succeeded" | "failed";
	error: string | null;
}

const initialState: CategoriesState = {
	byId: {},
	allIds: [],
	status: "idle",
	error: null,
};

export const fetchCategories = createAsyncThunk(
	"categories/fetchAll",
	async (query: { type: "income" | "expense" | undefined }, { rejectWithValue }) => {
		try {
			return await listCategories(query);
		} catch {
			log.error("fetchAll failed");
			return rejectWithValue("Failed to load categories");
		}
	}
);

export const createCategoryThunk = createAsyncThunk(
	"categories/create",
	async (payload: CategoryCreateInput, { rejectWithValue }) => {
		try {
			return await createCategory(payload);
		} catch {
			log.error("create failed");
			return rejectWithValue("Failed to create category");
		}
	}
);

export const updateCategoryThunk = createAsyncThunk(
	"categories/update",
	async (
		params: { id: string; payload: CategoryUpdateInput },
		{ rejectWithValue }
	) => {
		try {
			return await updateCategory(params.id, params.payload);
		} catch {
			log.error("update failed");
			return rejectWithValue("Failed to update category");
		}
	}
);

export const deleteCategoryThunk = createAsyncThunk(
	"categories/delete",
	async (id: string, { rejectWithValue }) => {
		try {
			await deleteCategory(id);
			return id;
		} catch {
			log.error("delete failed");
			return rejectWithValue("Failed to delete category");
		}
	}
);

const slice = createSlice({
	name: "categories",
	initialState,
	reducers: {
		upsertMany(state, action: PayloadAction<Category[]>) {
			for (const c of action.payload) {
				state.byId[c.id] = c;
				if (!state.allIds.includes(c.id)) state.allIds.push(c.id);
			}
		},
		clear(state) {
			state.byId = {};
			state.allIds = [];
			state.status = "idle";
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchCategories.pending, (state) => {
				state.status = "loading";
				state.error = null;
			})
			.addCase(
				fetchCategories.fulfilled,
				(state, action: PayloadAction<Category[]>) => {
					state.status = "succeeded";
					state.byId = {};
					state.allIds = [];
					for (const c of action.payload) {
						state.byId[c.id] = c;
						state.allIds.push(c.id);
					}
				}
			)
			.addCase(fetchCategories.rejected, (state, action) => {
				state.status = "failed";
				state.error = (action.payload as string) ?? "Failed to load categories";
			})

			.addCase(
				createCategoryThunk.fulfilled,
				(state, action: PayloadAction<Category>) => {
					const c = action.payload;
					state.byId[c.id] = c;
					if (!state.allIds.includes(c.id)) state.allIds.push(c.id);
				}
			)

			.addCase(
				updateCategoryThunk.fulfilled,
				(state, action: PayloadAction<Category>) => {
					const c = action.payload;
					state.byId[c.id] = c;
					if (!state.allIds.includes(c.id)) state.allIds.push(c.id);
				}
			)

			.addCase(
				deleteCategoryThunk.fulfilled,
				(state, action: PayloadAction<string>) => {
					const id = action.payload;
					delete state.byId[id];
					state.allIds = state.allIds.filter((x) => x !== id);
				}
			);
	},
});

export const { upsertMany, clear } = slice.actions;
export default slice.reducer;
