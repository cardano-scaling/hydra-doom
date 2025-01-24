
/* IMPORT */

import benchmark from 'benchloop';
import fs from 'node:fs';
import U8 from 'uint8-encoding';
import Hex from '../dist/node.js';

/* HELPERS */

const WAP = fs.readFileSync ( './tasks/fixture.txt', 'utf8' );
const WAP_UINT8 = U8.encode ( WAP );
const WAP_ENCODED = Hex.encodeStr ( WAP );
const WAP_ENCODED_UINT8 = Hex.encode ( WAP_UINT8 );

/* MAIN */

benchmark.defaultOptions = Object.assign ( benchmark.defaultOptions, {
  iterations: 1
});

benchmark ({
  name: 'encode',
  fn: () => {
    Hex.encode ( WAP_UINT8 );
  }
});

benchmark ({
  name: 'encodeStr',
  fn: () => {
    Hex.encode ( WAP );
  }
});

benchmark ({
  name: 'decode',
  fn: () => {
    Hex.decode ( WAP_ENCODED_UINT8 );
  }
});

benchmark ({
  name: 'decodeStr',
  fn: () => {
    Hex.decode ( WAP_ENCODED );
  }
});

benchmark ({
  name: 'is',
  fn: () => {
    Hex.is ( WAP_ENCODED );
  }
});

benchmark.summary ();
