mod utils;

use plotters::coord::Shift;
use wasm_bindgen::prelude::*;
use plotters::prelude::*;
use plotters_canvas::CanvasBackend;
use std::ops::Range;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct GraphRenderer {
    elem_id: String,
    root: Option<DrawingArea<CanvasBackend, Shift>>,
    x_range: Range<f32>,
    y_range: Range<f32>,
}

#[wasm_bindgen]
impl GraphRenderer {

    #[wasm_bindgen(constructor)]
    pub fn new(elem: &str, x_from: f32, x_to: f32, y_from: f32, y_to: f32) -> GraphRenderer {
        let canvas = CanvasBackend::new(elem).expect("No such element was found.");

        GraphRenderer {
            elem_id: elem.into(),
            root: Option::Some(canvas.into_drawing_area()),
            x_range: (x_from..x_to),
            y_range: (y_from..y_to),
        }
    }

    pub fn clear(&self) {
        if let Option::Some(root) = &self.root {
            root.fill(&WHITE).expect("Couldn't repaint the window.");
        }
    }

    pub fn resize(&mut self, width: i32, height: i32) {
        if let Option::Some(_) = &self.root {
            self.root = Option::Some(self.root.take().unwrap().shrink((0, 0), (width, height)));
        }
    }

    pub fn set_extents(&mut self, extents: utils::GraphExtents) {
        self.x_range = extents.x_start..extents.x_end;

        if (extents.y_end - extents.y_start).abs() < f32::EPSILON {
            self.y_range = extents.y_start..(extents.y_start + 1.0);
        } else {
            self.y_range = extents.y_start..extents.y_end;
        }
    }

    pub fn draw_trace(&mut self, trace_ptr: usize) {
        if let Option::Some(root) = &self.root {

            let mut chart = ChartBuilder::on(&root)
                .margin(5)
                .x_label_area_size(30)
                .y_label_area_size(30)
                .build_cartesian_2d(self.x_range.clone(), self.y_range.clone()).expect("Failed to build range.");
        
            chart.configure_mesh();
        
            chart.draw_series(
                LineSeries::new(
                    utils::TraceIterator::new(trace_ptr, self.x_range.start, self.x_range.end),
                    &RED,
                )).expect("Failed to draw test series");
        }
    }

    pub fn draw_chart(&mut self) {
        if let Option::Some(root) = &self.root {
            let mut chart = ChartBuilder::on(root)
                .margin(5)
                .x_label_area_size(30)
                .y_label_area_size(30)
                .build_cartesian_2d(self.x_range.clone(), self.y_range.clone()).expect("Failed to build range.");
        
                chart.configure_mesh().draw().expect("Failed to draw the chart.");
        }
    }
}
