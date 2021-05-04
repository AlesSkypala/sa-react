pub type RangePrec = f64;
pub type DataPrec = f32;

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

    fn get_segments_in(&self, from: RangePrec, to: RangePrec) -> impl Iterator<Item = &Box<dyn Segment>> {
        self.segments
            .iter()
            .filter(move |&x| x.intersects(from, to))
    }

    pub fn get_data_in<'a>(&'a self, from: RangePrec, to: RangePrec) -> impl Iterator<Item = (DataPrec, DataPrec)> + 'a {
        self.get_segments_in(from, to)
            .flat_map(move |seg| seg.iter_in(from, to))
    }

    pub fn get_data_with_origin<'a>(&'a self, from: RangePrec, to: RangePrec, x_orig: RangePrec, y_orig: RangePrec) -> impl Iterator<Item = (DataPrec, DataPrec)> + 'a {
        self.get_segments_in(from, to)
            .flat_map(move |seg| seg.iter_with_origin(from, to, x_orig, y_orig))
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

    pub data: Box<[(X, Y)]>
}

pub trait SegmentNumeric {
    fn to_rangeprec(self) -> RangePrec;
    fn to_dataprec(self)  -> DataPrec;
}

macro_rules! impl_segment {
    ($t:ty) => {
        impl SegmentNumeric for $t { fn to_rangeprec(self) -> RangePrec { self as RangePrec } fn to_dataprec(self) -> DataPrec { self as DataPrec } }
    };
}

impl_segment!(f32);
impl_segment!(f64);

impl_segment!(i16);
impl_segment!(i32);
impl_segment!(i64);

impl_segment!(u8);
impl_segment!(u16);
impl_segment!(u32);
impl_segment!(u64);

pub trait Segment {
    fn from(&self) -> RangePrec;
    fn to(&self) -> RangePrec;

    fn contains(&self, point: RangePrec) -> bool;
    fn intersects(&self, from: RangePrec, to: RangePrec) -> bool;
    fn iter_in<'a>(&'a self, from: RangePrec, to: RangePrec) -> Box<dyn Iterator<Item = (DataPrec, DataPrec)> + 'a>;
    fn iter_with_origin<'a>(&'a self, from: RangePrec, to: RangePrec, x_orig: RangePrec, y_orig: RangePrec) -> Box<dyn Iterator<Item = (DataPrec, DataPrec)> + 'a>;
}

impl<X: SegmentNumeric + Copy, Y: SegmentNumeric + Copy> Segment for DataSegment<X, Y> {
    fn contains(&self, point: RangePrec) -> bool {
        self.from <= point && self.to >= point
    }

    fn intersects(&self, from: RangePrec, to: RangePrec) -> bool {
        self.from < to && self.to >= from
    }

    fn iter_in<'a>(&'a self, from: RangePrec, to: RangePrec) -> Box<dyn Iterator<Item = (DataPrec, DataPrec)> + 'a> {
        Box::new((&self.data).iter()
            .skip_while(move |(x, _)| x.to_rangeprec() < from)
            .take_while(move |(x, _)| x.to_rangeprec() < to)
            .map(|(x,y)|(x.to_dataprec(), y.to_dataprec()))
        )
    }

    fn iter_with_origin<'a>(&'a self, from: RangePrec, to: RangePrec, x_orig: RangePrec, y_orig: RangePrec) -> Box<dyn Iterator<Item = (DataPrec, DataPrec)> + 'a> {
        Box::new((&self.data).iter()
            .skip_while(move |(x, _)| x.to_rangeprec() < from)
            .take_while(move |(x, _)| x.to_rangeprec() < to)
            .map(move |(x,y)|((x.to_rangeprec() - x_orig) as f32, (y.to_rangeprec() - y_orig) as f32))
        )
    }

    fn from(&self) -> RangePrec {
        self.from
    }

    fn to(&self) -> RangePrec {
        self.to
    }
}
