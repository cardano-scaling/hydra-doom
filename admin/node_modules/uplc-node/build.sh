rm -rf pkg pkg-node pkg-web
wasm-pack build --target nodejs
mv pkg pkg-node
wasm-pack build --target web
mv pkg pkg-web
