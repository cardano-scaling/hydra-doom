
/* IMPORT */

import {describe} from 'fava';
import BufferEncoding from '../dist/index.js';

/* MAIN */

describe ( 'BufferEncoding', it => {

  it ( 'encodes an Uint8Array with the given encoding', t => {

    const result = BufferEncoding.encode ( new Uint8Array ([ 0, 255 ]), 'hex' );

    t.is ( result, '00ff' );

  });

  it ( 'encodes a string with the given encoding', t => {

    const result = BufferEncoding.encodeStr ( 'hello', 'base64' );

    t.is ( result, 'aGVsbG8=' );

  });

  it ( 'decodes a string with the given encoding to an Uint8Array', t => {

    const result = BufferEncoding.decode ( '00ff', 'hex' );;

    t.deepEqual ( result, new Uint8Array ([ 0, 255 ]) );

  });

  it ( 'decodes a string with the given encoding to a string', t => {

    const result = BufferEncoding.decodeStr ( 'aGVsbG8=', 'base64' );

    t.is ( result, 'hello' );

  });

});
