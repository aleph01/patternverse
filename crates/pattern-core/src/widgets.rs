//! Immutable local widget packages and host-independent contracts. Never executes code or performs I/O.
use crate::value::{Choice, Type, Value};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub type Packages = BTreeMap<String, Package>;
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub identity: String,
    pub manifest: Manifest,
    pub files: BTreeMap<String, String>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Manifest {
    pub schema_version: u32,
    pub publisher: String,
    pub name: String,
    pub version: String,
    pub host_api: u32,
    pub permissions: Vec<String>,
    pub exports: BTreeMap<String, Export>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Export {
    pub kind: String,
    pub path: String,
    #[serde(rename = "type", default, skip_serializing_if = "Option::is_none")]
    pub value_type: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Definition {
    pub schema_version: u32,
    pub name: String,
    pub entry: String,
    pub inputs: BTreeMap<String, Field>,
    pub outputs: BTreeMap<String, Field>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fallback: Option<Fallback>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Field {
    #[serde(rename = "type")]
    pub value_type: String,
    #[serde(
        default,
        deserialize_with = "present_default",
        skip_serializing_if = "Option::is_none"
    )]
    pub default: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_from: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub from: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub integer: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minimum: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maximum: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min_items: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_items: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_items_from: Option<String>,
    #[serde(rename = "enum", default, skip_serializing_if = "Option::is_none")]
    pub enumeration: Option<Vec<String>>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Fallback {
    pub kind: String,
    pub input: String,
    pub output: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Interaction {
    pub package: Package,
    pub export: String,
    pub definition: Definition,
    pub inputs: BTreeMap<String, Value>,
    pub presentation: BTreeMap<String, serde_json::Value>,
    pub prompt: String,
}
/// Convert a package validation message into its owned error text.
fn fail(message: impl Into<String>) -> String {
    message.into()
}
/// Check that an asset path is relative, bounded and contains only permitted segments.
pub fn safe_path(path: &str) -> bool {
    !path.is_empty()
        && path.len() <= 200
        && !path.starts_with('/')
        && !path.contains(['\\', ':', '?', '#'])
        && path.split('/').all(|s| {
            !s.is_empty()
                && s != "."
                && s != ".."
                && s.bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
        })
}
/// Recognize a bounded lowercase publisher or package-name segment.
pub(crate) fn segment(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 80
        && s.as_bytes()[0].is_ascii_lowercase()
        && s.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}
/// Recognize an exact three-component version without leading zeroes.
pub fn version(s: &str) -> bool {
    let parts: Vec<_> = s.split('.').collect();
    parts.len() == 3
        && parts.iter().all(|p| {
            !p.is_empty() && (p.len() == 1 || !p.starts_with('0')) && p.parse::<u32>().is_ok()
        })
}
impl Package {
    /// Return the publisher, package name and exact version used by imports.
    pub fn reference(&self) -> String {
        format!(
            "{}/{}@{}",
            self.manifest.publisher, self.manifest.name, self.manifest.version
        )
    }
    /// Hash the serialized immutable package, including its manifest and file bytes.
    pub fn revision(&self) -> String {
        format!(
            "widget-v1:{:x}",
            Sha256::digest(serde_json::to_vec(self).unwrap())
        )
    }
    /// Decode a named widget export using duplicate-key-safe JSON.
    ///
    /// # Errors
    /// Rejects missing exports or files and malformed or unsupported definition fields.
    pub fn definition(&self, name: &str) -> Result<Definition, String> {
        let export = self
            .manifest
            .exports
            .get(name)
            .filter(|e| e.kind == "widget")
            .ok_or("Unknown widget export")?;
        let text = self
            .files
            .get(&export.path)
            .ok_or("Missing widget definition")?;
        serde_json::from_value(strict_json(text)?)
            .map_err(|e| format!("Invalid widget definition: {e}"))
    }
    /// Resolve an existing package asset relative to its widget definition.
    ///
    /// # Errors
    /// Rejects unsafe paths, unknown exports and assets absent from the frozen package.
    pub fn asset_path(&self, export: &str, path: &str) -> Result<String, String> {
        if !safe_path(path) {
            return Err(fail("Invalid widget asset path"));
        }
        let definition = &self
            .manifest
            .exports
            .get(export)
            .ok_or("Unknown widget export")?
            .path;
        let parent = definition
            .rsplit_once('/')
            .map(|(p, _)| format!("{p}/"))
            .unwrap_or_default();
        let resolved = format!("{parent}{path}");
        if !self.files.contains_key(&resolved) {
            return Err(format!("Missing widget asset {resolved}"));
        }
        Ok(resolved)
    }
    /// Decode a typed data export and validate its optional catalogue presentation.
    ///
    /// # Errors
    /// Rejects missing or malformed data, invalid types and inconsistent catalogue metadata.
    pub fn data(&self, name: &str) -> Result<(Value, serde_json::Value), String> {
        let export = self
            .manifest
            .exports
            .get(name)
            .filter(|e| e.kind == "data")
            .ok_or("Unknown widget data export")?;
        let raw: serde_json::Value =
            strict_json(self.files.get(&export.path).ok_or("Missing data asset")?)?;
        let ty = crate::compiler::widget_type(
            export
                .value_type
                .as_deref()
                .ok_or("Data export requires type")?,
        )?;
        let (json, presentation) = if ty == Type::Choices {
            (
                raw.get("choices")
                    .ok_or("Catalogue requires choices")?
                    .clone(),
                raw.get("presentation")
                    .cloned()
                    .unwrap_or(serde_json::Value::Null),
            )
        } else {
            (raw, serde_json::Value::Null)
        };
        let value = Value::from_json(&json, &ty)?;
        if !value.is_valid() {
            return Err(fail("Invalid widget data"));
        }
        if let Value::Choices(choices) = &value {
            validate_presentation(&presentation, choices)?;
        }
        Ok((value, presentation))
    }
    /// Validate the package identity, resource limits, exports, contracts and defaults.
    ///
    /// # Errors
    /// Rejects incompatible manifests, unsafe assets and inconsistent data or widget contracts.
    pub fn validate(&self) -> Result<(), String> {
        let m = &self.manifest;
        if self.identity.trim().is_empty()
            || self.identity.len() > 160
            || m.schema_version != 1
            || m.host_api != 1
            || !m.permissions.is_empty()
            || !segment(&m.publisher)
            || !segment(&m.name)
            || !version(&m.version)
        {
            return Err(fail("Invalid or incompatible widget package identity"));
        }
        if self.files.is_empty()
            || self.files.len() > 64
            || serde_json::to_vec(self).map_err(|e| e.to_string())?.len() > 1_048_576
            || self.files.keys().any(|p| !safe_path(p))
            || m.exports.is_empty()
            || m.exports.len() > 32
        {
            return Err(fail("Widget package exceeds limits or has unsafe paths"));
        }
        for (name, export) in &m.exports {
            if !crate::syntax::is_identifier(name)
                || !safe_path(&export.path)
                || !self.files.contains_key(&export.path)
            {
                return Err(fail("Invalid widget export"));
            }
            match export.kind.as_str() {
                "data" => {
                    self.data(name)?;
                }
                "widget" => {
                    let d = self.definition(name)?;
                    if d.schema_version != 1
                        || d.name.trim().is_empty()
                        || d.outputs.is_empty()
                        || d.inputs.len() > 32
                        || d.outputs.len() > 32
                    {
                        return Err(fail("Invalid widget contract"));
                    }
                    self.asset_path(name, &d.entry)?;
                    for (key, f) in d.inputs.iter().chain(d.outputs.iter()) {
                        if !crate::syntax::is_identifier(key) {
                            return Err(fail("Invalid contract field name"));
                        }
                        f.validate()?;
                    }
                    for f in d.inputs.values() {
                        if let Some(source) = &f.default_from {
                            let (value, _) = self.data(source)?;
                            f.check(&value, &BTreeMap::new())?;
                        }
                        if f.from.is_some() || f.max_items_from.is_some() {
                            return Err(fail("Input constraints cannot depend on other inputs"));
                        }
                    }
                    for f in d.outputs.values() {
                        if f.default.is_some() || f.default_from.is_some() {
                            return Err(fail("Outputs cannot have defaults"));
                        }
                        if let Some(source) = &f.from {
                            if d.inputs
                                .get(source)
                                .is_none_or(|i| i.value_type != "choices")
                                || {
                                    let ty = crate::compiler::widget_type(&f.value_type)?;
                                    ty != Type::Choice && ty != Type::List(Box::new(Type::Choice))
                                }
                            {
                                return Err(fail("Choice membership requires a choices input"));
                            }
                        }
                        if let Some(source) = &f.max_items_from {
                            if d.inputs.get(source).is_none_or(|i| {
                                i.value_type != "number"
                                    || i.integer != Some(true)
                                    || i.minimum.is_none_or(|n| n < 0.)
                            }) {
                                return Err(fail(
                                    "Dynamic maximum requires a nonnegative integer input",
                                ));
                            }
                        }
                    }
                    if let Some(f) = &d.fallback {
                        if f.kind != "multi-choice"
                            || d.outputs.len() != 1
                            || d.inputs
                                .get(&f.input)
                                .is_none_or(|i| i.value_type != "choices")
                            || d.outputs.get(&f.output).is_none_or(|o| {
                                crate::compiler::widget_type(&o.value_type).ok()
                                    != Some(Type::List(Box::new(Type::Choice)))
                                    || o.from.as_ref() != Some(&f.input)
                            })
                        {
                            return Err(fail("Incompatible widget fallback"));
                        }
                    }
                    let defaults = d
                        .inputs
                        .iter()
                        .map(|(key, field)| self.default_value(field).map(|v| (key.clone(), v)))
                        .collect::<Result<Vec<_>, _>>();
                    if let Ok(values) = defaults {
                        let values: BTreeMap<_, _> = values.into_iter().collect();
                        validate_fields(&d.inputs, &values, &values)?;
                    }
                }
                _ => return Err(fail("Unsupported package export")),
            }
        }
        Ok(())
    }
    /// Resolve an input default from a typed package export or an authored literal.
    ///
    /// # Errors
    /// Rejects missing defaults, invalid data exports and literals that do not match the field type.
    pub fn default_value(&self, f: &Field) -> Result<Value, String> {
        if let Some(export) = &f.default_from {
            return self.data(export).map(|(v, _)| v);
        }
        let raw = f.default.as_ref().ok_or("Missing required widget input")?;
        Value::from_json(raw, &crate::compiler::widget_type(&f.value_type)?)
    }
}
impl Field {
    /// Validate the field type, bounds, default and compatible constraint combinations.
    ///
    /// # Errors
    /// Rejects malformed types, conflicting constraints and defaults outside the declared contract.
    pub fn validate(&self) -> Result<(), String> {
        let ty = crate::compiler::widget_type(&self.value_type)?;
        if self.default.is_some() && self.default_from.is_some()
            || self.max_items.is_some() && self.max_items_from.is_some()
        {
            return Err(fail("Conflicting widget constraints"));
        }
        if self.minimum.is_some_and(|v| !v.is_finite())
            || self.maximum.is_some_and(|v| !v.is_finite())
            || matches!((self.minimum,self.maximum),(Some(a),Some(b))if a>b)
            || matches!((self.min_items,self.max_items),(Some(a),Some(b))if a>b)
        {
            return Err(fail("Invalid widget bounds"));
        }
        if (self.minimum.is_some() || self.maximum.is_some() || self.integer.is_some())
            && ty != Type::Number
        {
            return Err(fail("Numeric constraints require number"));
        }
        if (self.min_items.is_some() || self.max_items.is_some() || self.max_items_from.is_some())
            && !matches!(ty, Type::List(_))
        {
            return Err(fail("Item bounds require list"));
        }
        if let Some(values) = &self.enumeration {
            if ty != Type::Text
                || values.is_empty()
                || values.len() > 32
                || values.iter().collect::<BTreeSet<_>>().len() != values.len()
            {
                return Err(fail("Invalid text enumeration"));
            }
        }
        if let Some(raw) = &self.default {
            let v = Value::from_json(raw, &ty)?;
            self.check(&v, &BTreeMap::new())?;
        }
        Ok(())
    }
    /// Validate a field value and normalize selected choices to their canonical catalogue records.
    ///
    /// # Errors
    /// Rejects type mismatches, invalid bounds, unsupported choices and missing dynamic constraints.
    pub fn check(&self, v: &Value, inputs: &BTreeMap<String, Value>) -> Result<Value, String> {
        let ty = crate::compiler::widget_type(&self.value_type)?;
        if !v.is_valid() || v.value_type() != ty {
            return Err(fail("Widget value does not match its declared type"));
        }
        if let Value::Number(n) = v {
            if self.integer == Some(true) && n.fract() != 0.
                || self.minimum.is_some_and(|m| *n < m)
                || self.maximum.is_some_and(|m| *n > m)
            {
                return Err(fail("Widget number is outside its bounds"));
            }
        }
        if let Some(values) = &self.enumeration {
            if !matches!(v,Value::Text(t)if values.contains(t)) {
                return Err(fail("Unsupported widget text value"));
            }
        }
        let mut result = v.clone();
        if let Some(source) = &self.from {
            let Value::Choices(offered) = inputs.get(source).ok_or("Missing choice catalogue")?
            else {
                return Err(fail("Invalid choice catalogue"));
            };
            let chosen: Vec<&Choice> = match v {
                Value::Choice(c) => vec![c],
                Value::List { items, .. } => items
                    .iter()
                    .map(|v| {
                        if let Value::Choice(c) = v {
                            Ok(c)
                        } else {
                            Err(fail("Expected choices"))
                        }
                    })
                    .collect::<Result<_, _>>()?,
                _ => return Err(fail("Expected choice output")),
            };
            let keys = chosen.iter().map(|c| c.value.clone()).collect::<Vec<_>>();
            let indices =
                crate::runtime::selection::choice_indices(offered, &keys, 0..=offered.len())
                    .map_err(|e| e.to_string())?;
            let normalized: Vec<_> = offered
                .iter()
                .enumerate()
                .filter(|(i, _)| indices.contains(i))
                .map(|(_, c)| c.clone())
                .collect();
            result = if ty == Type::Choice {
                Value::Choice(normalized[0].clone())
            } else {
                Value::List {
                    element_type: Type::Choice,
                    items: normalized.into_iter().map(Value::Choice).collect(),
                }
            };
        }
        if let Value::List { items, .. } = &result {
            let mut max = self.max_items.unwrap_or(1000);
            if let Some(key) = &self.max_items_from {
                let Some(Value::Number(n)) = inputs.get(key) else {
                    return Err(fail("Missing item maximum"));
                };
                if *n < 0. || n.fract() != 0. || *n > 1000. {
                    return Err(fail("Invalid item maximum"));
                }
                max = *n as usize;
            }
            if let Some(key) = &self.from {
                if let Some(Value::Choices(options)) = inputs.get(key) {
                    max = max.min(options.len());
                }
            }
            if items.len() < self.min_items.unwrap_or(0) || items.len() > max {
                return Err(fail("Widget selection is outside its bounds"));
            }
        }
        Ok(result)
    }
}
/// Validate a closed widget record and return its normalized field values.
///
/// # Errors
/// Rejects missing or extra fields and any value that violates its field contract.
pub fn validate_fields(
    fields: &BTreeMap<String, Field>,
    values: &BTreeMap<String, Value>,
    inputs: &BTreeMap<String, Value>,
) -> Result<BTreeMap<String, Value>, String> {
    if fields.keys().ne(values.keys()) {
        return Err(fail("Widget record has missing or extra fields"));
    }
    fields
        .iter()
        .map(|(key, f)| {
            f.check(&values[key], inputs)
                .map(|v| (key.clone(), v))
                .map_err(|message| format!("{key}: {message}"))
        })
        .collect()
}
impl Interaction {
    /// Decode and validate a proposed answer against this frozen interaction.
    ///
    /// # Errors
    /// Rejects malformed records, invalid output types and values outside the frozen input constraints.
    pub fn accept_json(&self, json: &serde_json::Value) -> Result<Value, String> {
        let Type::Record(types) = self.output_type()? else {
            unreachable!()
        };
        let Value::Record(values) = Value::from_json(json, &Type::Record(types))? else {
            unreachable!()
        };
        Ok(Value::Record(validate_fields(
            &self.definition.outputs,
            &values,
            &self.inputs,
        )?))
    }
    /// Construct the closed record type declared by this interaction’s output fields.
    ///
    /// # Errors
    /// Rejects any output field whose declared type cannot be parsed.
    pub fn output_type(&self) -> Result<Type, String> {
        Ok(Type::Record(
            self.definition
                .outputs
                .iter()
                .map(|(k, f)| crate::compiler::widget_type(&f.value_type).map(|t| (k.clone(), t)))
                .collect::<Result<_, _>>()?,
        ))
    }
}

/// Freeze defaults and invocation inputs before opening one interaction.
///
/// # Errors
/// Rejects invalid packages, unknown or missing inputs and unsatisfiable output constraints.
pub fn prepare(
    package: Package,
    export: &str,
    mut inputs: BTreeMap<String, Value>,
    prompt: String,
) -> Result<Interaction, String> {
    package.validate()?;
    let definition = package.definition(export)?;
    let mut presentation = BTreeMap::new();
    if inputs
        .keys()
        .any(|key| !definition.inputs.contains_key(key))
    {
        return Err(fail("Unknown widget input"));
    }
    for (key, field) in &definition.inputs {
        if !inputs.contains_key(key) {
            inputs.insert(key.clone(), package.default_value(field)?);
        }
        if let Some(data) = &field.default_from {
            let (default, sidecar) = package.data(data)?;
            if inputs.get(key) == Some(&default) {
                presentation.insert(key.clone(), sidecar);
            }
        }
    }
    let inputs = validate_fields(&definition.inputs, &inputs, &inputs)?;
    for field in definition.outputs.values() {
        if let Some(source) = &field.from {
            let Some(Value::Choices(options)) = inputs.get(source) else {
                return Err(fail("Invalid choices input"));
            };
            let max = field
                .max_items_from
                .as_ref()
                .and_then(|k| inputs.get(k))
                .and_then(|v| {
                    if let Value::Number(n) = v {
                        Some(*n as usize)
                    } else {
                        None
                    }
                })
                .or(field.max_items)
                .unwrap_or(1000)
                .min(options.len());
            if field.min_items.unwrap_or(0) > max {
                return Err(fail("Unsatisfiable widget selection"));
            }
        }
    }
    Ok(Interaction {
        package,
        export: export.into(),
        definition,
        inputs,
        presentation,
        prompt,
    })
}

/// Preserve an explicitly authored null default separately from an absent default.
fn present_default<'de, D: serde::Deserializer<'de>>(
    d: D,
) -> Result<Option<serde_json::Value>, D::Error> {
    Ok(Some(serde_json::Value::deserialize(d)?))
}
/// Reject duplicate keys recursively in authored JSON files before typed decoding.
fn strict_json(source: &str) -> Result<serde_json::Value, String> {
    struct Strict(serde_json::Value);
    impl<'de> Deserialize<'de> for Strict {
        /// Decode JSON recursively through the visitor that rejects duplicate object keys.
        fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
            struct Visitor;
            impl<'de> serde::de::Visitor<'de> for Visitor {
                type Value = Strict;
                /// Describe the accepted JSON shape when deserialization reports an error.
                fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                    f.write_str("JSON with unique keys")
                }
                /// Preserve a JSON boolean without coercion.
                fn visit_bool<E: serde::de::Error>(self, v: bool) -> Result<Strict, E> {
                    Ok(Strict(v.into()))
                }
                /// Preserve a signed JSON integer.
                fn visit_i64<E: serde::de::Error>(self, v: i64) -> Result<Strict, E> {
                    Ok(Strict(v.into()))
                }
                /// Preserve an unsigned JSON integer.
                fn visit_u64<E: serde::de::Error>(self, v: u64) -> Result<Strict, E> {
                    Ok(Strict(v.into()))
                }
                /// Accept a finite JSON number and reject values JSON cannot represent.
                fn visit_f64<E: serde::de::Error>(self, v: f64) -> Result<Strict, E> {
                    serde_json::Number::from_f64(v)
                        .map(|n| Strict(n.into()))
                        .ok_or_else(|| E::custom("Invalid number"))
                }
                /// Copy a borrowed JSON string into the validated value.
                fn visit_str<E: serde::de::Error>(self, v: &str) -> Result<Strict, E> {
                    Ok(Strict(v.into()))
                }
                /// Retain an owned JSON string in the validated value.
                fn visit_string<E: serde::de::Error>(self, v: String) -> Result<Strict, E> {
                    Ok(Strict(v.into()))
                }
                /// Represent a JSON null value explicitly.
                fn visit_unit<E: serde::de::Error>(self) -> Result<Strict, E> {
                    Ok(Strict(serde_json::Value::Null))
                }
                /// Represent an absent optional visitor value as JSON null.
                fn visit_none<E: serde::de::Error>(self) -> Result<Strict, E> {
                    self.visit_unit()
                }
                /// Decode each array element through the same recursive validation.
                fn visit_seq<A: serde::de::SeqAccess<'de>>(
                    self,
                    mut a: A,
                ) -> Result<Strict, A::Error> {
                    let mut rows = vec![];
                    while let Some(Strict(v)) = a.next_element()? {
                        rows.push(v);
                    }
                    Ok(Strict(rows.into()))
                }
                /// Decode object values recursively and reject a repeated key at any depth.
                fn visit_map<A: serde::de::MapAccess<'de>>(
                    self,
                    mut a: A,
                ) -> Result<Strict, A::Error> {
                    let mut map = serde_json::Map::new();
                    while let Some((k, Strict(v))) = a.next_entry::<String, Strict>()? {
                        if map.insert(k, v).is_some() {
                            return Err(serde::de::Error::custom("Duplicate JSON key"));
                        }
                    }
                    Ok(Strict(map.into()))
                }
            }
            d.deserialize_any(Visitor)
        }
    }
    serde_json::from_str::<Strict>(source)
        .map(|v| v.0)
        .map_err(|e| e.to_string())
}

/// Version-one catalogue metadata is separate from semantic choice values.
/// Validate all edges before any interface code receives the sidecar.
fn validate_presentation(raw: &serde_json::Value, choices: &[Choice]) -> Result<(), String> {
    #[derive(Deserialize, Default)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Presentation {
        #[serde(default)]
        groups: Vec<Group>,
        #[serde(default)]
        memberships: BTreeMap<String, Vec<String>>,
        #[serde(default)]
        items: BTreeMap<String, Item>,
        #[serde(default)]
        starter_ids_by_area: BTreeMap<String, Vec<String>>,
        #[serde(default)]
        attribution: String,
    }
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Group {
        id: String,
        label: String,
        #[serde(default)]
        parent_ids: Vec<String>,
    }
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Item {
        #[serde(default)]
        description: String,
        #[serde(default)]
        aliases: Vec<String>,
        #[serde(default)]
        recognition_cues: Vec<String>,
    }
    if raw.is_null() {
        return Ok(());
    }
    let p: Presentation = serde_json::from_value(raw.clone())
        .map_err(|e| format!("Invalid catalogue presentation: {e}"))?;
    let ids: BTreeSet<_> = choices.iter().map(|c| c.value.as_str()).collect();
    let groups: BTreeMap<_, _> = p.groups.iter().map(|g| (g.id.as_str(), g)).collect();
    if groups.len() != p.groups.len() || groups.len() > 256 || p.attribution.len() > 4000 {
        return Err(fail("Invalid catalogue groups or attribution"));
    }
    for g in &p.groups {
        if g.id.is_empty()
            || g.id.len() > 160
            || g.label.trim().is_empty()
            || g.label.len() > 300
            || g.parent_ids.iter().collect::<BTreeSet<_>>().len() != g.parent_ids.len()
            || g.parent_ids
                .iter()
                .any(|id| !groups.contains_key(id.as_str()))
        {
            return Err(fail("Invalid catalogue group parent"));
        }
        let mut pending = g.parent_ids.clone();
        let mut visited = BTreeSet::new();
        while let Some(id) = pending.pop() {
            if id == g.id {
                return Err(fail("Catalogue hierarchy contains a cycle"));
            }
            if visited.insert(id.clone()) {
                pending.extend(groups[id.as_str()].parent_ids.clone());
            }
        }
    }
    for (id, membership) in &p.memberships {
        if !ids.contains(id.as_str())
            || membership.iter().collect::<BTreeSet<_>>().len() != membership.len()
            || membership
                .iter()
                .any(|id| !groups.contains_key(id.as_str()))
        {
            return Err(fail("Invalid catalogue membership"));
        }
    }
    for (id, item) in &p.items {
        if !ids.contains(id.as_str())
            || item.description.len() > 4000
            || item.aliases.len() > 64
            || item.recognition_cues.len() > 64
            || item
                .aliases
                .iter()
                .chain(&item.recognition_cues)
                .any(|s| s.len() > 2000)
        {
            return Err(fail("Invalid catalogue item metadata"));
        }
    }
    for (area, shortlist) in &p.starter_ids_by_area {
        if groups
            .get(area.as_str())
            .is_none_or(|g| !g.parent_ids.is_empty())
            || shortlist.iter().collect::<BTreeSet<_>>().len() != shortlist.len()
        {
            return Err(fail("Invalid catalogue starting area"));
        }
        for id in shortlist {
            if !ids.contains(id.as_str()) {
                return Err(fail("Unknown catalogue starting choice"));
            }
            let mut pending = p.memberships.get(id).cloned().unwrap_or_default();
            let mut found = false;
            let mut seen = BTreeSet::new();
            while let Some(group) = pending.pop() {
                if group == *area {
                    found = true;
                    break;
                }
                if seen.insert(group.clone()) {
                    pending.extend(groups[group.as_str()].parent_ids.clone());
                }
            }
            if !found {
                return Err(fail("Starting choice is outside its area"));
            }
        }
    }
    Ok(())
}
