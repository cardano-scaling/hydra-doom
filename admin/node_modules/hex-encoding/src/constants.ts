
/* MAIN */

const DEC2HEX = (() => {

  const alphabet = '0123456789abcdef';
  const dec2hex16 = [...alphabet];
  const dec2hex256 = new Array<string> ( 256 );

  for ( let i = 0; i < 256; i++ ) {

    dec2hex256[i] = `${dec2hex16[(i >>> 4) & 0xF]}${dec2hex16[i & 0xF]}`;

  }

  return dec2hex256;

})();

const HEX2DEC = (() => {

  const hex2dec: Record<string, number> = {};

  for ( let i = 0; i < 256; i++ ) {

    const hex = DEC2HEX[i];
    const firstLower = hex[0];
    const firstUpper = firstLower.toUpperCase ();
    const lastLower = hex[1];
    const lastUpper = lastLower.toUpperCase ();

    hex2dec[hex] = i;
    hex2dec[`${firstLower}${lastUpper}`] = i;
    hex2dec[`${firstUpper}${lastLower}`] = i;
    hex2dec[`${firstUpper}${lastUpper}`] = i;

  }

  return hex2dec;

})();

/* EXPORT */

export {DEC2HEX, HEX2DEC};
