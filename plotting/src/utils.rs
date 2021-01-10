pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

use plotters::prelude::RGBColor;
use wasm_bindgen::prelude::*;
use lazy_static::lazy_static;
use std::collections::{HashMap, hash_map::DefaultHasher};
use core::convert::TryInto;
use std::hash::Hasher;

pub struct SerializedData {
    pub x_type: String,
    pub y_type: String,
    pub color: RGBColor,
    pub data: Box<[u8]>
}

// impl SerializedData {
//     pub fn window()
// }

pub static mut DATA: Vec<SerializedData> = vec!();

lazy_static! {
    static ref TYPE_SIZES: HashMap<&'static str, usize> = [
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
    ].iter().cloned().collect();
}

#[wasm_bindgen]
pub fn malloc_data(data: Box<[u8]>, id: &str, x_type: &str, y_type: &str) -> usize {
    let mut hasher = DefaultHasher::new();
    hasher.write(id.as_bytes());
    let hash = hasher.finish() as u32;

    unsafe {
        DATA.push(SerializedData {
            data,
            color: RGBColor(hash as u8, (hash >> 8) as u8, (hash >> 16) as u8),
            x_type: x_type.into(),
            y_type: y_type.into()
        });
        DATA.len() - 1
    }
}

#[wasm_bindgen]
pub fn is_zero(data_ptr: usize) -> bool {
    unsafe {
        let data = &DATA[data_ptr];

        let (x_size, y_size) = (
            TYPE_SIZES.get(&data.x_type[..]).expect("Unknown X type."),
            TYPE_SIZES.get(&data.y_type[..]).expect("Unknown Y type.")
        );

        let comp = match &data.y_type[..] {
            "int" => |x| i32::from_le_bytes(x) != 0,
            "float" => |x| f32::from_le_bytes(x) != 0.0,
            _ => panic!("unknown type")
        };
        
        let data = &data.data;
        let mut pos = 0;
        while pos < data.len() {
            pos += x_size;

            if comp(data[pos..(pos + y_size)].try_into().unwrap()) {
                return false;
            }

            pos += y_size;
        }
    }

    true
}

#[wasm_bindgen]
pub fn is_zero_data(data: &[u8], x_type: &str, y_type: &str) -> bool {
    let (x_size, y_size) = (
        TYPE_SIZES.get(x_type).expect("Unknown X type."),
        TYPE_SIZES.get(y_type).expect("Unknown Y type.")
    );

    let comp = match y_type {
        "int" => |x| i32::from_le_bytes(x) != 0,
        "float" => |x| f32::from_le_bytes(x) != 0.0,
        _ => panic!("unknown type")
    };

    let mut pos = 0;
    while pos < data.len() {
        pos += x_size;
        
        if comp(data[pos..(pos + y_size)].try_into().unwrap()) {
            return false;
        }

        pos += y_size;
    }

    true
}

#[wasm_bindgen]
pub fn treshold(data_ptr: usize, tres: f32) -> bool {
    unsafe {
        let data = &DATA[data_ptr];

        let (x_size, y_size) = (
            TYPE_SIZES.get(&data.x_type[..]).expect("Unknown X type."),
            TYPE_SIZES.get(&data.y_type[..]).expect("Unknown Y type.")
        );

        let comp = match &data.y_type[..] {
            "int" => |x, tres| i32::from_le_bytes(x) > (tres as i32),
            "float" => |x, tres| f32::from_le_bytes(x) > tres,
            _ => panic!("unknown type")
        };
        
        let data = &data.data;
        let mut pos = 0;
        while pos < data.len() {
            pos += x_size;

            if comp(data[pos..(pos + y_size)].try_into().unwrap(), tres) {
                return true;
            }

            pos += y_size;
        }
    }

    false
}

#[wasm_bindgen]
pub fn treshold_data(data: &[u8], x_type: &str, y_type: &str, tres: f32) -> bool {
    let (x_size, y_size) = (
        TYPE_SIZES.get(x_type).expect("Unknown X type."),
        TYPE_SIZES.get(y_type).expect("Unknown Y type.")
    );

    let comp = match y_type {
        "int" => |x, tres| i32::from_le_bytes(x) > (tres as i32),
        "float" => |x, tres| f32::from_le_bytes(x) > tres,
        _ => panic!("unknown type")
    };

    let mut pos = 0;
    while pos < data.len() {
        pos += x_size;
        
        if comp(data[pos..(pos + y_size)].try_into().unwrap(), tres) {
            return true;
        }

        pos += y_size;
    }

    false
}

#[wasm_bindgen]
pub struct GraphExtents {
    pub x_start: f32,
    pub x_end: f32,
    pub y_start: f32,
    pub y_end: f32,
}

#[wasm_bindgen]
impl GraphExtents {
    #[wasm_bindgen(constructor)]
    pub fn new(x_start: f32, x_end: f32, y_start: f32, y_end: f32) -> Self {
        GraphExtents {
            x_start,
            x_end,
            y_start,
            y_end,
        }
    }

    fn outer(mut self, b: Self) -> Self {
        self.x_start = self.x_start.min(b.x_start);
        self.y_start = self.y_start.min(b.y_start);

        self.x_end = self.x_end.max(b.x_end);
        self.y_end = self.y_end.max(b.y_end);

        self
    }    
}

#[allow(dead_code)]
#[wasm_bindgen]
pub fn recommend_range(data_ptr: usize, overhang: f32) -> GraphExtents {
    let overhang = overhang + 1.0;
    
    unsafe {
        let data = &DATA[data_ptr];
        let x_size = *TYPE_SIZES.get(&data.x_type[..]).unwrap();
        let y_size = *TYPE_SIZES.get(&data.x_type[..]).unwrap();

        assert_eq!(data.data.len() % (x_size + y_size), 0);

        let x_parser = TraceIterator::get_parser(&data.x_type);
        let y_parser = TraceIterator::get_parser(&data.y_type);

        let data = &data.data;
        let last_idx = data.len() - x_size - y_size;

        let (x_start, x_end) = (x_parser(&data[0..x_size]), x_parser(&data[last_idx..(last_idx + x_size)]));

        let y_iter = (x_size..data.len()).step_by(x_size + y_size).map(|i| y_parser(&data[i..(i+y_size)]));

        let y_start = y_iter.clone().fold(f32::INFINITY, |a, b| a.min(b));
        let y_end   = y_iter.fold(f32::NEG_INFINITY, |a, b| a.max(b));

        let over_width = (x_end - x_start) * overhang;
        let over_height = (y_end - y_start) * overhang;

        GraphExtents {
            x_start: x_end - over_width,
            x_end: x_start + over_width,

            y_start: y_end - over_height,
            y_end: y_start + over_height,
        }
    }
}

#[wasm_bindgen]
pub fn recommend_range_all(data_ptrs: &[usize], overhang: f32) -> GraphExtents {
    data_ptrs.iter().map(|p| recommend_range(*p, overhang)).fold(
        GraphExtents {
            x_start: f32::INFINITY,
            y_start: f32::INFINITY,
            x_end: f32::NEG_INFINITY,
            y_end: f32::NEG_INFINITY
        },
        |a, b| a.outer(b)
    )
}

pub struct TraceIterator {
    data_ptr: usize,
    idx: usize,
    end: usize,

    x_size: usize,
    y_size: usize,

    x_parse: fn(&[u8]) -> f32,
    y_parse: fn(&[u8]) -> f32,
}

impl TraceIterator {
    #[allow(dead_code)]
    pub fn new(data_ptr: usize, from: f32, to: f32) -> TraceIterator {
        unsafe {
            let data = &DATA[data_ptr];

            let x_size = *TYPE_SIZES.get(&data.x_type[..]).expect("Unknown X type.");
            let y_size = *TYPE_SIZES.get(&data.y_type[..]).expect("Unknown Y type.");
            let x_parse = TraceIterator::get_parser(&data.x_type);
            let y_parse = TraceIterator::get_parser(&data.y_type);

            let mut idx = 0usize;
            let mut end = 0usize;

            let len = data.data.len();
            for i in (0..len).step_by(x_size + y_size) {
                let x = x_parse(&data.data[i..(i + x_size)]);

                let x_next = if i + x_size + y_size < len {
                    Option::Some(x_parse(&data.data[(i + x_size + y_size)..(i + 2 * x_size + y_size)]))
                } else {
                    Option::None
                };

                if x >= from || (x_next.is_some() && x_next.unwrap() >= from) {
                    idx = i;
                    end = i;
                    
                    for j in (i..len).step_by(x_size + y_size) {
                        let x = x_parse(&data.data[j..(j + x_size)]);
        
                        let x_next = if j + x_size + y_size < len {
                            Option::Some(x_parse(&data.data[(j + x_size + y_size)..(j + 2 * x_size + y_size)]))
                        } else {
                            Option::None
                        };

                        if x < to && (x_next.is_none() || x_next.unwrap() >= to) {
                            if x_next.is_none() {
                                end = j + x_size + y_size;
                                break;
                            } else if x_next.unwrap() >= to {
                                end = j + 2 * (x_size + y_size);
                                break;
                            }
                        }
                    }
                    
                    break;
                }
            }

            TraceIterator {
                data_ptr,

                x_size,
                y_size,

                x_parse,
                y_parse,

                idx,
                end,
            }
        }
    }

    fn get_parser(t: &String) -> fn(&[u8]) -> f32 {
        match &t[..] {
            "int" => TraceIterator::parse_i32,
            "float" => TraceIterator::parse_f32,
            "datetime" => TraceIterator::parse_datetime,
            _ => panic!("Unknown type."),
        }
    }

    fn parse_i32(slice: &[u8]) -> f32 {
        let mut data = [0u8; 4];
        data.copy_from_slice(slice);

        i32::from_le_bytes(data) as f32
    }

    fn parse_f32(slice: &[u8]) -> f32 {
        let mut data = [0u8; 4];
        data.copy_from_slice(slice);

        f32::from_le_bytes(data)
    }

    fn parse_datetime(slice: &[u8]) -> f32 {
        TraceIterator::parse_i32(slice)
    }

    // TODO: rest of the types
}

impl Iterator for TraceIterator {
    type Item = (f32, f32);
    
    fn next(&mut self) -> std::option::Option<<Self as std::iter::Iterator>::Item> {
        if self.idx < self.end {
            unsafe {
                let data = &DATA[self.data_ptr].data;
                let idx = self.idx;
                self.idx += self.x_size + self.y_size;

                Option::Some((
                    (self.x_parse)(&data[idx..(idx + self.x_size)]),
                    (self.y_parse)(&data[(idx + self.x_size)..self.idx])
                ))
            }
        } else {
            Option::None
        }
    }
}