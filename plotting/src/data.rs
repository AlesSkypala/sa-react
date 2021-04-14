use std::collections::HashMap;
use std::convert::TryInto;

use crate::structs::TraceData;
use lazy_static::lazy_static;
use wasm_bindgen::prelude::*;

// pub type DataPtr = *mut TraceData;
pub type DataIdx = usize;

pub static mut DATA: Vec<TraceData> = vec![];

pub struct TypeDescriptor {
    pub size: usize,
    pub parser: fn(&[u8]) -> f32,
}

impl TypeDescriptor {

    pub fn new(size: usize, parser: fn(&[u8]) -> f32) -> Self {
        Self {
            size,
            parser: parser,
        }
    }
}

lazy_static! {
    pub static ref TYPE_SIZES: HashMap<&'static str, TypeDescriptor> = {
        let mut m = HashMap::new();

        m.insert("datetime", TypeDescriptor::new(4, |a| i32::from_le_bytes(a.try_into().unwrap()) as f32));
        m.insert("byte", TypeDescriptor::new(1, |a| u8::from_le_bytes(a.try_into().unwrap()) as f32));

        m.insert("short", TypeDescriptor::new(2, |a| i8::from_le_bytes(a.try_into().unwrap()) as f32));
        m.insert("int", TypeDescriptor::new(4, |a| i32::from_le_bytes(a.try_into().unwrap()) as f32));
        m.insert("long", TypeDescriptor::new(8, |a| i64::from_le_bytes(a.try_into().unwrap()) as f32));

        m.insert("ushort", TypeDescriptor::new(2, |a| u16::from_le_bytes(a.try_into().unwrap()) as f32));
        m.insert("uint", TypeDescriptor::new(4, |a| u32::from_le_bytes(a.try_into().unwrap()) as f32));
        m.insert("ulong", TypeDescriptor::new(8, |a| u64::from_le_bytes(a.try_into().unwrap()) as f32));

        m.insert("float", TypeDescriptor::new(4, |a| f32::from_le_bytes(a.try_into().unwrap())));
        m.insert("double", TypeDescriptor::new(8, |a| f64::from_le_bytes(a.try_into().unwrap()) as f32));

        m
    };
}

#[wasm_bindgen]
pub fn create_trace(id: &str, x_type: &str, y_type: &str) -> DataIdx {
    unsafe {
        DATA.push(TraceData {
            id: String::from(id.clone()),
            x_type: String::from(x_type.clone()),
            y_type: String::from(y_type.clone()),

            segments: vec![],
        });

        DATA.len() - 1
    }
}

#[wasm_bindgen]
pub fn bulkload_segments(ptrs: &[DataIdx], x_type: &str, y_type: &str, data: Box<[u8]>) {
    unsafe {
        let traces = ptrs.iter().map(|idx| &mut DATA[*idx]);

        let x_desc = TYPE_SIZES.get(x_type).unwrap();
        let y_desc = TYPE_SIZES.get(y_type).unwrap();

        let wins = data.chunks_exact(x_desc.size + y_desc.size * ptrs.len());
        let mut out = vec![vec![(0.0, 0.0); wins.clone().count()]; ptrs.len()];

        let mut row_idx = 0;

        let start = (x_desc.parser)(&data[0..x_desc.size]);
        let mut cur = start;

        for row in wins {
            cur = (x_desc.parser)(&row[0..x_desc.size]);

            for i in 0..ptrs.len() {
                let pos = x_desc.size + i * y_desc.size;
                out[i][row_idx] = (cur, (y_desc.parser)(&row[pos..(pos + y_desc.size)]));
            }

            row_idx += 1;
        }

        for (d, trace) in out.drain(0..).zip(traces) {
            trace.push_segment(
                    crate::structs::DataSegment {
                        from: start,
                        to: cur,
                        data: crate::structs::SegmentState::Complete(d),
                    }
                );
        }
    }
}

#[wasm_bindgen]
pub fn is_zero(data_ptr: DataIdx, from: f32, to: f32) -> bool {
    unsafe {
        let data = &DATA[data_ptr];

        data.get_data_in(from, to).any(|(_, y)| y.abs() > 1e-3)
    }
}

#[wasm_bindgen]
pub fn treshold(data_ptr: DataIdx, from: f32, to: f32, tres: f32) -> bool {
    unsafe {
        let data = &DATA[data_ptr];

        data.get_data_in(from, to).any(|(_, y)| y.abs() >= tres)
    }
}

#[wasm_bindgen]
pub fn get_extents(data_ptr: DataIdx, from: f32, to: f32) -> Box<[f32]> {
    unsafe {
        let data = &DATA[data_ptr];

        let (min, max) = data
            .get_data_in(from, to)
            .fold((f32::MAX, f32::MIN), |acc, (_, y)| {
                (acc.0.min(*y), acc.1.max(*y))
            });

        Box::new([from, to, min, max])
    }
}

// #[wasm_bindgen]
// pub fn get_extents_all(data_ptr: Box<[usize]>, from: f32, to: f32) -> Box<[f32]> {
//     unsafe {
//         let data = data_ptr.as_ref().unwrap();

//         let (min, max) = data
//             .get_data_in(from, to)
//             .fold((f32::MAX, f32::MIN), |acc, (_, y)| {
//                 (acc.0.min(*y), acc.1.max(*y))
//             });

//         Box::new([from, to, min, max])
//     }
// }
