# Node Buffer Encoding

A little wrapper around Node's Buffer that provides encoding/decoding for all supported encodings.

If you have access to Node's Buffer you probably just want to use it directly instead. This module provides a unified API to some of my other modules, and allows me not to import "@types/node" everywhere.

## Install

```sh
npm install --save node-buffer-encoding
```

## Usage

```ts
import Encoding from 'node-buffer-encoding';

// Encode an Uint8Array with the given encoding
Encoding.encode ( new Uint8Array ([ 0, 255 ]), 'hex' ); // => '00ff'

// Encode a string with the given encoding
Encoding.encodeStr ( 'hello', 'base64' ); // => 'aGVsbG8='

// Decode a string with the given encoding to an Uint8Array
Encoding.decode ( '00ff', 'hex' ); // => Uint8Array(2) [ 0, 255 ]

// Decode a string with the given encoding to a string
Encoding.decodeStr ( 'aGVsbG8=', 'base64' ); // => 'hello'
```

## License

MIT © Fabio Spampinato
