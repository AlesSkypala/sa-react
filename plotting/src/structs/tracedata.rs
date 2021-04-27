pub type RangePrec = f32;

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

pub struct DataSegment {
    pub from: RangePrec,
    pub to: RangePrec,

    pub data: SegmentState,
}

pub enum SegmentState {
    Loading,
    Error,
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
        self.from <= point && self.to >= point
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
