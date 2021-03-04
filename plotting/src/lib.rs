pub mod utils;

use std::rc::Rc;
use std::cell::RefCell;
use wasm_bindgen::prelude::*;
use plotters::coord::{{ Shift, types::RangedCoordf32 }};
use plotters::prelude::*;
use plotters_canvas::{{ OffscreenCanvasBackend }};
use std::ops::Range;
use web_sys::{{ OffscreenCanvas }};

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
pub struct OffscreenGraphRenderer {
    backend: Rc<RefCell<OffscreenCanvasBackend>>,
    root: Option<DrawingArea<OffscreenCanvasBackend, Shift>>,
    x_type: String,
    x_range: Range<f32>,
    y_range: Range<f32>,

    pub margin: u32,
    pub x_label_space: u32,
    pub y_label_space: u32,
}

#[wasm_bindgen]
impl OffscreenGraphRenderer {

    #[wasm_bindgen(constructor)]
    pub fn new(elem: OffscreenCanvas, x_type: &str, x_from: f32, x_to: f32, y_from: f32, y_to: f32, margin: u32, x_label_space: u32, y_label_space: u32) -> Self {
        let canvas = Rc::new(RefCell::new(OffscreenCanvasBackend::new(elem.clone()).expect("Couldn't create a backend from canvas.")));

        Self {
            root: Option::Some((&canvas).into()),
            x_type: x_type.into(),
            backend: canvas,
            x_range: (x_from..x_to),
            y_range: (y_from..y_to),
            margin,
            x_label_space,
            y_label_space,
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

    pub fn set_margin(&mut self, margin: u32) {
        self.margin = margin;
    }

    pub fn set_x_label_space(&mut self, space: u32) {
        self.x_label_space = space;
    }
    pub fn set_y_label_space(&mut self, space: u32) {
        self.y_label_space = space;
    }
    pub fn set_label_space(&mut self, space: u32) {
        self.x_label_space = space;
        self.y_label_space = space;
    }

    fn build_cartesian<'a>(&'a self) -> ChartContext<'a, OffscreenCanvasBackend, Cartesian2d<RangedCoordf32, RangedCoordf32>> {
        if let Option::Some(root) = &self.root {
            ChartBuilder::on(&root)
                .margin(self.margin)
                .x_label_area_size(self.x_label_space)
                .y_label_area_size(self.y_label_space)
                .build_cartesian_2d(self.x_range.clone(), self.y_range.clone())
                .expect("Failed to build range.")
        } else {
            panic!("Drawing area not present.");
        }
    }

    pub fn draw_trace(&mut self, trace_ptr: usize) {
        if let Option::Some(_) = &self.root {
            let mut chart = self.build_cartesian();
        
            chart.configure_mesh();

            let color;
            unsafe {
                color = &utils::DATA[trace_ptr].color;
            }
            

            (*self.backend).borrow_mut().draw_path(utils::TraceIterator::new(trace_ptr, self.x_range.start, self.x_range.end).map(
                |(x,y)| chart.backend_coord(&(x, y))
            ), color).expect("Failed to draw a trace");
        }
    }

    fn date_formatter(date: &f32) -> String {
        chrono::NaiveDateTime::from_timestamp(* date as i64, 0u32).format("%d.%m. %H:%M").to_string()
    }

    pub fn draw_chart(&mut self) {
        if let Option::Some(_) = &self.root {
            let mut chart = self.build_cartesian();
            
            let mut mesh = chart.configure_mesh();

            if self.x_type == "datetime" {
                mesh.x_label_formatter(&OffscreenGraphRenderer::date_formatter);
            }

            mesh.draw().expect("Failed to draw chart.");
        }
    }
}
