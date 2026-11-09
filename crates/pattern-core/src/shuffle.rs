//! Versioned, portable permutations shared by seeded expressions and run-scoped shuffle steps.
use crate::value::Value;
use sha2::{Digest, Sha256};

/// Permute a copied list or choice catalogue without changing its values or element type.
pub(crate) fn apply(mut value: Value, seed: &[u8]) -> Result<Value, String> {
    match &mut value {
        Value::List { items, .. } => permute(items, seed),
        Value::Choices(items) => permute(items, seed),
        _ => return Err("shuffle expects a list or choices catalogue".into()),
    }
    Ok(value)
}

/// Use Fisher–Yates with rejection sampling; fixed-width hashes keep native and WASM identical.
fn permute<T>(items: &mut [T], seed: &[u8]) {
    let mut base = Sha256::new();
    base.update(b"pattern-shuffle-v1\0");
    base.update((seed.len() as u64).to_le_bytes());
    base.update(seed);
    let mut counter = 0u64;
    for end in (1..items.len()).rev() {
        let bound = (end + 1) as u64;
        let threshold = bound.wrapping_neg() % bound;
        let index = loop {
            let mut hash = base.clone();
            hash.update(counter.to_le_bytes());
            counter += 1;
            let bytes = hash.finalize();
            let sample = u64::from_le_bytes(bytes[..8].try_into().unwrap());
            if sample >= threshold {
                break (sample % bound) as usize;
            }
        };
        items.swap(end, index);
    }
}
