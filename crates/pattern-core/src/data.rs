//! Bounded, immutable reference data. Hosts supply resources; this module never performs I/O.
use crate::value::{Type, Value};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReferenceType {
    pub library: String,
    pub revision: String,
    pub ids: Vec<String>,
}
impl ReferenceType {
    /// Check bounded resource identity and unique member IDs.
    pub fn valid(&self) -> bool {
        !self.library.is_empty()
            && self.library.len() <= 128
            && self.revision.starts_with("data-v1:")
            && self.revision.len() == 72
            && self.ids.len() <= 1000
            && self
                .ids
                .iter()
                .all(|id| !id.trim().is_empty() && id.len() <= 128)
            && self.ids.iter().collect::<BTreeSet<_>>().len() == self.ids.len()
    }
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CatalogType {
    pub reference: ReferenceType,
    pub record_type: Box<Type>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DataLibrary {
    pub record_type: Type,
    pub records: Vec<serde_json::Value>,
}
impl DataLibrary {
    /// Materialize declared JSON once, rejecting malformed records and ambiguous identities.
    ///
    /// # Errors
    /// Rejects oversized resources, invalid schemas and nonconforming records or IDs.
    pub fn materialize(&self, name: &str) -> Result<Value, String> {
        if self.records.len() > 1000
            || serde_json::to_vec(self).map_err(|e| e.to_string())?.len() > 1_048_576
        {
            return Err("Data library exceeds 1 MiB / 1000 records".into());
        }
        if !self.record_type.well_formed(0) {
            return Err("Invalid or excessively nested data schema".into());
        }
        let Type::Record(fields) = &self.record_type else {
            return Err("Data libraries require a record schema".into());
        };
        if fields.get("id") != Some(&Type::Text) {
            return Err("Data records require a text id field".into());
        }
        let records = self
            .records
            .iter()
            .map(|record| Value::from_json(record, &self.record_type))
            .collect::<Result<Vec<_>, _>>()?;
        let ids = records
            .iter()
            .map(|record| match record.field_path(&["id".into()]) {
                Some(Value::Text(id)) => Ok(id),
                _ => Err("Data records require a text id".to_string()),
            })
            .collect::<Result<Vec<_>, _>>()?;
        let reference = ReferenceType {
            library: name.into(),
            revision: format!(
                "data-v1:{:x}",
                Sha256::digest(
                    serde_json::to_vec(&(&self.record_type, &records)).map_err(|e| e.to_string())?
                )
            ),
            ids,
        };
        if !reference.valid() {
            return Err("Data record ids must be unique, nonblank and at most 128 bytes".into());
        }
        Ok(Value::Catalog {
            schema: CatalogType {
                reference,
                record_type: Box::new(self.record_type.clone()),
            },
            records,
        })
    }
}
impl Value {
    /// Strict conversion at the external JSON boundary; no coercion or extra record fields.
    ///
    /// # Errors
    /// Rejects invalid types, fields, references, nesting or values outside the schema.
    pub fn from_json(json: &serde_json::Value, ty: &Type) -> Result<Self, String> {
        /// Recursively check a JSON value within the bounded nesting budget.
        fn convert(json: &serde_json::Value, ty: &Type, depth: usize) -> Result<Value, String> {
            if depth > 16 {
                return Err("Structured value exceeds 16 nested levels".into());
            }
            let invalid = || format!("JSON value does not match {ty}");
            Ok(match ty {
                Type::Text => Value::Text(
                    json.as_str()
                        .filter(|s| s.len() <= 1_048_576)
                        .ok_or_else(invalid)?
                        .into(),
                ),
                Type::Number => Value::Number(
                    json.as_f64()
                        .filter(|n| n.is_finite())
                        .ok_or_else(invalid)?,
                ),
                Type::Boolean => Value::Boolean(json.as_bool().ok_or_else(invalid)?),
                Type::Enum(schema) => {
                    let variant = json.as_str().ok_or_else(invalid)?;
                    if !schema.variants.iter().any(|v| v == variant) {
                        return Err(invalid());
                    }
                    schema.value(variant)
                }
                Type::Reference(schema) => {
                    let id = json.as_str().ok_or_else(invalid)?;
                    if !schema.valid() || !schema.ids.iter().any(|v| v == id) {
                        return Err("Unknown reference id".into());
                    }
                    Value::Reference {
                        schema: schema.clone(),
                        id: id.into(),
                    }
                }
                Type::Optional(inner) => Value::Optional {
                    element_type: *inner.clone(),
                    value: if json.is_null() {
                        None
                    } else {
                        Some(Box::new(convert(json, inner, depth + 1)?))
                    },
                },
                Type::List(inner) => {
                    let items = json
                        .as_array()
                        .filter(|a| a.len() <= 10000)
                        .ok_or_else(invalid)?;
                    Value::List {
                        element_type: *inner.clone(),
                        items: items
                            .iter()
                            .map(|item| convert(item, inner, depth + 1))
                            .collect::<Result<_, _>>()?,
                    }
                }
                Type::Record(fields) => {
                    let record = json
                        .as_object()
                        .filter(|r| r.len() == fields.len())
                        .ok_or_else(invalid)?;
                    Value::Record(
                        fields
                            .iter()
                            .map(|(k, t)| {
                                Ok((
                                    k.clone(),
                                    convert(record.get(k).ok_or_else(invalid)?, t, depth + 1)?,
                                ))
                            })
                            .collect::<Result<BTreeMap<_, _>, String>>()?,
                    )
                }
                Type::Choice => {
                    Value::Choice(serde_json::from_value(json.clone()).map_err(|_| invalid())?)
                }
                Type::Choices => {
                    Value::Choices(serde_json::from_value(json.clone()).map_err(|_| invalid())?)
                }
                Type::Catalog(_) => {
                    return Err("Models cannot construct reference libraries".into())
                }
            })
        }
        let value = convert(json, ty, 0)?;
        if !value.is_valid() {
            return Err("Invalid structured value".into());
        }
        Ok(value)
    }
}

impl Value {
    /// Canonical plain JSON for structured model context and data resource reconstruction.
    pub fn to_json(&self) -> serde_json::Value {
        match self {
            Self::Text(value) => serde_json::json!(value),
            Self::Number(value) => serde_json::json!(value),
            Self::Boolean(value) => serde_json::json!(value),
            Self::Enum { variant, .. } => serde_json::json!(variant),
            Self::Reference { id, .. } => serde_json::json!(id),
            Self::Record(fields) => serde_json::Value::Object(
                fields
                    .iter()
                    .map(|(key, value)| (key.clone(), value.to_json()))
                    .collect(),
            ),
            Self::List { items, .. } => {
                serde_json::json!(items.iter().map(Value::to_json).collect::<Vec<_>>())
            }
            Self::Catalog { records, .. } => {
                serde_json::json!(records.iter().map(Value::to_json).collect::<Vec<_>>())
            }
            Self::Choice(value) => serde_json::json!(value),
            Self::Choices(values) => serde_json::json!(values),
            Self::Optional { value, .. } => value
                .as_ref()
                .map_or(serde_json::Value::Null, |v| v.to_json()),
        }
    }
}
