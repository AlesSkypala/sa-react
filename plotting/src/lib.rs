pub mod utils;

use std::rc::Rc;
use std::cell::RefCell;
use wasm_bindgen::prelude::*;
use plotters::coord::Shift;
use plotters::prelude::*;
use plotters_canvas::{{ CanvasBackend, OffscreenCanvasBackend }};
use std::ops::Range;
use web_sys::{{ HtmlCanvasElement, OffscreenCanvas }};

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_obj(s: &JsValue);
}


#[wasm_bindgen]
pub struct GraphRenderer {
    root: Option<DrawingArea<CanvasBackend, Shift>>,
    x_range: Range<f32>,
    y_range: Range<f32>,
}

#[wasm_bindgen]
impl GraphRenderer {
    #[wasm_bindgen]
    pub fn new_from_canvas(elem: HtmlCanvasElement, x_from: f32, x_to: f32, y_from: f32, y_to: f32) -> GraphRenderer {
        let canvas = CanvasBackend::with_canvas_object(elem).expect("Couldn't create a backend from canvas.");

        GraphRenderer {
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

#[wasm_bindgen]
pub struct OffscreenGraphRenderer {
    backend: Rc<RefCell<OffscreenCanvasBackend>>,
    root: Option<DrawingArea<OffscreenCanvasBackend, Shift>>,
    x_range: Range<f32>,
    y_range: Range<f32>,
}

#[wasm_bindgen]
impl OffscreenGraphRenderer {

    #[wasm_bindgen(constructor)]
    pub fn new(elem: OffscreenCanvas, x_from: f32, x_to: f32, y_from: f32, y_to: f32) -> Self {
        let canvas = Rc::new(RefCell::new(OffscreenCanvasBackend::new(elem.clone()).expect("Couldn't create a backend from canvas.")));

        Self {
            root: Option::Some((&canvas).into()),
            backend: canvas,
            x_range: (x_from..x_to),
            y_range: (y_from..y_to),
        }
    }

    pub fn clear(&self) {
        if let Option::Some(root) = &self.root {
            root.fill(&WHITE).expect("Couldn't repaint the window.");
        }
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        (*self.backend).borrow_mut().set_size(width, height);

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
                .build_cartesian_2d(self.x_range.clone(), self.y_range.clone())
                .expect("Failed to build range.");
        
            chart.configure_mesh();
        
            chart.draw_series(
                LineSeries::new(
                    utils::TraceIterator::new(trace_ptr, self.x_range.start, self.x_range.end),
                    &RED,
                )).expect("Failed to draw test series");

            // root.present().expect("Failed to present the trace.");
        }
    }

    pub fn draw_chart(&mut self) {
        if let Option::Some(root) = &self.root {
            let mut chart = ChartBuilder::on(root)
                .margin(5)
                .x_label_area_size(30)
                .y_label_area_size(30)
                .build_cartesian_2d(self.x_range.clone(), self.y_range.clone())
                .expect("Failed to build range.");
            
            chart.configure_mesh().draw().expect("Failed to draw chart.");
        }
    }
}
