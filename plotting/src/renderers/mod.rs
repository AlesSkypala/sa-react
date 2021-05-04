mod canvas;
mod webgl;
use std::{convert::TryInto, mem::size_of};

use wasm_bindgen::prelude::*;
use web_sys::OffscreenCanvas;
use serde::{Serialize, Deserialize};

use crate::structs::{RangePrec, RenderJob};
pub use canvas::OffscreenGraphRenderer;
pub use webgl::WebGlRenderer;

pub struct BundleEntry {
    handle: usize,
    width: u32,
    color: [u8; 3],
}

#[derive(Serialize, Deserialize)]
pub struct AxisTick {
    val: RangePrec,
    pos: RangePrec,
}

#[derive(Serialize, Deserialize)]
pub struct RenderJobResult {
    x_ticks: Box<[AxisTick]>,
    y_ticks: Box<[AxisTick]>,
}

pub trait Renderer {
    fn render(&mut self, job: RenderJob) -> RenderJobResult;
    fn size_changed(&mut self, width: u32, height: u32);
    fn create_bundle(&mut self, from: RangePrec, to: RangePrec, data: &[BundleEntry]) -> usize;
    fn rebundle(&mut self, bundle: usize, to_add: &[BundleEntry], to_del: &[crate::data::DataIdx], to_mod: &[BundleEntry]);
    fn dispose_bundle(&mut self, bundle: usize);
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

    pub fn new_webgl(elem: OffscreenCanvas) -> Self {
        Self {
            renderer: Box::new(WebGlRenderer::new(elem)),
        }
    }

    pub fn render(&mut self, job: RenderJob) -> JsValue {
        JsValue::from_serde(&RenderJobResult::from(self.renderer.render(job))).unwrap()
    }

    pub fn size_changed(&mut self, width: u32, height: u32) {
        self.renderer.size_changed(width, height);
    }

    pub fn create_bundle_from_stream(&mut self, from: RangePrec, to: RangePrec, stream: &[u8]) -> usize {
        let mut vec = Vec::with_capacity(stream.len() / 11);

        for row in stream.chunks_exact(11) {
            vec.push(
                BundleEntry {
                    handle: u32::from_be_bytes(row[0..4].try_into().unwrap()) as usize,
                    width: u32::from_be_bytes(row[4..8].try_into().unwrap()),
                    color: row[8..11].try_into().unwrap()
                }
            );
        }

        self.renderer.create_bundle(from, to, &vec)
    }

    pub fn rebundle(&mut self, bundle: usize, del: &[u8], add: &[u8], modif: &[u8]) {
        let mut to_add = Vec::with_capacity(add.len() / 11);
        let mut to_mod = Vec::with_capacity(modif.len() / 11);
        let mut to_del = Vec::with_capacity(del.len() / size_of::<usize>());

        for row in del.chunks_exact(size_of::<usize>()) {
            to_del.push(usize::from_be_bytes(row.try_into().unwrap()));
        }

        for row in add.chunks_exact(11) {
            to_add.push(
                BundleEntry {
                    handle: u32::from_be_bytes(row[0..4].try_into().unwrap()) as usize,
                    width: u32::from_be_bytes(row[4..8].try_into().unwrap()),
                    color: row[8..11].try_into().unwrap()
                }
            );
        }

        for row in modif.chunks_exact(11) {
            to_mod.push(
                BundleEntry {
                    handle: u32::from_be_bytes(row[0..4].try_into().unwrap()) as usize,
                    width: u32::from_be_bytes(row[4..8].try_into().unwrap()),
                    color: row[8..11].try_into().unwrap()
                }
            );
        }

        self.renderer.rebundle(bundle, &to_add, &to_del, &to_mod);
    }

    pub fn dispose_bundle(&mut self, bundle: usize) {
        self.renderer.dispose_bundle(bundle);
    }
}
