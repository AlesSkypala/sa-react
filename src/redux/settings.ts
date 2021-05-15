import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SliceStateDraft } from './helpers';

export type AppSettings = {
    askGraphClose: boolean,
}

export const settingsSlice = createSlice({
    name: 'settings',
    initialState: {
        askGraphClose: true,
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
