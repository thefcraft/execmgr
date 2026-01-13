#!/bin/sh
mkdir -p bin
cargo build --release
cp ./target/release/execmgr ./bin