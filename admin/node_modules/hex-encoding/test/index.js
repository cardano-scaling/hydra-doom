
/* IMPORT */

import fc from 'fast-check';
import {describe} from 'fava';
import HexBrowser from '../dist/browser.js';
import HexNode from '../dist/node.js';
import Fixtures from './fixtures.js';

/* MAIN */

describe ( 'Hex', () => {

  for ( const [Hex, name] of [[HexBrowser, 'browser'], [HexNode, 'node']] ) {

    describe ( name, it => {

      it ( 'returns an actual Uint8Array', t => {

        t.is ( Hex.decode ( 'ff' ).constructor, Uint8Array );

      });

      it ( 'works with strings', t => {

        for ( const fixture of Fixtures ) {

          const encoded = Hex.encodeStr ( fixture );
          const decoded = Hex.decodeStr ( encoded );

          t.is ( decoded, fixture );

        }

      });

      it ( 'works with Uint8Arrays', t => {

        const encoder = new TextEncoder ();

        for ( const fixture of Fixtures ) {

          const fixtureU8 = encoder.encode ( fixture );

          const encoded = Hex.encode ( fixtureU8 );
          const decoded = Hex.decode ( encoded );

          t.deepEqual ( decoded, fixtureU8 );

        }

      });

      it ( 'works with fc-generated strings', t => {

        const assert = str => t.true ( !Hex.is ( str ) || ( Hex.decodeStr ( Hex.encodeStr ( str ) ) === str ) );
        const property = fc.property ( fc.fullUnicodeString (), assert );

        fc.assert ( property, { numRuns: 1000000 } );

      });

      it ( 'works like Buffer', t => {

        const assert = str => Hex.is ( str ) ? t.deepEqual ( Hex.encodeStr ( str ), Buffer.from ( str ).toString ( 'hex' ) ) : t.pass ();
        const property = fc.property ( fc.fullUnicodeString (), assert );

        fc.assert ( property, { numRuns: 1000000 } );

      });

      it ( 'can detect Hex-encoded strings', t => {

        const fixtures = [
          ['', true],
          ['a', false],
          ['A', false],
          ['ab', true],
          ['AB', true],
          ['abc', false],
          ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', false],
          ['0123456789abcdef', true],
          ['0123456789ABCDEF', true],
          ['0123456789ABCdef', true],
          ['\uffff\uffff\uffff\uffff', false],
          ['😃', false],
          ['👪', false]
        ];

        for ( const [fixture, result] of fixtures ) {

          t.is ( Hex.is ( fixture ), result );

        }

      });

    });

  }

});
