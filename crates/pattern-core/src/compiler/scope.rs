//! Lexical values plus immutable language context shared by fresh iteration scopes.
use super::*;
use std::{
    ops::{Deref, DerefMut},
    sync::Arc,
};

#[derive(Clone, Debug)]
pub(super) struct Scope {
    values: BTreeMap<String, Symbol>,
    pub language: u32,
    pub functions: Arc<expression::functional::Functions>,
    pub enums: Arc<BTreeMap<String, crate::value::EnumType>>,
    pub classifiers: Arc<BTreeMap<String, crate::semantic::Classifier>>,
}
impl Default for Scope {
    /// Preserve version-one behavior for legacy and lowering-only scopes.
    fn default() -> Self {
        Self {
            values: BTreeMap::new(),
            language: 1,
            functions: Arc::default(),
            enums: Arc::default(),
            classifiers: Arc::default(),
        }
    }
}
impl Deref for Scope {
    type Target = BTreeMap<String, Symbol>;
    /// Expose lexical values without mixing helper names into binding slots.
    fn deref(&self) -> &Self::Target {
        &self.values
    }
}
impl DerefMut for Scope {
    /// Declare values while retaining immutable language context.
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.values
    }
}
impl IntoIterator for Scope {
    type Item = (String, Symbol);
    type IntoIter = std::collections::btree_map::IntoIter<String, Symbol>;
    /// Consume value symbols during lowering and local-slot allocation.
    fn into_iter(self) -> Self::IntoIter {
        self.values.into_iter()
    }
}
impl<'a> IntoIterator for &'a Scope {
    type Item = (&'a String, &'a Symbol);
    type IntoIter = std::collections::btree_map::Iter<'a, String, Symbol>;
    /// Iterate lexical values without consuming the language context.
    fn into_iter(self) -> Self::IntoIter {
        self.values.iter()
    }
}
impl FromIterator<(String, Symbol)> for Scope {
    /// Collect lowering-only locals; validation scopes preserve their parent context instead.
    fn from_iter<T: IntoIterator<Item = (String, Symbol)>>(iter: T) -> Self {
        Self {
            values: iter.into_iter().collect(),
            ..Self::default()
        }
    }
}
impl Scope {
    /// Restrict visible values at a control-flow join without dropping pure helper definitions.
    pub fn visible(&self, names: &BTreeSet<String>) -> Self {
        Self {
            values: self
                .values
                .iter()
                .filter(|(name, _)| names.contains(*name))
                .map(|(n, s)| (n.clone(), s.clone()))
                .collect(),
            ..self.clone()
        }
    }
}
