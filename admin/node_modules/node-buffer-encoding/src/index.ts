
/* IMPORT */

import {Buffer} from 'node:buffer';
import type {Encoding} from './types';

/* MAIN */

const BufferEncoding = {

  /* API */

  encode: ( data: Uint8Array, encoding: Encoding ): string => {

    return Buffer.from ( data ).toString ( encoding );

  },

  encodeStr: ( data: string, encoding: Encoding ): string => {

    return Buffer.from ( data ).toString ( encoding );

  },

  decode: ( data: string, encoding: Encoding ): Uint8Array => {

    const buffer = Buffer.from ( data, encoding );

    return new Uint8Array ( buffer.buffer, buffer.byteOffset, buffer.byteLength );

  },

  decodeStr: ( data: string, encoding: Encoding ): string => {

    return Buffer.from ( data, encoding ).toString ();

  }

};

/* EXPORT */

export default BufferEncoding;
export type {Encoding};
