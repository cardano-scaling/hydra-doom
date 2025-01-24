
/* MAIN */

const is = ( data: string ): boolean => {

  if ( data.length % 2 ) return false;

  if ( !/^[a-fA-F0-9]*$/.test ( data ) ) return false;

  return true;

};

/* EXPORT */

export default is;
