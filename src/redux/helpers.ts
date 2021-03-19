import { Slice, SliceCaseReducers } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/internal';

export type SliceStateType<T> = T extends Slice<infer X, SliceCaseReducers<infer X>> ? X : never;
export type SliceStateDraft<T> = WritableDraft<SliceStateType<T>>;

export type DispatchProps<T> = {
    [k in keyof T]: T[k] extends { (...args: infer X): unknown } ? (...args: X) => void : never;
}

export type StateProps<T extends (state: S) => unknown, S = never> = ReturnType<T>; 
export type ReduxProps<T extends (state: S) => unknown, R, S = never> = StateProps<T, S> & DispatchProps<R>;