# is-cid <!-- omit in toc -->

> Utils to properly validate CIDs to remove false-positives. This package works with both CJS and ESM.

## Example

```TypeScript
import * as CidValidator from '@biglup/is-cid';

CidValidator.validate('QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o') // true (CIDv0)
CidValidator.validate('bafybeiasb5vpmaounyilfuxbd3lryvosl4yefqrfahsb2esg46q6tu6y5q') // true (CIDv1 in Base32)
CidValidator.validate('zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7') // true (CIDv1 in Base58btc)
CidValidator.validate('xxxxx') // false
```

# Install

```console
$ npm i @biglup/is-cid
```

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
