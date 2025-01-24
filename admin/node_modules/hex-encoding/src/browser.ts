
/* IMPORT */

import U8 from 'uint8-encoding';
import {DEC2HEX, HEX2DEC} from './constants';
import is from './is';

/* MAIN */

const Browser = {

  /* API */

  encode: ( data: Uint8Array ): string => {

    let hex = '';

    for ( let i = 0, l = data.length; i < l; i++ ) {

      hex += DEC2HEX[data[i]];

    }

    return hex;

  },

  encodeStr: ( data: string ): string => {

    return Browser.encode ( U8.encode ( data ) );

  },

  decode: ( data: string ): Uint8Array => {

    const length = data.length / 2;
    const u8 = new Uint8Array ( length );

    for ( let i = 0; i < length; i++ ) {

      u8[i] = HEX2DEC[data.slice ( i * 2, ( i * 2 ) + 2 )];

    }

    return u8;

  },

  decodeStr: ( data: string ): string => {

    return U8.decode ( Browser.decode ( data ) );

  },

  is

};

/* EXPORT */

export default Browser;
