use plotters::coord::{types::RangedCoordf32, Shift};
use plotters::prelude::*;
use plotters_canvas::OffscreenCanvasBackend;
use std::cell::RefCell;
use std::ops::Range;
use std::rc::Rc;
use web_sys::OffscreenCanvas;

use crate::structs::RenderJob;

use super::Renderer;

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
                .x_label_area_size(32)
                .y_label_area_size(60)
                .build_cartesian_2d(
                    Range {
                        start: job.x_from,
                        end: job.x_to,
                    },
                    Range {
                        start: job.y_from,
                        end: job.y_to,
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
                        crate::data::DATA[trace.idx]
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
            self.root = Option::Some(
                self.root
                    .take()
                    .unwrap()
                    .shrink((0, 0), (width + 1, height + 1)),
            );
        }
    }

    fn create_bundle(&mut self, _from: f32, _to: f32, _data: &[super::BundleEntry]) -> usize {
        todo!()
    }

    fn dispose_bundle(&mut self, _bundle: usize) {
        todo!()
    }
}
