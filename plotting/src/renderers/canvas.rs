use plotters::coord::{types::RangedCoordf32, Shift};
use plotters::prelude::*;
use plotters_canvas::OffscreenCanvasBackend;
use std::cell::RefCell;
use std::ops::Range;
use std::rc::Rc;
use wasm_bindgen::JsValue;
use web_sys::OffscreenCanvas;

use crate::structs::{RangePrec, RenderJob};

use super::{RenderJobResult, Renderer};

pub struct OffscreenGraphRenderer {
    backend: Rc<RefCell<OffscreenCanvasBackend>>,
    root: Option<DrawingArea<OffscreenCanvasBackend, Shift>>,
}

impl OffscreenGraphRenderer {
    pub fn new(elem: OffscreenCanvas) -> Result<Self, JsValue> {
        let canvas = Rc::new(RefCell::new(
            OffscreenCanvasBackend::new(elem.clone())
                .expect("Couldn't create a backend from canvas."),
        ));

        Ok(Self {
            root: Option::Some((&canvas).into()),
            backend: canvas,
        })
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
                        start: job.x_from as f32,
                        end: job.x_to as f32,
                    },
                    Range {
                        start: job.y_from as f32,
                        end: job.y_to as f32,
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
    fn render(&mut self, job: RenderJob) -> Result<RenderJobResult, JsValue> {
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

            crate::data::get_trace(trace.idx, |trace| {
                (*self.backend)
                    .borrow_mut()
                    .draw_path(
                        trace
                            .get_data_in(job.x_from, job.x_to)
                            .map(|point| chart.backend_coord(&point)),
                        &color,
                    )
                    .expect("Failed to draw a trace")
            });
        }

        Ok(RenderJobResult {
            x_ticks: Box::new([]),
            y_ticks: Box::new([]),
        })
    }

    fn size_changed(&mut self, width: u32, height: u32) -> Result<(), JsValue> {
        (*self.backend).borrow_mut().set_size(width, height);

        if let Option::Some(_) = &self.root {
            self.root = Option::Some(
                self.root
                    .take()
                    .unwrap()
                    .shrink((0, 0), (width + 1, height + 1)),
            );
        }

        Result::Ok(())
    }

    fn create_bundle(
        &mut self,
        _from: RangePrec,
        _to: RangePrec,
        _data: &[super::BundleEntry],
    ) -> Result<usize, JsValue> {
        todo!()
    }

    fn dispose_bundle(&mut self, _bundle: usize) -> Result<(), JsValue> {
        todo!()
    }

    fn rebundle(
        &mut self,
        _bundle: usize,
        _to_add: &[super::BundleEntry],
        _to_del: &[crate::data::DataIdx],
        _to_mod: &[super::BundleEntry],
    ) -> Result<(), JsValue> {
        todo!()
    }
}
