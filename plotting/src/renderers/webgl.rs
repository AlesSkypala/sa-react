use std::{collections::HashMap};

use wasm_bindgen::{JsCast};
use web_sys::{OffscreenCanvas, WebGlBuffer, WebGlProgram, WebGlRenderingContext, WebGlUniformLocation};

use crate::{data::DataIdx, structs::RenderJob};

use super::{AxisTick, RenderJobResult, Renderer};

struct BufferEntry {
    points: i32,
    handle: DataIdx,
    buffer: WebGlBuffer,
    width: f32,
    color: [f32; 3],
}

struct BufferBundle {
    from: f32,
    to: f32,
    buffers: Vec<BufferEntry>,
}

pub struct WebGlRenderer {
    width: u32,
    height: u32,

    _canvas: OffscreenCanvas,
    context: WebGlRenderingContext,
    trace_buffer: WebGlBuffer,

    tp_size_pos:   WebGlUniformLocation,
    tp_origin_pos: WebGlUniformLocation,
    tp_color_pos: WebGlUniformLocation,
    tp_transform_pos: WebGlUniformLocation,
    trace_program: WebGlProgram,

    ap_resolution_pos: WebGlUniformLocation,
    ap_color_pos: WebGlUniformLocation,
    axes_program: WebGlProgram,

    bundles_counter: usize,
    bundles: HashMap<usize, BufferBundle>,
}

impl WebGlRenderer {
    pub fn new(elem: OffscreenCanvas) -> Self {

        let context = elem.get_context("webgl")
            .unwrap()
            .unwrap()
            .dyn_into::<WebGlRenderingContext>()
            .unwrap();

        let vert_shader = webgl_utils::compile_shader(
            &context,
            WebGlRenderingContext::VERTEX_SHADER,
            r#"
            attribute vec2 aVertexPosition;

            uniform vec2 transform;
            uniform vec2 origin;
            uniform vec2 size;

            void main() {
                gl_Position = vec4(vec2(-1,-1) + vec2(2,2) * (aVertexPosition * vec2(1,transform.x) + vec2(0, transform.y) - origin) / size, 0, 1);
            }
            "#
        ).unwrap();

        let frag_shader = webgl_utils::compile_shader(
            &context,
            WebGlRenderingContext::FRAGMENT_SHADER,
            r#"
            precision mediump float;
            uniform vec3 color;

            void main() {
                gl_FragColor = vec4(color, 1);
            }
            "#
        ).unwrap();

        let program = webgl_utils::link_program(&context, &vert_shader, &frag_shader).unwrap();

        let axes_program = {

            let vert_shader = webgl_utils::compile_shader(
                &context,
                WebGlRenderingContext::VERTEX_SHADER,
                r#"
                attribute vec2 aVertexPosition;
    
                uniform vec2 resolution;
    
                void main() {
                    gl_Position = vec4(vec2(-1, -1) + vec2(2, 2) * aVertexPosition / resolution, 0, 1);
                }
                "#
            ).unwrap();
    
            let frag_shader = webgl_utils::compile_shader(
                &context,
                WebGlRenderingContext::FRAGMENT_SHADER,
                r#"
                precision mediump float;
                uniform vec4 color;

                void main() {
                    gl_FragColor = color;
                }
                "#
            ).unwrap();

            webgl_utils::link_program(&context, &vert_shader, &frag_shader).unwrap()
        };

        WebGlRenderer {
            width: elem.width(),
            height: elem.height(),
            _canvas: elem,

            tp_origin_pos: context.get_uniform_location(&program, "origin").unwrap(),
            tp_size_pos: context.get_uniform_location(&program, "size").unwrap(),
            tp_color_pos: context.get_uniform_location(&program, "color").unwrap(),
            tp_transform_pos: context.get_uniform_location(&program, "transform").unwrap(),
            trace_program: program,

            ap_resolution_pos: context.get_uniform_location(&axes_program, "resolution").unwrap(),
            ap_color_pos: context.get_uniform_location(&axes_program, "color").unwrap(),
            axes_program,

            trace_buffer: context.create_buffer().unwrap(),
            context,

            bundles_counter: 0,
            bundles: HashMap::new(),
        }
    }

    pub fn clear(&self) {
        self.context.clear_color(1.0, 1.0, 1.0, 1.0);
        self.context.clear(WebGlRenderingContext::COLOR_BUFFER_BIT);
    }

    pub fn render_axes(&self, job: &RenderJob, x_ticks: &[AxisTick], y_ticks: &[AxisTick]){
        let gl = &self.context;

        gl.viewport(0, 0, self.width as i32, self.height as i32);

        gl.use_program(Some(&self.axes_program));
        gl.uniform2f(Some(&self.ap_resolution_pos), self.width as f32, self.height as f32);
        gl.uniform4f(Some(&self.ap_color_pos), 0.3, 0.3, 0.3, 1.0);
        gl.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, Some(&self.trace_buffer));
        gl.line_width(2.0);

        let graph_left = (job.y_label_space + job.margin) as f32;
        let graph_bottom = (job.x_label_space + job.margin) as f32;
        let graph_top = (self.height - job.margin) as f32;
        let graph_right = (self.width - job.margin) as f32;

        unsafe {

            let data: Vec<f32> = vec![
                graph_left - 1.0, graph_top,
                graph_left - 1.0, graph_bottom - 1.0,
                graph_right,      graph_bottom - 1.0,
            ];

            let vert_array = js_sys::Float32Array::view(&data);

            gl.buffer_data_with_array_buffer_view(
                WebGlRenderingContext::ARRAY_BUFFER,
                &vert_array,
                WebGlRenderingContext::STATIC_DRAW,
            );
        }

        gl.vertex_attrib_pointer_with_i32(0, 2, WebGlRenderingContext::FLOAT, false, 0, 0);
        gl.enable_vertex_attrib_array(0);
        gl.draw_arrays(
            WebGlRenderingContext::LINE_STRIP,
            0,
            3
        );

        const TICK_LEN: f32 = 4.0;
        let points = (x_ticks.len() + y_ticks.len()) * 2;

        fn lerp(from: f32, to: f32, val: f32) -> f32 { from + (to - from) * val }

        unsafe {
            let mut data: Vec<f32> = Vec::with_capacity(2 * points);

            for tick in x_ticks {
                data.push(lerp(graph_left, graph_right, tick.pos));
                data.push(graph_bottom);
                data.push(lerp(graph_left, graph_right, tick.pos));
                data.push(graph_bottom - TICK_LEN);
            }

            for tick in y_ticks {
                data.push(graph_left);
                data.push(lerp(graph_bottom, graph_top, tick.pos));
                data.push(graph_left - TICK_LEN);
                data.push(lerp(graph_bottom, graph_top, tick.pos));
            }

            let vert_array = js_sys::Float32Array::view(&data);

            gl.buffer_data_with_array_buffer_view(
                WebGlRenderingContext::ARRAY_BUFFER,
                &vert_array,
                WebGlRenderingContext::STATIC_DRAW,
            );
        }

        gl.draw_arrays(
            WebGlRenderingContext::LINES,
            0,
            points as i32
        );
    }

    pub fn render_grid(&self, job: &RenderJob, x_ticks: &[AxisTick], y_ticks: &[AxisTick]) {
        let gl = &self.context;

        gl.viewport(
            (job.margin + job.y_label_space) as i32,
            (job.margin + job.x_label_space) as i32,
            (self.width  - job.margin * 2 - job.y_label_space) as i32,
            (self.height - job.margin * 2 - job.x_label_space) as i32
        );

        gl.use_program(Some(&self.trace_program));
        gl.uniform2f(Some(&self.tp_origin_pos), job.x_from, job.y_from);
        gl.uniform2f(Some(&self.tp_size_pos), job.x_to - job.x_from, job.y_to - job.y_from);
        gl.uniform2f(Some(&self.tp_transform_pos), 1.0, 0.0);
        gl.uniform3f(Some(&self.tp_color_pos), 0.8, 0.8, 0.8);
        gl.line_width(1.0);

        gl.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, Some(&self.trace_buffer));
        let points = (x_ticks.len() + y_ticks.len()) * 2;

        unsafe {
            let mut data: Vec<f32> = Vec::with_capacity(2 * points);

            for tick in x_ticks {
                data.push(tick.val);
                data.push(job.y_from);
                data.push(tick.val);
                data.push(job.y_to);
            }

            for tick in y_ticks {
                data.push(job.x_from);
                data.push(tick.val);
                data.push(job.x_to);
                data.push(tick.val);
            }

            let vert_array = js_sys::Float32Array::view(&data);

            gl.buffer_data_with_array_buffer_view(
                WebGlRenderingContext::ARRAY_BUFFER,
                &vert_array,
                WebGlRenderingContext::STATIC_DRAW,
            );
        }

        gl.vertex_attrib_pointer_with_i32(0, 2, WebGlRenderingContext::FLOAT, false, 0, 0);
        gl.enable_vertex_attrib_array(0);
        gl.draw_arrays(
            WebGlRenderingContext::LINES,
            0,
            points as i32
        );
    }

    #[allow(dead_code)]
    fn date_formatter(date: &f32) -> String {
        chrono::NaiveDateTime::from_timestamp(*date as i64, 0u32)
            .format("%d.%m. %H:%M")
            .to_string()
    }

    fn allocate_bundle_entry(context: &WebGlRenderingContext, from: f32, to: f32, entry: &super::BundleEntry) -> BufferEntry {
        let buffer = context.create_buffer().unwrap();
        context.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, Some(&buffer));
        let points;

        unsafe {
            use std::iter::once;

            let data: Vec<f32> = crate::data::get_trace_ret(entry.handle, |t|
                t.get_data_in(from, to)
                .flat_map(|p| once(p.0).chain(once(p.1)))
                .collect()
            );

            let vert_array = js_sys::Float32Array::view(&data);

            points = data.len() as i32 / 2;

            context.buffer_data_with_array_buffer_view(
                WebGlRenderingContext::ARRAY_BUFFER,
                &vert_array,
                WebGlRenderingContext::STATIC_DRAW,
            );
        }

        BufferEntry {
            points,
            handle: entry.handle,
            buffer,
            width: entry.width as f32,
            color: [
                entry.color[0] as f32 / 255.0,
                entry.color[1] as f32 / 255.0,
                entry.color[2] as f32 / 255.0,
            ],
        }
    }
}

impl Renderer for WebGlRenderer {
    fn render(&mut self, job: RenderJob) -> RenderJobResult {
        let gl = &self.context;

        let x_ticks = Box::new([]);
        let y_ticks = webgl_utils::calc_ticks(job.y_from, job.y_to - job.y_from);

        // TODO:

        if job.clear {
            self.clear();
        }

        if job.render_axes {
            self.render_axes(&job, &x_ticks[..], &y_ticks[..]);
        }

        if job.render_grid {
            self.render_grid(&job, &x_ticks[..], &y_ticks[..]);
        }

        if job.render_labels {
            // todo!()
        }

        gl.viewport(
            (job.margin + job.y_label_space) as i32,
            (job.margin + job.x_label_space) as i32,
            (self.width  - job.margin * 2 - job.y_label_space) as i32,
            (self.height - job.margin * 2 - job.x_label_space) as i32
        );


        gl.use_program(Some(&self.trace_program));
        gl.uniform2f(Some(&self.tp_origin_pos), job.x_from, job.y_from);
        gl.uniform2f(Some(&self.tp_size_pos), job.x_to - job.x_from, job.y_to - job.y_from);
        gl.uniform2f(Some(&self.tp_transform_pos), 1.0, 0.0);

        if job.get_bundles().len() > 0 {
            for (_, bundle) in &self.bundles {
                for row in &bundle.buffers {
                    if job.is_blacklisted(row.handle) { continue; }

                    gl.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, Some(&row.buffer));
                    gl.uniform3f(Some(&self.tp_color_pos), row.color[0], row.color[1], row.color[2]);
                    gl.line_width(row.width);

                    gl.vertex_attrib_pointer_with_i32(0, 2, WebGlRenderingContext::FLOAT, false, 0, 0);
                    gl.enable_vertex_attrib_array(0);
                    gl.draw_arrays(
                        WebGlRenderingContext::LINE_STRIP,
                        0,
                        row.points
                    );
                }
            }
        }

        if job.get_traces().len() > 0 {
            gl.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, Some(&self.trace_buffer));

            for trace in job.get_traces() {
                let n;

                gl.uniform3f(Some(&self.tp_color_pos), trace.color[0] as f32 / 255.0, trace.color[1] as f32 / 255.0, trace.color[2] as f32 / 255.0);
                gl.line_width(trace.width as f32);

                unsafe {
                    use std::iter::once;

                    let data: Vec<f32> = crate::data::get_trace_ret(trace.idx, |t|
                        t.get_data_in(job.x_from, job.x_to)
                            .flat_map(|p| once(p.0).chain(once(p.1)))
                            .collect()
                    );

                    n = data.len() / 2;
                    let vert_array = js_sys::Float32Array::view(&data);

                    gl.buffer_data_with_array_buffer_view(
                        WebGlRenderingContext::ARRAY_BUFFER,
                        &vert_array,
                        WebGlRenderingContext::STATIC_DRAW,
                    );
                }

                gl.vertex_attrib_pointer_with_i32(0, 2, WebGlRenderingContext::FLOAT, false, 0, 0);
                gl.enable_vertex_attrib_array(0);
                gl.draw_arrays(
                    WebGlRenderingContext::LINE_STRIP,
                    0,
                    n as i32
                );
            }
        }

        RenderJobResult {
            x_ticks,
            y_ticks,
        }
    }

    fn size_changed(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
        self._canvas.set_width(width);
        self._canvas.set_height(height);
    }

    fn create_bundle(&mut self, from: f32, to: f32, data: &[super::BundleEntry]) -> usize{
        let mut vec = Vec::with_capacity(data.len());

        for row in data {
            vec.push(WebGlRenderer::allocate_bundle_entry(&self.context, from, to, row));
        }

        let handle = self.bundles_counter;
        self.bundles_counter += 1;
        self.bundles.insert(handle, BufferBundle { from, to, buffers: vec });

        handle
    }

    fn dispose_bundle(&mut self, bundle: usize) {
        let bundle = self.bundles.remove(&bundle).unwrap();

        for row in bundle.buffers {
            self.context.delete_buffer(Some(&row.buffer));
        }

    }

    fn rebundle(&mut self, bundle: usize, to_add: &[super::BundleEntry], to_del: &[DataIdx], to_mod: &[super::BundleEntry]) {
        let b = self.bundles.get_mut(&bundle).unwrap();

        for row in to_add {
            b.buffers.push(WebGlRenderer::allocate_bundle_entry(&self.context, b.from, b.to, row));
        }

        b.buffers.retain(|e| !to_del.iter().any(|t| *t == e.handle));

        for row in to_mod {
            if let Some(buffer) = b.buffers.iter_mut().find(|e| e.handle == row.handle) {
                buffer.width = row.width as f32;
                buffer.color =  [
                    row.color[0] as f32 / 255.0,
                    row.color[1] as f32 / 255.0,
                    row.color[2] as f32 / 255.0,
                ];
            }
        }
    }
}

impl Drop for WebGlRenderer {
    fn drop(&mut self) {
        let bundles: Vec<usize> = self.bundles.keys().cloned().collect();

        for handle in bundles {
            self.dispose_bundle(handle);
        }
    }
}

mod webgl_utils {
    use web_sys::{WebGlProgram, WebGlRenderingContext, WebGlShader};

    use crate::renderers::AxisTick;

    pub fn compile_shader(
        context: &WebGlRenderingContext,
        shader_type: u32,
        source: &str,
    ) -> Result<WebGlShader, String> {
        let shader = context
            .create_shader(shader_type)
            .ok_or_else(|| String::from("Unable to create shader object"))?;
        context.shader_source(&shader, source);
        context.compile_shader(&shader);
    
        if context
            .get_shader_parameter(&shader, WebGlRenderingContext::COMPILE_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            Ok(shader)
        } else {
            Err(context
                .get_shader_info_log(&shader)
                .unwrap_or_else(|| String::from("Unknown error creating shader")))
        }
    }
    
    pub fn link_program(
        context: &WebGlRenderingContext,
        vert_shader: &WebGlShader,
        frag_shader: &WebGlShader,
    ) -> Result<WebGlProgram, String> {
        let program = context
            .create_program()
            .ok_or_else(|| String::from("Unable to create shader object"))?;
    
        context.attach_shader(&program, vert_shader);
        context.attach_shader(&program, frag_shader);
        context.link_program(&program);
    
        if context
            .get_program_parameter(&program, WebGlRenderingContext::LINK_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            Ok(program)
        } else {
            Err(context
                .get_program_info_log(&program)
                .unwrap_or_else(|| String::from("Unknown error creating program object")))
        }
    }

    pub fn calc_ticks(start: f32, width: f32) -> Box<[AxisTick]> {
        const SIZES: [f32; 4] = [1.0, 2.0, 5.0, 10.0];
    
        let mut y0: f32 = 0.0;
        let mut dy: f32 = 1.0;

        {
            let order = width.log10().floor() - 1.0;
            
            for size in SIZES.iter() {
                dy = (10.0f32).powf(order) * size;
                y0 = (start / dy).floor() * dy;

                if (width + start - y0) / dy < 10.0 { break; }
            }
        }

        (1..((width + start - y0) / dy).floor() as usize)
            .map(|i| AxisTick { val: y0 + dy * i as f32, pos: (y0 + dy * i as f32 - start) / width })
            .collect()
    }
}