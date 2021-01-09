use crate::gen_OffscreenCanvasRenderingContext2d::{{OffscreenCanvasRenderingContext2D}};

use crate::canvas::error_cast;
use crate::canvas::CanvasError;
use wasm_bindgen::{JsCast, JsValue, prelude::*};
use web_sys::{ OffscreenCanvas };

use plotters_backend::text_anchor::{HPos, VPos};
use plotters_backend::{
    BackendColor, BackendCoord, BackendStyle, BackendTextStyle, DrawingBackend, DrawingErrorKind,
    FontTransform,
};

#[wasm_bindgen]
extern {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_obj(s: &JsValue);
}

/// The backend that is drawing on the HTML canvas
/// TODO: Support double buffering
pub struct OffscreenCanvasBackend {
    offscreen: OffscreenCanvas,
    context: OffscreenCanvasRenderingContext2D,
}

impl OffscreenCanvasBackend {
    fn init_backend(canvas: OffscreenCanvas) -> Option<Self> {
        let context: OffscreenCanvasRenderingContext2D = canvas.get_context("2d").ok()??.dyn_into().ok()?;

        Some(OffscreenCanvasBackend { offscreen: canvas, context })
    }

    /// Create a new drawing backend backed with an HTML5 canvas object with given Id
    /// - `elem_id` The element id for the canvas
    /// - Return either some drawing backend has been created, or none in error case
    pub fn new(canvas: OffscreenCanvas) -> Option<Self> {
        Self::init_backend(canvas)
    }

    /// Sets the stroke style and line width in the underlying context.
    fn set_line_style(&mut self, style: &impl BackendStyle) {
        self.context
            .set_stroke_style(&make_canvas_color(style.color()));
        self.context.set_line_width(style.stroke_width() as f64);
    }

    pub fn set_size(&mut self, width: u32, height: u32) {
        self.offscreen.set_width(width);
        self.offscreen.set_height(height);
    }
}

fn make_canvas_color(color: BackendColor) -> JsValue {
    let (r, g, b) = color.rgb;
    let a = color.alpha;
    format!("rgba({},{},{},{})", r, g, b, a).into()
}

impl DrawingBackend for OffscreenCanvasBackend {
    type ErrorType = CanvasError;

    fn get_size(&self) -> (u32, u32) {
        (self.offscreen.width(), self.offscreen.height())
    }

    fn ensure_prepared(&mut self) -> Result<(), DrawingErrorKind<CanvasError>> {
        Ok(())
    }

    fn present(&mut self) -> Result<(), DrawingErrorKind<CanvasError>> {
        Ok(())
    }

    fn draw_pixel(
        &mut self,
        point: BackendCoord,
        style: BackendColor,
    ) -> Result<(), DrawingErrorKind<CanvasError>> {
        if style.color().alpha == 0.0 {
            return Ok(());
        }

        self.context
            .set_fill_style(&make_canvas_color(style.color()));
        self.context
            .fill_rect(f64::from(point.0), f64::from(point.1), 1.0, 1.0);
        Ok(())
    }

    fn draw_line<S: BackendStyle>(
        &mut self,
        from: BackendCoord,
        to: BackendCoord,
        style: &S,
    ) -> Result<(), DrawingErrorKind<Self::ErrorType>> {
        if style.color().alpha == 0.0 {
            return Ok(());
        }

        self.set_line_style(style);
        self.context.begin_path();
        self.context.move_to(f64::from(from.0), f64::from(from.1));
        self.context.line_to(f64::from(to.0), f64::from(to.1));
        self.context.stroke();
        Ok(())
    }

    fn draw_rect<S: BackendStyle>(
        &mut self,
        upper_left: BackendCoord,
        bottom_right: BackendCoord,
        style: &S,
        fill: bool,
    ) -> Result<(), DrawingErrorKind<Self::ErrorType>> {
        if style.color().alpha == 0.0 {
            return Ok(());
        }
        if fill {
            self.context
                .set_fill_style(&make_canvas_color(style.color()));
            self.context.fill_rect(
                f64::from(upper_left.0),
                f64::from(upper_left.1),
                f64::from(bottom_right.0 - upper_left.0),
                f64::from(bottom_right.1 - upper_left.1),
            );
        } else {
            self.set_line_style(style);
            self.context.stroke_rect(
                f64::from(upper_left.0),
                f64::from(upper_left.1),
                f64::from(bottom_right.0 - upper_left.0),
                f64::from(bottom_right.1 - upper_left.1),
            );
        }
        Ok(())
    }

    fn draw_path<S: BackendStyle, I: IntoIterator<Item = BackendCoord>>(
        &mut self,
        path: I,
        style: &S,
    ) -> Result<(), DrawingErrorKind<Self::ErrorType>> {
        if style.color().alpha == 0.0 {
            return Ok(());
        }
        let mut path = path.into_iter();
        self.context.begin_path();
        if let Some(start) = path.next() {
            self.set_line_style(style);
            self.context.move_to(f64::from(start.0), f64::from(start.1));
            for next in path {
                self.context.line_to(f64::from(next.0), f64::from(next.1));
            }
        }
        self.context.stroke();
        Ok(())
    }

    fn fill_polygon<S: BackendStyle, I: IntoIterator<Item = BackendCoord>>(
        &mut self,
        path: I,
        style: &S,
    ) -> Result<(), DrawingErrorKind<Self::ErrorType>> {
        if style.color().alpha == 0.0 {
            return Ok(());
        }
        let mut path = path.into_iter();
        self.context.begin_path();
        if let Some(start) = path.next() {
            self.context
                .set_fill_style(&make_canvas_color(style.color()));
            self.context.move_to(f64::from(start.0), f64::from(start.1));
            for next in path {
                self.context.line_to(f64::from(next.0), f64::from(next.1));
            }
            self.context.close_path();
        }
        self.context.fill();
        Ok(())
    }

    fn draw_circle<S: BackendStyle>(
        &mut self,
        center: BackendCoord,
        radius: u32,
        style: &S,
        fill: bool,
    ) -> Result<(), DrawingErrorKind<Self::ErrorType>> {
        if style.color().alpha == 0.0 {
            return Ok(());
        }
        if fill {
            self.context
                .set_fill_style(&make_canvas_color(style.color()));
        } else {
            self.set_line_style(style);
        }
        self.context.begin_path();
        self.context
            .arc(
                f64::from(center.0),
                f64::from(center.1),
                f64::from(radius),
                0.0,
                std::f64::consts::PI * 2.0,
            )
            .map_err(error_cast)?;
        if fill {
            self.context.fill();
        } else {
            self.context.stroke();
        }
        Ok(())
    }

    fn draw_text<S: BackendTextStyle>(
        &mut self,
        text: &str,
        style: &S,
        pos: BackendCoord,
    ) -> Result<(), DrawingErrorKind<Self::ErrorType>> {
        let color = style.color();
        if color.alpha == 0.0 {
            return Ok(());
        }

        let (mut x, mut y) = (pos.0, pos.1);

        let degree = match style.transform() {
            FontTransform::None => 0.0,
            FontTransform::Rotate90 => 90.0,
            FontTransform::Rotate180 => 180.0,
            FontTransform::Rotate270 => 270.0,
        } / 180.0
            * std::f64::consts::PI;

        if degree != 0.0 {
            self.context.save();
            self.context
                .translate(f64::from(x), f64::from(y))
                .map_err(error_cast)?;
            self.context.rotate(degree).map_err(error_cast)?;
            x = 0;
            y = 0;
        }

        let text_baseline = match style.anchor().v_pos {
            VPos::Top => "top",
            VPos::Center => "middle",
            VPos::Bottom => "bottom",
        };
        self.context.set_text_baseline(text_baseline);

        let text_align = match style.anchor().h_pos {
            HPos::Left => "start",
            HPos::Right => "end",
            HPos::Center => "center",
        };
        self.context.set_text_align(text_align);

        self.context
            .set_fill_style(&make_canvas_color(color.clone()));
        self.context.set_font(&format!(
            "{} {}px {}",
            style.style().as_str(),
            style.size(),
            style.family().as_str(),
        ));
        self.context
            .fill_text(text, f64::from(x), f64::from(y))
            .map_err(error_cast)?;

        if degree != 0.0 {
            self.context.restore();
        }

        Ok(())
    }
}
