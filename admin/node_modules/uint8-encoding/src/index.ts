
/* HELPERS */

const encoder = new TextEncoder ();
const decoder = new TextDecoder ( 'utf-8', { ignoreBOM: true } );

/* MAIN */

const U8 = {

  /* API */

  encode: ( data: string ): Uint8Array => {

    return encoder.encode ( data );

  },

  decode: ( data: Uint8Array ): string => {

    return decoder.decode ( data );

  }

};

/* EXPORT */

export default U8;
