use plotting::{data};

#[test]
fn add_segments() {
    let ptr = data::create_trace("test", "datetime", "int");

    unsafe { 
        let deref = ptr.as_mut().expect("Expected being able to deref.");

        assert_eq!(deref.id, "test");
        assert_eq!(deref.get_segments().is_empty(), true);
    }
}