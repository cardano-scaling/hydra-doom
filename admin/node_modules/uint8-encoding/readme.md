# Uint8 Encoding

Uint8 encoding, a simple way to convert strings to Uint8Arrays and vice versa.

## Features

It's just a simple wrapper around TextEncoder and TextDecoder, but it provides a cleaner API and it handles nuances like the BOM character for you.

## Install

```sh
npm install --save uint8-encoding
```

## Usage

```ts
import U8 from 'uint8-encoding';

const raw = 'Hello 😃';
const encoded = U8.encode ( raw );
console.log ( encoded ); // => Uint8Array(10) [72, 101, 108, 108, 111,  32, 240, 159, 152, 131]

const decoded = U8.decode ( encoded );
console.log ( decoded ); // => 'Hello 😃'
```

## License

MIT © Fabio Spampinato
