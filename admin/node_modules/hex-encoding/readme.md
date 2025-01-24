# Hex Encoding

Hex encoding. An extremely fast and synchronous JS implementation.

If you can make this faster without using WASM or async stuff please ping me.

## Install

```sh
npm install --save hex-encoding
```

## Usage

```ts
import Hex from 'hex-encoding';

// Hex encoding & decoding

{
  const raw = 'Hello 😃';
  const uint8 = new TextEncoder ().encode ( raw );
  console.log ( uint8 ); // => Uint8Array(10) [ 72, 101, 108, 108, 111,  32, 240, 159, 152, 131 ]

  const encoded = Hex.encode ( uint8 );
  console.log ( encoded ); // => '48656c6c6f20f09f9883'

  const decoded = Hex.decode ( encoded );
  console.log ( decoded ); // => // => Uint8Array(10) [ 72, 101, 108, 108, 111,  32, 240, 159, 152, 131 ]
}

// String encoding & decoding

{
  const raw = 'Hello 😃';
  const encoded = Hex.encodeStr ( raw );
  console.log ( encoded ); // => '48656c6c6f20f09f9883'

  const decoded = Hex.decodeStr ( encoded );
  console.log ( decoded ); // => 'Hello 😃'
}

// Check if a string is hex-encoded

{
  console.log ( Hex.is ( '48656c6c6f20f09f9883' ) ); // => true
  console.log ( Hex.is ( '😃' ) ); // => false
}
```

## License

MIT © Fabio Spampinato
