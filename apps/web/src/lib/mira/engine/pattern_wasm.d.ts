/* tslint:disable */
/* eslint-disable */

/**
 * Execute one versioned JSON request and return a JSON response or a stable error code.
 * The browser must encrypt and commit returned checkpoints before showing new effects.
 */
export function dispatch(request: string): string;

/**
 * Inspect and test unsaved source locally. No storage, network, or inference.
 */
export function editor(request: string): string;

/**
 * Run a bounded, ephemeral source preview through the same Rust compiler and runtime.
 *
 * # Errors
 * Returns source diagnostics or a runtime contract error; makes no model or storage calls.
 */
export function preview(source: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly dispatch: (a: number, b: number) => [number, number, number, number];
    readonly editor: (a: number, b: number) => [number, number, number, number];
    readonly preview: (a: number, b: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
