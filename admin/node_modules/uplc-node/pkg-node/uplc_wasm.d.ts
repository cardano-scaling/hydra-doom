/* tslint:disable */
/* eslint-disable */
/**
* @param {Uint8Array} tx_bytes
* @param {(Uint8Array)[]} utxos_refs_bytes
* @param {(Uint8Array)[]} utxos_outputs_bytes
* @param {Uint8Array} cost_mdls_bytes
* @param {bigint} cpu_budget
* @param {bigint} mem_budget
* @param {bigint} slot_config_zero_time
* @param {bigint} slot_config_zero_slot
* @param {number} slot_config_slot_length
* @returns {(Uint8Array)[]}
*/
export function eval_phase_two_raw(tx_bytes: Uint8Array, utxos_refs_bytes: (Uint8Array)[], utxos_outputs_bytes: (Uint8Array)[], cost_mdls_bytes: Uint8Array, cpu_budget: bigint, mem_budget: bigint, slot_config_zero_time: bigint, slot_config_zero_slot: bigint, slot_config_slot_length: number): (Uint8Array)[];
/**
* @param {Uint8Array} params_bytes
* @param {Uint8Array} plutus_script_bytes
* @returns {Uint8Array}
*/
export function apply_params_to_script(params_bytes: Uint8Array, plutus_script_bytes: Uint8Array): Uint8Array;
