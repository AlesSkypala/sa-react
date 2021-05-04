use std::{collections::HashSet, convert::TryInto, mem::size_of};

use wasm_bindgen::prelude::*;

use crate::data::DataIdx;

use super::RangePrec;

#[wasm_bindgen]
pub struct RenderJob {
    pub clear: bool,

    x_type: String,

    pub x_from: RangePrec,
    pub x_to:   RangePrec,
    pub y_from: RangePrec,
    pub y_to:   RangePrec,

    pub render_grid: bool,
    pub render_axes: bool,
    pub render_labels: bool,

    pub margin: u32,
    pub x_label_space: u32,
    pub y_label_space: u32,

    traces: Vec<TraceStyle>,
    bundles: Vec<usize>,
    bundle_blacklist: HashSet<usize>,
}

#[wasm_bindgen]
impl RenderJob {
    #[wasm_bindgen(constructor)]
    pub fn new(x_type: String, trace_count: usize, bundle_count: usize) -> Self {
        Self {
            clear: true,

            x_type,

            x_from: 0.0,
            x_to:   0.0,
            y_from: 0.0,
            y_to:   0.0,

            render_axes: true,
            render_grid: true,
            render_labels: true,

            margin: 0,
            x_label_space: 0,
            y_label_space: 0,

            traces: Vec::with_capacity(trace_count),
            bundles: Vec::with_capacity(bundle_count),
            bundle_blacklist: HashSet::new(),
        }
    }

    pub fn add_trace(&mut self, idx: DataIdx, color: &[u8], width: u32) {
        self.traces.push(TraceStyle {
            idx,
            color: color.try_into().unwrap(),
            width,
        });
    }

    pub fn add_bundle(&mut self, idx: usize) {
        self.bundles.push(idx);
    }

    pub fn blacklist_trace(&mut self, handle: DataIdx) {
        self.bundle_blacklist.insert(handle);
    }

    pub fn deserialize_traces(&mut self, data: &[u8]) {
        const TRACE_ROW_SIZE: usize = 2 * size_of::<u32>() + 3;

        for row in data.chunks_exact(TRACE_ROW_SIZE) {
            self.add_trace(
                usize::from_be_bytes(row[0..4].try_into().unwrap()),
                &row[8..11],
                u32::from_be_bytes(row[4..8].try_into().unwrap())
            );
        }
    }

    pub fn deserialize_blacklist(&mut self, data: &[u8]) {
        const ROW_SIZE: usize = size_of::<u32>();

        for row in data.chunks_exact(ROW_SIZE) {
            self.blacklist_trace(usize::from_be_bytes(row.try_into().unwrap()));
        }
    }
}

// unbound methods
impl RenderJob {
    pub fn get_traces(&self) -> &Vec<TraceStyle> {
        &self.traces
    }

    pub fn get_bundles(&self) -> &Vec<usize> {
        &self.bundles
    }

    pub fn get_x_type(&self) -> &String {
        &self.x_type
    }

    pub fn is_blacklisted(&self, handle: DataIdx) -> bool {
        self.bundle_blacklist.contains(&handle)
    }
}

// #[wasm_bindgen]
pub struct TraceStyle {
    pub idx: usize,
    pub color: [u8; 3],
    pub width: u32,
}
