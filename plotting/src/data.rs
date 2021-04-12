use std::collections::HashMap;

use crate::structs::TraceData;
use lazy_static::lazy_static;
use wasm_bindgen::prelude::*;

pub type DataPtr = *mut TraceData;

pub static mut DATA: Vec<TraceData> = vec![];

lazy_static! {
    pub static ref TYPE_SIZES: HashMap<&'static str, usize> = [
        ("datetime", 4),
        ("byte", 1),
        ("boolean", 1),
        ("short", 2),
        ("int", 4),
        ("long", 8),
        ("ushort", 2),
        ("uint", 4),
        ("ulong", 8),
        ("float", 4),
        ("double", 8),
    ]
    .iter()
    .cloned()
    .collect();
}

#[wasm_bindgen]
pub fn create_trace(id: &str, x_type: &str, y_type: &str) -> DataPtr {
    unsafe {
        DATA.push(TraceData {
            id: String::from(id),
            x_type: String::from(x_type),
            y_type: String::from(y_type),

            segments: vec![],
        });

        DATA.last_mut().unwrap()
    }
}

#[wasm_bindgen]
pub fn is_zero(data_ptr: DataPtr, from: f32, to: f32) -> bool {
    unsafe {
        let data = data_ptr.as_ref().unwrap();

        data.get_data_in(from, to).any(|(_, y)| y.abs() > 1e-3)
    }
}

#[wasm_bindgen]
pub fn treshold(data_ptr: DataPtr, from: f32, to: f32, tres: f32) -> bool {
    unsafe {
        let data = data_ptr.as_ref().unwrap();

        data.get_data_in(from, to).any(|(_, y)| y.abs() >= tres)
    }
}

#[wasm_bindgen]
pub fn get_extents(data_ptr: DataPtr, from: f32, to: f32) -> Box<[f32]> {
    unsafe {
        let data = data_ptr.as_ref().unwrap();

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
