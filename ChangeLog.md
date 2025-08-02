# ChangeLog for hydra-doom

## 0.0.0.4

* Update to `doom-wasm-0.0.0.2`.
* Update to `hydra-control-plane-0.2.2`.
* Use always true validator.

## 0.0.0.3

* Fix new-game behaviour.
* Update to `hydra-control-plane-0.2.1`

## 0.0.0.2

* Support online hydra heads.

## 0.0.0.1

* Initial version of `hydra-doom`. Uses process-compose to run a collection of services providing a
  `doom-wasm` browser frontend connected to a `hydra-node`. Very tightly coupled to `hydra-control-plane`
  and to `cardano-scaling/doom-wasm`.
