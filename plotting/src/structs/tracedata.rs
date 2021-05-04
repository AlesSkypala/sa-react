pub type RangePrec = f32;

pub struct TraceData {
    pub id: String,
    pub x_type: String,
    pub y_type: String,

    pub segments: Vec<Box<dyn Segment>>,
}

impl TraceData {
    pub fn get_x_type(&self) -> &String {
        &self.x_type
    }

    pub fn get_y_type(&self) -> &String {
        &self.y_type
    }

    // fn get_segments(&self) -> &Vec<Box<dyn Segment>> {
    //     &self.segments
    // }

    fn get_segments_in(&self, from: f32, to: f32) -> impl Iterator<Item = &Box<dyn Segment>> {
        self.segments
            .iter()
            .filter(move |&x| x.intersects(from, to))
    }

    pub fn get_data_in<'a>(&'a self, from: f32, to: f32) -> impl Iterator<Item = (f32, f32)> + 'a {
        self.get_segments_in(from, to)
            .flat_map(move |seg| seg.iter_in(from, to))
    }

    pub fn push_segment(&mut self, seg: Box<dyn Segment>) {
        // TODO: merge if overlap

        self.segments.push(seg);
        self.segments
            .sort_by(|a, b| a.from().partial_cmp(&b.from()).unwrap());
    }
}

pub struct DataSegment<X, Y> {
    pub from: RangePrec,
    pub to: RangePrec,

    pub data: Vec<(X, Y)>
}

pub trait SegmentNumeric {
    fn to_float(self) -> f32;
}

impl SegmentNumeric for f32 { fn to_float(self) -> f32 { self } }
impl SegmentNumeric for f64 { fn to_float(self) -> f32 { self as f32 } }
impl SegmentNumeric for i32 { fn to_float(self) -> f32 { self as f32 } }
impl SegmentNumeric for i64 { fn to_float(self) -> f32 { self as f32 } }
impl SegmentNumeric for u32 { fn to_float(self) -> f32 { self as f32 } }
impl SegmentNumeric for u64 { fn to_float(self) -> f32 { self as f32 } }

pub trait Segment {
    fn from(&self) -> RangePrec;
    fn to(&self) -> RangePrec;

    fn contains(&self, point: RangePrec) -> bool;
    fn intersects(&self, from: RangePrec, to: RangePrec) -> bool;
    fn iter_in<'a>(&'a self, from: RangePrec, to: RangePrec) -> Box<dyn Iterator<Item = (f32, f32)> + 'a>;
}

impl<X: SegmentNumeric + Copy, Y: SegmentNumeric + Copy> Segment for DataSegment<X, Y> {
    fn contains(&self, point: RangePrec) -> bool {
        self.from <= point && self.to >= point
    }

    fn intersects(&self, from: RangePrec, to: RangePrec) -> bool {
        self.from < to && self.to >= from
    }

    fn iter_in<'a>(&'a self, from: RangePrec, to: RangePrec) -> Box<dyn Iterator<Item = (f32, f32)> + 'a> {
        Box::new((&self.data).iter()
            .skip_while(move |(x, _)| x.to_float() < from)
            .take_while(move |(x, _)| x.to_float() < to)
            .map(|(x,y)|(x.to_float(), y.to_float()))
        )
    }

    fn from(&self) -> f32 {
        self.from
    }

    fn to(&self) -> f32 {
        self.to
    }
}
