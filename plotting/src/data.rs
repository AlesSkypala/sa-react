use std::{cell::RefCell, collections::HashMap};
use std::convert::TryInto;

use crate::structs::TraceData;
use lazy_static::lazy_static;
use wasm_bindgen::prelude::*;

// pub type DataPtr = *mut TraceData;
pub type DataIdx = usize;

static mut AVAIL_HANDLE: DataIdx = 0;

thread_local! {
    static DATA: RefCell<HashMap<DataIdx, TraceData>> = RefCell::new(HashMap::new());
}

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

        m.insert(
            "datetime",
            TypeDescriptor::new(4, |a| i32::from_le_bytes(a.try_into().unwrap()) as f32),
        );
        m.insert(
            "byte",
            TypeDescriptor::new(1, |a| u8::from_le_bytes(a.try_into().unwrap()) as f32),
        );

        m.insert(
            "short",
            TypeDescriptor::new(2, |a| i8::from_le_bytes(a.try_into().unwrap()) as f32),
        );
        m.insert(
            "int",
            TypeDescriptor::new(4, |a| i32::from_le_bytes(a.try_into().unwrap()) as f32),
        );
        m.insert(
            "long",
            TypeDescriptor::new(8, |a| i64::from_le_bytes(a.try_into().unwrap()) as f32),
        );

        m.insert(
            "ushort",
            TypeDescriptor::new(2, |a| u16::from_le_bytes(a.try_into().unwrap()) as f32),
        );
        m.insert(
            "uint",
            TypeDescriptor::new(4, |a| u32::from_le_bytes(a.try_into().unwrap()) as f32),
        );
        m.insert(
            "ulong",
            TypeDescriptor::new(8, |a| u64::from_le_bytes(a.try_into().unwrap()) as f32),
        );

        m.insert(
            "float",
            TypeDescriptor::new(4, |a| f32::from_le_bytes(a.try_into().unwrap())),
        );
        m.insert(
            "double",
            TypeDescriptor::new(8, |a| f64::from_le_bytes(a.try_into().unwrap()) as f32),
        );

        m
    };
}

#[wasm_bindgen]
pub fn create_trace(id: &str, x_type: &str, y_type: &str) -> DataIdx {
    unsafe {
        let handle = AVAIL_HANDLE;

        AVAIL_HANDLE += 1;

        DATA.with(|data| data.borrow_mut().insert(handle, TraceData {
            id: String::from(id.clone()),
            x_type: String::from(x_type.clone()),
            y_type: String::from(y_type.clone()),

            segments: vec![],
        }));

        handle
    }
}

pub fn dispose_trace(handle: DataIdx) {
    DATA.with(|data| data.borrow_mut().remove(&handle));
}

pub fn get_trace<T: FnMut(&mut TraceData)>(handle: DataIdx, mut func: T) {
    DATA.with(|data| func(data.borrow_mut().get_mut(&handle).unwrap()));
}

pub fn get_trace_once<T: FnOnce(&mut TraceData)>(handle: DataIdx, func: T) {
    DATA.with(|data| func(data.borrow_mut().get_mut(&handle).unwrap()));
}

pub fn get_trace_ret<T: FnOnce(&mut TraceData) -> R, R>(handle: DataIdx, func: T) -> R {
    DATA.with(|data| func(data.borrow_mut().get_mut(&handle).unwrap()))
}

#[wasm_bindgen]
pub fn bulkload_segments(ptrs: &[DataIdx], x_type: &str, y_type: &str, data: Box<[u8]>) {
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

    for (d, handle) in out.drain(0..).zip(ptrs.iter()) {
        get_trace_once(*handle, move |trace|
            trace.push_segment(crate::structs::DataSegment {
                from: start,
                to: cur,
                data: crate::structs::SegmentState::Complete(d),
            })
        );
    }
}

#[wasm_bindgen]
pub fn is_zero(data_ptr: DataIdx, from: f32, to: f32) -> bool {
    let mut result = true;
    get_trace(data_ptr, |trace| result = trace.get_data_in(from, to).any(|(_, y)| y.abs() > 1e-3));

    result
}

#[wasm_bindgen]
pub fn treshold(data_ptr: DataIdx, from: f32, to: f32, tres: f32) -> bool {
    let mut result = true;
    get_trace(data_ptr, |trace| result = trace.get_data_in(from, to).any(|(_, y)| y.abs() >= tres));

    result
}

#[wasm_bindgen]
pub fn get_extents(data_ptr: DataIdx, from: f32, to: f32) -> Box<[f32]> {
    let mut result = (0.0, 1.0);
    get_trace(data_ptr,
        |trace|
        result = trace.get_data_in(from, to)
        .fold((f32::MAX, f32::MIN), |acc, (_, y)| {
            (acc.0.min(*y), acc.1.max(*y))
        }));

    Box::new([from, to, result.0, result.1])
}
