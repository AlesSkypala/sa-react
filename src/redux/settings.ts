import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SliceStateDraft } from './helpers';

export type AppSettings = {
    darkMode: boolean,
    askGraphClose: boolean,
    activeContexts: number,
    favoriteDatasets: { source: string, id: string }[],
}

export const settingsSlice = createSlice({
    name: 'settings',
    initialState: {
        darkMode: false,
        askGraphClose: true,
        activeContexts: 4,
        favoriteDatasets: [],
    } as AppSettings,
    reducers: {
        set_settings: (_state, action: PayloadAction<Partial<AppSettings>>) => {
            Object.assign(_state, action.payload);
        },

        favorite_dataset: (state, action: PayloadAction<AppSettings['favoriteDatasets']>) => {
            state.favoriteDatasets.push(...action.payload);
        },

        unfavorite_dataset: (state, action: PayloadAction<AppSettings['favoriteDatasets']>) => {
            state.favoriteDatasets = state.favoriteDatasets.filter(f => !action.payload.some(d => f.id === d.id && f.source === d.source));
        }
    },
});

export type SettingsState = SliceStateDraft<typeof settingsSlice>;
export const {
    set_settings,
    favorite_dataset,
    unfavorite_dataset,
} = settingsSlice.actions;

export default settingsSlice.reducer;
