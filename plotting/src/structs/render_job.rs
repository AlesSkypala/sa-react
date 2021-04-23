use std::convert::TryInto;

use wasm_bindgen::prelude::*;

use crate::data::DataIdx;

#[wasm_bindgen]
pub struct RenderJob {
    pub clear: bool,

    x_type: String,

    pub x_from: f32,
    pub x_to: f32,
    pub y_from: f32,
    pub y_to: f32,

    pub render_grid: bool,
    pub render_axes: bool,
    pub render_labels: bool,

    pub margin: u32,

    traces: Vec<TraceStyle>,
}

#[wasm_bindgen]
impl RenderJob {
    #[wasm_bindgen(constructor)]
    pub fn new(x_type: String) -> Self {
        Self {
            clear: true,

            x_type,

            x_from: 0.0,
            x_to: 0.0,
            y_from: 0.0,
            y_to: 0.0,

            render_axes: true,
            render_grid: true,
            render_labels: true,

            margin: 0,

            traces: Vec::new(),
        }
    }

    pub fn add_trace(&mut self, idx: DataIdx, color: &[u8], width: u32) {
        self.traces.push(TraceStyle {
            idx,
            color: color.try_into().unwrap(),
            width,
        });
    }
}

// unbound methods
impl RenderJob {
    pub fn get_traces(&self) -> &Vec<TraceStyle> {
        &self.traces
    }

    pub fn get_x_type(&self) -> &String {
        &self.x_type
    }
}

// #[wasm_bindgen]
pub struct TraceStyle {
    pub idx: usize,
    pub color: [u8; 3],
    pub width: u32,
}