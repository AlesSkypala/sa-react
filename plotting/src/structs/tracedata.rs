use std::error::Error;
use wasm_bindgen::prelude::*;

pub type RangePrec = f32;

#[derive(Debug)]
pub struct TraceData {
    pub id: String,
    pub x_type: String,
    pub y_type: String,

    pub segments: Vec<DataSegment>,
}

impl TraceData {
    pub fn get_x_type(&self) -> &String {
        &self.x_type
    }

    pub fn get_y_type(&self) -> &String {
        &self.y_type
    }

    pub fn get_segments(&self) -> &Vec<DataSegment> {
        &self.segments
    }

    pub fn get_segments_in(&self, from: f32, to: f32) -> impl Iterator<Item = &DataSegment> {
        self.segments
            .iter()
            .filter(move |&x| x.intersects(from, to))
    }

    pub fn get_data_in(&self, from: f32, to: f32) -> impl Iterator<Item = &(f32, f32)> {
        self.get_segments_in(from, to)
            .filter(|seg| matches!(seg.data, SegmentState::Complete(_)))
            .flat_map(|seg| seg.data.unwrap())
    }

    pub fn push_segment(&mut self, seg: DataSegment) {
        // TODO: merge if overlap

        self.segments.push(seg);
        self.segments
            .sort_by(|a, b| a.from.partial_cmp(&b.from).unwrap());
    }
}

#[wasm_bindgen]
impl TraceData {
    // pub fn get_y_extents(&self, x_from: f32, x_to: f32) -> js_sys::Array {

    //     js_sys::Array::from(vec![ JsValue::from(x_from), JsValue:: from(x_to) ])
    // }

    // pub fn recommend_range(data_ptr: usize, overhang: f32) -> GraphExtents {
    //     let overhang = overhang + 1.0;

    //     unsafe {
    //         let data = &DATA[data_ptr];
    //         let x_size = *TYPE_SIZES.get(&data.x_type[..]).unwrap();
    //         let y_size = *TYPE_SIZES.get(&data.x_type[..]).unwrap();

    //         assert_eq!(data.data.len() % (x_size + y_size), 0);

    //         let x_parser = TraceIterator::get_parser(&data.x_type);
    //         let y_parser = TraceIterator::get_parser(&data.y_type);

    //         let data = &data.data;
    //         let last_idx = data.len() - x_size - y_size;

    //         let (x_start, x_end) = (
    //             x_parser(&data[0..x_size]),
    //             x_parser(&data[last_idx..(last_idx + x_size)]),
    //         );

    //         let y_iter = (x_size..data.len())
    //             .step_by(x_size + y_size)
    //             .map(|i| y_parser(&data[i..(i + y_size)]));

    //         let y_start = y_iter.clone().fold(f32::INFINITY, |a, b| a.min(b));
    //         let y_end = y_iter.fold(f32::NEG_INFINITY, |a, b| a.max(b));

    //         let over_width = (x_end - x_start) * overhang;
    //         let over_height = (y_end - y_start) * overhang;

    //         GraphExtents {
    //             x_start: x_end - over_width,
    //             x_end: x_start + over_width,

    //             y_start: y_end - over_height,
    //             y_end: y_start + over_height,
    //         }
    //     }
    // }

    // pub fn recommend_range_all(data_ptrs: &[usize], overhang: f32) -> GraphExtents {
    //     data_ptrs
    //         .iter()
    //         .map(|p| recommend_range(*p, overhang))
    //         .fold(
    //             GraphExtents {
    //                 x_start: f32::INFINITY,
    //                 y_start: f32::INFINITY,
    //                 x_end: f32::NEG_INFINITY,
    //                 y_end: f32::NEG_INFINITY,
    //             },
    //             |a, b| a.outer(b),
    //         )
    // }
}

#[derive(Debug)]
pub struct DataSegment {
    pub from: RangePrec,
    pub to: RangePrec,

    pub data: SegmentState,
}

#[derive(Debug)]
pub enum SegmentState {
    Loading,
    Error(Box<dyn Error>),
    Complete(Vec<(f32, f32)>),
}

impl SegmentState {
    pub fn unwrap(&self) -> &Vec<(f32, f32)> {
        if let SegmentState::Complete(data) = &self {
            data
        } else {
            panic!("Segment is not in a complete state")
        }
    }
}

impl DataSegment {
    pub fn contains(&self, point: RangePrec) -> bool {
        self.from <= point && self.to > point
    }

    pub fn intersects(&self, from: RangePrec, to: RangePrec) -> bool {
        self.from < to && self.to >= from
    }

    pub fn iter_in(&self, from: f32, to: f32) -> Option<impl Iterator<Item = &(f32, f32)>> {
        if let SegmentState::Complete(data) = &self.data {
            Some(
                data.iter()
                    .skip_while(move |(x, _)| *x < from)
                    .take_while(move |(x, _)| *x < to),
            )
        } else {
            None
        }
    }
}
