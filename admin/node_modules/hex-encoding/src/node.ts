
/* IMPORT */

import Buffer from 'node-buffer-encoding';
import is from './is';

/* MAIN */

const Node = {

  /* API */

  encode: ( data: Uint8Array ): string => {

    return Buffer.encode ( data, 'hex' );

  },

  encodeStr: ( data: string ): string => {

    return Buffer.encodeStr ( data, 'hex' );

  },

  decode: ( data: string ): Uint8Array => {

    return Buffer.decode ( data, 'hex' );

  },

  decodeStr: ( data: string ): string => {

    return Buffer.decodeStr ( data, 'hex' );

  },

  is

};

/* EXPORT */

export default Node;
