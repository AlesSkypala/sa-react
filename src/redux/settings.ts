import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SliceStateDraft } from './helpers';

export type AppSettings = {
    askGraphClose: boolean,
    activeContexts: number,
}

export const settingsSlice = createSlice({
    name: 'settings',
    initialState: {
        askGraphClose: true,
        activeContexts: 4,
    } as AppSettings,
    reducers: {
        set_settings: (_state, action: PayloadAction<Partial<AppSettings>>) => {
            Object.assign(_state, action.payload);
        },
    },
});

export type SettingsState = SliceStateDraft<typeof settingsSlice>;
export const {
    set_settings
} = settingsSlice.actions;

export default settingsSlice.reducer;
