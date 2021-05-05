use plotting::data;

#[test]
fn add_segments() {
    let ptr = data::create_trace("test", "datetime", "int");

    &data::get_trace_once(ptr, |deref| {
        assert_eq!(deref.id, "test");
        // assert_eq!(deref.get_segments().is_empty(), true);
    });
}
