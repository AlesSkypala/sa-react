use plotting::{data};

#[test]
fn add_segments() {
    let ptr = data::create_trace("test", "datetime", "int");

    unsafe { 
        let deref = &data::DATA[ptr];

        assert_eq!(deref.id, "test");
        assert_eq!(deref.get_segments().is_empty(), true);
    }
}