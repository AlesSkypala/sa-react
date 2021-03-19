import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/internal';
import { ModalComponent, ModalProps } from '../components/Modals';

export type ModalInfo<T extends ModalComponent<unknown>> = T extends ModalComponent<infer Result, infer Args> ? {
    type: new (props: ModalProps<Result, Args>) => T,
    args: Args;
    resolve?: (res?: Result) => void;
} : never;

type ModalsState = {
    modal?: ModalInfo<ModalComponent<unknown>>;
}

const modalsSlice = createSlice({
    name: 'modals',
    initialState: {
        modal: undefined
    } as ModalsState,
    reducers: {
        open_modal: <T extends ModalComponent<Result, Args>, Result, Args>(state: WritableDraft<ModalsState>, action: PayloadAction<ModalInfo<T>>) => {
            state.modal = { ...action.payload };
        },
        
        close_modal: (state, action: PayloadAction<unknown>) => {
            if (state.modal?.resolve) state.modal.resolve(action.payload);
            state.modal = undefined;
        }
    }
});


export const { open_modal, close_modal } = modalsSlice.actions;

export default modalsSlice.reducer;