use std::convert::TryInto;
use std::{cell::RefCell, collections::HashMap};

use crate::structs::{DataPrec, RangePrec, TraceData};
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
    pub parser: fn(&[u8]) -> RangePrec,
}

impl TypeDescriptor {
    pub fn new(size: usize, parser: fn(&[u8]) -> RangePrec) -> Self {
        Self {
            size,
            parser: parser,
        }
    }
}

macro_rules! type_map {
    ( "datetime" ) => {
        i32
    };
    ( "short" ) => {
        i16
    };
    ( "int" ) => {
        i32
    };
    ( "long" ) => {
        i64
    };
    ( "byte" ) => {
        u8
    };
    ( "ushort" ) => {
        u16
    };
    ( "uint" ) => {
        u32
    };
    ( "ulong" ) => {
        u64
    };
    ( "float" ) => {
        f32
    };
    ( "double" ) => {
        f64
    };
}

macro_rules! type_desc {
    ( $m:expr, $s:expr, $t:ty ) => {
        $m.insert(
            $s,
            TypeDescriptor::new(std::mem::size_of::<$t>(), |a| <$t>::from_le_bytes(a.try_into().unwrap()) as RangePrec),
        )
    };
    ( $m: expr, [ $($s:expr, $t:ty),+ ] ) => {
        $(
            type_desc!($m, $s, $t);
        )+
    };
    ( $m:expr ) => {
        type_desc!($m, [
            "datetime", type_map!("datetime"),
            "short", type_map!("short"),
            "int", type_map!("int"),
            "long", type_map!("long"),
            "byte", type_map!("byte"),
            "ushort", type_map!("ushort"),
            "uint", type_map!("uint"),
            "ulong", type_map!("ulong"),
            "float", type_map!("float"),
            "double", type_map!("double")
        ])
    };
}

lazy_static! {
    pub static ref TYPE_SIZES: HashMap<&'static str, TypeDescriptor> = {
        let mut m = HashMap::new();

        type_desc!(m);

        m
    };
}

#[wasm_bindgen]
pub fn create_trace(id: &str, x_type: &str, y_type: &str) -> DataIdx {
    unsafe {
        let handle = AVAIL_HANDLE;

        AVAIL_HANDLE += 1;

        DATA.with(|data| {
            data.borrow_mut().insert(
                handle,
                TraceData {
                    id: String::from(id.clone()),
                    x_type: String::from(x_type.clone()),
                    y_type: String::from(y_type.clone()),

                    segments: vec![],
                },
            )
        });

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
    let row_len = x_desc.size + y_desc.size;

    let wins = data.chunks_exact(x_desc.size + y_desc.size * ptrs.len());
    let points = wins.clone().len();
    let mut out = vec![vec![0u8; points * row_len]; ptrs.len()];

    let mut row_idx = 0;

    let start = (x_desc.parser)(&data[0..x_desc.size]);
    let mut cur = start;

    for row in wins {
        cur = (x_desc.parser)(&row[0..x_desc.size]);

        for i in 0..ptrs.len() {
            let data_pos = x_desc.size + i * y_desc.size;
            let dest_x = row_idx * row_len;
            let dest_y = dest_x + x_desc.size;

            out[i][dest_x..(dest_x + x_desc.size)].copy_from_slice(&row[0..x_desc.size]);
            out[i][dest_y..(dest_y + y_desc.size)]
                .copy_from_slice(&row[data_pos..(data_pos + y_desc.size)]);
        }

        row_idx += 1;
    }

    macro_rules! create_segment {
        ( $xt:ty, $yt:ty, $d:expr ) => {
            unsafe {
                let data = Vec::<($xt, $yt)>::from_raw_parts(
                    std::mem::transmute($d.leak().as_mut_ptr()),
                    points,
                    points,
                )
                .into_boxed_slice();
                Box::new(crate::structs::DataSegment::<$xt, $yt> {
                    from: start,
                    to: cur,
                    data,
                })
            }
        };
    }

    for (d, handle) in out.drain(0..).zip(ptrs.iter()) {
        get_trace_once(*handle, move |trace| {
            trace.push_segment(match (x_type, y_type) {
                ("datetime", "short") => {
                    create_segment!(type_map!("datetime"), type_map!("short"), d)
                }
                ("datetime", "int") => create_segment!(type_map!("datetime"), type_map!("int"), d),
                ("datetime", "long") => {
                    create_segment!(type_map!("datetime"), type_map!("long"), d)
                }
                ("datetime", "byte") => {
                    create_segment!(type_map!("datetime"), type_map!("byte"), d)
                }
                ("datetime", "ushort") => {
                    create_segment!(type_map!("datetime"), type_map!("ushort"), d)
                }
                ("datetime", "uint") => {
                    create_segment!(type_map!("datetime"), type_map!("uint"), d)
                }
                ("datetime", "ulong") => {
                    create_segment!(type_map!("datetime"), type_map!("ulong"), d)
                }
                ("datetime", "float") => {
                    create_segment!(type_map!("datetime"), type_map!("float"), d)
                }
                ("datetime", "double") => {
                    create_segment!(type_map!("datetime"), type_map!("double"), d)
                }

                _ => panic!("Unknown XY pair"),
            })
        });
    }
}

#[wasm_bindgen]
pub fn is_zero(data_ptr: DataIdx, from: RangePrec, to: RangePrec) -> bool {
    let mut result = true;
    get_trace(data_ptr, |trace| {
        result = trace.get_data_in(from, to).any(|(_, y)| y.abs() > 1e-3)
    });

    result
}

#[wasm_bindgen]
pub fn treshold(data_ptr: DataIdx, from: RangePrec, to: RangePrec, tres: DataPrec) -> bool {
    let mut result = true;
    get_trace(data_ptr, |trace| {
        result = trace.get_data_in(from, to).any(|(_, y)| y.abs() >= tres)
    });

    result
}

#[wasm_bindgen]
pub fn get_extents(data_ptr: DataIdx, from: RangePrec, to: RangePrec) -> Box<[RangePrec]> {
    let mut result = (0.0, 1.0);
    get_trace(data_ptr, |trace| {
        result = trace
            .get_data_in(from, to)
            .fold((f32::MAX, f32::MIN), |acc, (_, y)| {
                (acc.0.min(y), acc.1.max(y))
            })
    });

    Box::new([from, to, result.0 as RangePrec, result.1 as RangePrec])
}
