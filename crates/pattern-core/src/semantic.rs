//! Closed semantic-AI contracts, distinct from participant decisions and generic generation.
use crate::value::{EnumType, Type, Value};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Classifier {
    pub name: String,
    pub output: EnumType,
    pub rules: BTreeMap<String, String>,
    pub fallback: String,
    pub context: BTreeMap<String, Type>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionMode {
    Select,
    Filter,
    Rank,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionOutcome {
    Decided,
    Uncertain,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Candidate {
    pub id: String,
    pub value: Value,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Suggestion {
    pub outcome: SuggestionOutcome,
    pub ids: Vec<String>,
}

/// Describe an AI suggestion's explicit uncertainty without conflating it with transport failure.
pub fn outcome_type() -> EnumType {
    EnumType {
        name: "SemanticOutcome".into(),
        variants: vec!["decided".into(), "uncertain".into()],
    }
}
/// Keep selected values typed even when the model explicitly cannot make a suggestion.
pub fn suggestion_type(element: Type) -> Type {
    Type::Record(BTreeMap::from([
        ("outcome".into(), Type::Enum(outcome_type())),
        ("items".into(), Type::List(Box::new(element))),
    ]))
}
