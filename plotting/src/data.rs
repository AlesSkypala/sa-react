use std::convert::TryInto;
use std::{cell::RefCell, collections::HashMap};

use crate::structs::{DataPrec, RangePrec, Segment, TraceData};
use lazy_static::lazy_static;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

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
pub fn create_trace(id: &str, x_type: &str) -> DataIdx {
    let handle = unsafe {
        let prev = AVAIL_HANDLE;

        AVAIL_HANDLE += 1;

        prev
    };

    DATA.with(|data| {
        data.borrow_mut().insert(
            handle,
            TraceData {
                id: String::from(id.clone()),
                x_type: String::from(x_type.clone()),

                segments: vec![],
            },
        )
    });

    handle
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
pub fn op_traces(output: DataIdx, ptrs: &[DataIdx], op: &str, from: RangePrec, to: RangePrec) {
    let mul = match op {
        "sum" => 1.0,
        "avg" => 1.0 / ptrs.len() as f64,
        _ => panic!("Unknown operation"),
    };

    let mut data = get_trace_ret(*ptrs.first().unwrap(), |t| {
        let mut current = Vec::<(i32, f64)>::new();
        for (x, y) in t.get_data_high_prec(from, to) {
            current.push((x as i32, y * mul));
        }

        current
    });

    for t in ptrs.iter().skip(1) {
        get_trace(*t, |t| {
            for (row, (_, y)) in data.iter_mut().zip(t.get_data_high_prec(from, to)) {
                row.1 += y * mul;
            }
        });
    }

    let data = unsafe { std::mem::transmute(data) };
    get_trace_once(output, move |t| {
        t.push_segment(create_segment(t.x_type.as_str(), "double", from, to, data));
    });
}

#[wasm_bindgen]
pub fn trace_avgs(ptrs: &[DataIdx], from: RangePrec, to: RangePrec) -> JsValue {
    JsValue::from_serde(
        &ptrs
            .iter()
            .map(|t| {
                let mut sum = 0.0;
                let mut idx = 0;

                get_trace_once(*t, |trace| {
                    for (_, y) in trace.get_data_high_prec(from, to) {
                        sum += y;
                        idx += 1;
                    }
                });

                (*t, sum / idx as f64)
            })
            .collect::<Vec<(DataIdx, f64)>>(),
    )
    .unwrap()
}

#[derive(Serialize, Deserialize)]
pub struct TraceMetas {
    pub avg: RangePrec,
    pub min: RangePrec,
    pub max: RangePrec,
}

#[wasm_bindgen]
pub fn get_trace_metas(ptr: DataIdx, from: RangePrec, to: RangePrec) -> JsValue {
    let mut metas = TraceMetas { avg: 0.0, min: RangePrec::MAX, max: RangePrec::MIN };
    let mut pts = 0;

    get_trace_once(ptr, |trace| {
        for (_x, y) in trace.get_data_high_prec(from, to) {
            metas.avg += y;
            metas.min = RangePrec::min(metas.min, y);
            metas.max = RangePrec::max(metas.max, y);

            pts += 1;
        }
    });

    metas.avg = metas.avg / pts as RangePrec;

    JsValue::from_serde(&metas).unwrap()
}

pub fn get_data_at_iter<'a>(
    ptrs: &'a [DataIdx],
    x: RangePrec,
) -> impl Iterator<Item = (DataIdx, RangePrec)> + 'a {
    ptrs.iter()
        .map(move |&p| (p, get_trace_ret(p, |trace| trace.get_data_at(x))))
        .filter(|a| a.1.is_some())
        .map(|(a, b)| (a, b.unwrap()))
}

#[wasm_bindgen]
pub fn get_data_at(ptrs: &[DataIdx], x: RangePrec) -> JsValue {
    JsValue::from_serde(
        &ptrs
            .iter()
            .map(move |&p| (p, get_trace_ret(p, |trace| trace.get_data_at(x))))
            .filter(|a| a.1.is_some())
            .map(|(a, b)| (a, b.unwrap()))
            .collect::<Vec<(DataIdx, RangePrec)>>(),
    )
    .unwrap()
}

#[wasm_bindgen]
pub fn find_closest(ptrs: &[DataIdx], x: RangePrec, y: RangePrec, max_dy: RangePrec) -> Option<DataIdx> {
    let mut dists: Vec<(DataIdx, RangePrec)> = get_data_at_iter(ptrs, x)
        .map(|d| (d.0, (d.1 - y).abs()))
        .filter(|(_, dy)| *dy < max_dy)
        .collect();

    dists.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

    dists.first().map(|f| f.0)
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

    for (d, handle) in out.drain(0..).zip(ptrs.iter()) {
        get_trace_once(*handle, move |trace| {
            trace.push_segment(create_segment(x_type, y_type, start, cur, d))
        });
    }
}

pub fn create_segment(
    x_type: &str,
    y_type: &str,
    from: RangePrec,
    to: RangePrec,
    d: Vec<u8>,
) -> Box<dyn Segment> {
    macro_rules! create_segment {
        ( $xt:ty, $yt:ty, $d:expr ) => {
            Box::new(crate::structs::DataSegment::<$xt, $yt> {
                from,
                to,
                data: unsafe { std::mem::transmute($d) },
            })
        };
    }

    match (x_type, y_type) {
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
    }
}

#[wasm_bindgen]
pub fn is_zero(data_ptr: DataIdx, from: RangePrec, to: RangePrec) -> bool {
    let mut result = true;
    get_trace(data_ptr, |trace| {
        result = trace.get_data_in(from, to).any(|(_, y)| y.abs() > 1e-3)
    });

    !result
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
