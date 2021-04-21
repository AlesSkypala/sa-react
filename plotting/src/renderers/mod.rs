mod canvas;
mod webgl;
use std::convert::TryInto;

use wasm_bindgen::prelude::*;
use web_sys::OffscreenCanvas;

use crate::structs::RenderJob;
pub use canvas::OffscreenGraphRenderer;
pub use webgl::WebGlRenderer;

pub struct BundleEntry {
    handle: usize,
    width: u32,
    color: [u8; 3],
}

pub trait Renderer {
    fn render(&mut self, job: RenderJob);
    fn size_changed(&mut self, width: u32, height: u32);
    fn create_bundle(&mut self, from: f32, to: f32, data: &[BundleEntry]) -> usize;
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

    pub fn render(&mut self, job: RenderJob) {
        self.renderer.render(job)
    }

    pub fn size_changed(&mut self, width: u32, height: u32) {
        self.renderer.size_changed(width, height);
    }

    pub fn create_bundle_from_stream(&mut self, from: f32, to: f32, stream: &[u8]) -> usize {
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

    pub fn dispose_bundle(&mut self, bundle: usize) {
        self.renderer.dispose_bundle(bundle);
    }
}
