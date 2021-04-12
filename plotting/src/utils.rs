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

// use crate::{data::{DataPtr, TYPE_SIZES}, structs::DataSegment};

// #[allow(dead_code)]

// pub struct TraceIterator {
//     data_ptr: DataPtr,

//     cursor: f32,
//     end: f32,

//     queue: Vec<&DataSegment>,
// }

// impl TraceIterator {
//     #[allow(dead_code)]
//     pub fn new(data_ptr: DataPtr, from: f32, to: f32) -> TraceIterator {
//         unsafe {
//             let data = data_ptr.as_ref().unwrap();

//             let x_size = *TYPE_SIZES.get(data.get_x_type().as_str()).expect("Unknown X type.");
//             let y_size = *TYPE_SIZES.get(data.get_y_type().as_str()).expect("Unknown Y type.");
//             let x_parse = TraceIterator::get_parser(data.get_x_type());
//             let y_parse = TraceIterator::get_parser(data.get_y_type());

//             let mut idx = 0usize;
//             let mut end = 0usize;

//             let len = data.data.len();
//             for i in (0..len).step_by(x_size + y_size) {
//                 let x = x_parse(&data.data[i..(i + x_size)]);

//                 let x_next = if i + x_size + y_size < len {
//                     Option::Some(x_parse(
//                         &data.data[(i + x_size + y_size)..(i + 2 * x_size + y_size)],
//                     ))
//                 } else {
//                     Option::None
//                 };

//                 if x >= from || (x_next.is_some() && x_next.unwrap() >= from) {
//                     idx = i;
//                     end = i;

//                     for j in (i..len).step_by(x_size + y_size) {
//                         let x = x_parse(&data.data[j..(j + x_size)]);

//                         let x_next = if j + x_size + y_size < len {
//                             Option::Some(x_parse(
//                                 &data.data[(j + x_size + y_size)..(j + 2 * x_size + y_size)],
//                             ))
//                         } else {
//                             Option::None
//                         };

//                         if x < to && (x_next.is_none() || x_next.unwrap() >= to) {
//                             if x_next.is_none() {
//                                 end = j + x_size + y_size;
//                                 break;
//                             } else if x_next.unwrap() >= to {
//                                 end = j + 2 * (x_size + y_size);
//                                 break;
//                             }
//                         }
//                     }

//                     break;
//                 }
//             }

//             TraceIterator {
//                 data_ptr,

//                 x_size,
//                 y_size,

//                 x_parse,
//                 y_parse,

//                 idx,
//                 end,
//             }
//         }
//     }

//     fn get_parser(t: &String) -> fn(&[u8]) -> f32 {
//         match &t[..] {
//             "int" => TraceIterator::parse_i32,
//             "float" => TraceIterator::parse_f32,
//             "datetime" => TraceIterator::parse_datetime,
//             _ => panic!("Unknown type."),
//         }
//     }

//     fn parse_i32(slice: &[u8]) -> f32 {
//         let mut data = [0u8; 4];
//         data.copy_from_slice(slice);

//         i32::from_le_bytes(data) as f32
//     }

//     fn parse_f32(slice: &[u8]) -> f32 {
//         let mut data = [0u8; 4];
//         data.copy_from_slice(slice);

//         f32::from_le_bytes(data)
//     }

//     fn parse_datetime(slice: &[u8]) -> f32 {
//         TraceIterator::parse_i32(slice)
//     }

//     // TODO: rest of the types
// }

// impl Iterator for TraceIterator {
//     type Item = (f32, f32);

//     fn next(&mut self) -> std::option::Option<<Self as std::iter::Iterator>::Item> {

//         if self.idx < self.end {
//             unsafe {
//                 let data = self.data_ptr.as_ref().unwrap();

//                 let segments: Vec<&DataSegment> = data.get_segments_in(self.cursor, self.end).collect();
//                 segments.iter().flat_map(|seg| seg.iter_in(from, to)).collect()

//                 let idx = self.idx;
//                 self.idx += self.x_size + self.y_size;

//                 Option::Some((
//                     (self.x_parse)(&data[idx..(idx + self.x_size)]),
//                     (self.y_parse)(&data[(idx + self.x_size)..self.idx]),
//                 ))
//             }
//         } else {
//             Option::None
//         }
//     }
// }
