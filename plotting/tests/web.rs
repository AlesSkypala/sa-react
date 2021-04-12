//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use wasm_bindgen_test::*;
use plotting::{data};

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn pass() {
    assert_eq!(1 + 1, 2);
}


#[wasm_bindgen_test]
fn add_segments() {
    let ptr = data::create_trace("test", "datetime", "int");

    unsafe { 
        let deref = ptr.as_mut().expect("Expected being able to deref.");
    }
}