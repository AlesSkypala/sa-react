use plotters::prelude::*;
use plotters::{
    coord::{types::RangedCoordf32, Shift},
};
use plotters_canvas::OffscreenCanvasBackend;
use std::cell::RefCell;
use std::ops::Range;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use web_sys::OffscreenCanvas;

use crate::{structs::RenderJob};

trait Renderer {
    fn render(&mut self, job: RenderJob);
    fn size_changed(&mut self, width: u32, height: u32);
}

#[wasm_bindgen]
pub struct RendererContainer {
    renderer: Box<dyn Renderer>,
}

#[wasm_bindgen]
impl RendererContainer {
    pub fn new_offscreen(elem: OffscreenCanvas) -> Self {
        Self {
            renderer: Box::new(OffscreenGraphRenderer::new(elem)),
        }
    }

    pub fn render(&mut self, job: RenderJob) {
        self.renderer.render(job)
    }

    pub fn size_changed(&mut self, width: u32, height: u32) {
        self.renderer.size_changed(width, height);
    }
}

pub struct OffscreenGraphRenderer {
    backend: Rc<RefCell<OffscreenCanvasBackend>>,
    root: Option<DrawingArea<OffscreenCanvasBackend, Shift>>,
}

impl OffscreenGraphRenderer {
    pub fn new(elem: OffscreenCanvas) -> Self {
        let canvas = Rc::new(RefCell::new(
            OffscreenCanvasBackend::new(elem.clone())
                .expect("Couldn't create a backend from canvas."),
        ));

        Self {
            root: Option::Some((&canvas).into()),
            backend: canvas,
        }
    }

    pub fn clear(&self) {
        if let Option::Some(root) = &self.root {
            root.fill(&WHITE).expect("Couldn't repaint the window.");
        }
    }

    fn build_cartesian<'a>(
        &'a self,
        job: &RenderJob,
    ) -> ChartContext<'a, OffscreenCanvasBackend, Cartesian2d<RangedCoordf32, RangedCoordf32>> {
        if let Option::Some(root) = &self.root {
            ChartBuilder::on(&root)
                .margin(job.margin)
                // .x_label_area_size(self.x_label_space)
                // .y_label_area_size(self.y_label_space)
                .build_cartesian_2d(
                    Range {
                        start: job.x_from,
                        end: job.x_to,
                    },
                    Range {
                        start: job.x_from,
                        end: job.x_to,
                    },
                )
                .expect("Failed to build range.")
        } else {
            panic!("Drawing area not present.");
        }
    }

    fn date_formatter(date: &f32) -> String {
        chrono::NaiveDateTime::from_timestamp(*date as i64, 0u32)
            .format("%d.%m. %H:%M")
            .to_string()
    }
}

impl Renderer for OffscreenGraphRenderer {
    fn render(&mut self, job: RenderJob) {
        if job.clear {
            self.clear();
        }

        let mut chart = self.build_cartesian(&job);

        let mut mesh = chart.configure_mesh();

        if !job.render_axes {
            mesh.disable_axes();
        }

        if !job.render_grid {
            mesh.disable_mesh();
        }

        if job.get_x_type() == "datetime" {
            mesh.x_label_formatter(&OffscreenGraphRenderer::date_formatter);
        }

        mesh.draw().expect("Failed to draw chart.");

        for trace in job.get_traces() {
            let color = RGBColor(trace.color[0], trace.color[1], trace.color[2]);

            unsafe {
                (*self.backend)
                    .borrow_mut()
                    .draw_path(
                        trace
                            .handle
                            .as_ref()
                            .unwrap()
                            .get_data_in(job.x_from, job.x_to)
                            .map(|point| chart.backend_coord(point)),
                        &color,
                    )
                    .expect("Failed to draw a trace");
            }
        }
    }

    fn size_changed(&mut self, width: u32, height: u32) {
        (*self.backend).borrow_mut().set_size(width, height);

        if let Option::Some(_) = &self.root {
            self.root = Option::Some(self.root.take().unwrap().shrink((0, 0), (width, height)));
        }
    }
}
