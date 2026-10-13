//! Presentation-independent reasoning views. No layout, host I/O, or new expression evaluator.
use crate::{
    syntax::Span,
    value::{Type, Value},
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Order {
    pub attribute: String,
    pub descending: bool,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ShowSpec {
    pub source: String,
    pub map: Vec<String>,
    pub group: Option<String>,
    pub order: Option<Order>,
    pub link: Option<String>,
    pub split: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Representation {
    Collection,
    Ordered,
    Grouped,
    Axis,
    Cartesian,
    Tree,
    Network,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AxisKind {
    Numeric,
    Temporal,
    Ordinal,
    Categorical,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Axis {
    pub attribute: String,
    pub kind: AxisKind,
    pub min: f64,
    pub max: f64,
    pub levels: Vec<String>,
    pub low: String,
    pub high: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub label: String,
    pub fields: BTreeMap<String, String>,
    pub coordinates: Vec<f64>,
    pub group: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Edge {
    pub from: String,
    pub to: String,
    pub cyclic: bool,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Panel {
    pub label: Option<String>,
    pub representation: Representation,
    pub items: Vec<Item>,
    pub edges: Vec<Edge>,
    pub cyclic: bool,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ShowView {
    pub spec: ShowSpec,
    pub axes: Vec<Axis>,
    pub panels: Vec<Panel>,
    pub warnings: Vec<String>,
}
impl ShowView {
    /// Complete linear alternative, also used by terminal hosts and older clients.
    pub fn text(&self) -> String {
        let mut lines = vec![format!("Show {}", self.spec.source)];
        lines.extend(self.warnings.clone());
        for panel in &self.panels {
            if let Some(label) = &panel.label {
                lines.push(format!(
                    "{}: {label}",
                    self.spec.split.as_deref().unwrap_or("Context")
                ));
            }
            for item in &panel.items {
                lines.push(format!(
                    "{} — {}",
                    item.label,
                    item.fields
                        .iter()
                        .map(|(key, value)| format!("{key}: {value}"))
                        .collect::<Vec<_>>()
                        .join("; ")
                ));
            }
            for edge in &panel.edges {
                let label = |id: &str| {
                    panel
                        .items
                        .iter()
                        .find(|item| item.id == id)
                        .map_or(id.to_owned(), |item| item.label.clone())
                };
                lines.push(format!(
                    "{} → {}{}",
                    label(&edge.from),
                    label(&edge.to),
                    if edge.cyclic { " (cycle)" } else { "" }
                ));
            }
        }
        lines.join("\n")
    }
}

/// Attribute typo help, bounded by the already-bounded identifier lengths.
pub(crate) fn distance(a: &str, b: &str) -> usize {
    let mut row: Vec<_> = (0..=b.len()).collect();
    for (i, x) in a.bytes().enumerate() {
        let mut previous = row[0];
        row[0] = i + 1;
        for (j, y) in b.bytes().enumerate() {
            let old = row[j + 1];
            row[j + 1] = (row[j] + 1)
                .min(old + 1)
                .min(previous + usize::from(x != y));
            previous = old;
        }
    }
    row[b.len()]
}
/// Select a structural path, or the synthetic value field for scalar collection items.
fn field(value: &Value, path: &str) -> Option<Value> {
    if path == "value" && !matches!(value, Value::Record(_) | Value::Choice(_)) {
        return Some(value.clone());
    }
    value.field_path(&path.split('.').map(str::to_owned).collect::<Vec<_>>())
}
/// Preserve authored IDs/choice identities, using stable source indices otherwise.
fn identity(value: &Value, index: usize) -> String {
    match value {
        Value::Choice(choice) => choice.value.clone(),
        Value::Record(fields) => fields
            .get("id")
            .map(Value::display)
            .filter(|id| !id.is_empty())
            .unwrap_or_else(|| format!("item-{index}")),
        _ => format!("item-{index}"),
    }
}
/// Prefer conventional readable fields; otherwise retain the complete value description.
fn label(value: &Value) -> String {
    if let Value::Record(fields) = value {
        for key in ["name", "title", "label", "idea", "text", "id"] {
            if let Some(value) = fields.get(key) {
                return value.display();
            }
        }
    }
    value.display()
}
/// Produce a labelled alternative retaining every original field, including relationships.
fn fields(value: &Value) -> BTreeMap<String, String> {
    match value {
        Value::Record(values) => values
            .iter()
            .map(|(k, v)| (k.clone(), v.display()))
            .collect(),
        Value::Choice(choice) => BTreeMap::from([
            ("value".into(), choice.value.clone()),
            ("label".into(), choice.label.clone()),
        ]),
        _ => BTreeMap::from([("value".into(), value.display())]),
    }
}

/// Strict ISO date / date-time inference. Civil-day arithmetic is independent of locale and clock.
/// Dates are UTC midnight; date-times require Z or an explicit offset, avoiding local-time guesses.
fn temporal(text: &str) -> Option<f64> {
    let bytes = text.as_bytes();
    if bytes.len() < 10 || bytes[4] != b'-' || bytes[7] != b'-' || !text.is_ascii() {
        return None;
    }
    let number = |s: &str| {
        s.bytes()
            .all(|b| b.is_ascii_digit())
            .then(|| s.parse::<i64>().ok())
            .flatten()
    };
    let year = number(&text[..4])?;
    let month = number(&text[5..7])?;
    let day = number(&text[8..10])?;
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = match month {
        2 => {
            if leap {
                29
            } else {
                28
            }
        }
        4 | 6 | 9 | 11 => 30,
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        _ => return None,
    };
    if !(1..=days).contains(&day) {
        return None;
    }
    let y = year - i64::from(month <= 2);
    let era = y.div_euclid(400);
    let yo = y - era * 400;
    let m = month + if month > 2 { -3 } else { 9 };
    let civil = era * 146097 + yo * 365 + yo / 4 - yo / 100 + (153 * m + 2) / 5 + day - 1 - 719468;
    let mut seconds = (civil * 86400) as f64;
    if text.len() == 10 {
        return Some(seconds);
    }
    if bytes.len() < 20 || bytes[10] != b'T' || bytes[13] != b':' || bytes[16] != b':' {
        return None;
    }
    let hour = number(&text[11..13])?;
    let minute = number(&text[14..16])?;
    let second = number(&text[17..19])?;
    if hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    seconds += (hour * 3600 + minute * 60 + second) as f64;
    let mut suffix = &text[19..];
    if suffix.starts_with('.') {
        let end = suffix[1..].find(|c: char| !c.is_ascii_digit())? + 1;
        if end == 1 {
            return None;
        }
        seconds += suffix[..end].parse::<f64>().ok()?;
        suffix = &suffix[end..];
    }
    if suffix == "Z" {
        return Some(seconds);
    }
    let offset = suffix.as_bytes();
    if offset.len() != 6 || !matches!(offset[0], b'+' | b'-') || offset[3] != b':' {
        return None;
    }
    let oh = number(&suffix[1..3])?;
    let om = number(&suffix[4..6])?;
    if oh > 23 || om > 59 {
        return None;
    }
    Some(seconds - (oh * 3600 + om * 60) as f64 * if offset[0] == b'+' { 1. } else { -1. })
}

/// Infer a common domain from types and values, rejecting malformed numeric or temporal data.
fn axis(attribute: &str, values: &[Value], declared: Option<&Type>) -> Result<Axis, String> {
    let mut levels = vec![];
    let (kind, positions) = if matches!(declared, Some(Type::Number))
        || values.iter().any(|v| matches!(v, Value::Number(_)))
    {
        let numbers = values
            .iter()
            .map(|v| {
                if let Value::Number(n) = v {
                    n.is_finite().then_some(*n)
                } else {
                    None
                }
            })
            .collect::<Option<Vec<_>>>()
            .ok_or("incompatible numeric values")?;
        (AxisKind::Numeric, numbers)
    } else if let Some(Type::Enum(schema)) = declared {
        levels = schema.variants.clone();
        let positions = values
            .iter()
            .map(|v| {
                levels
                    .iter()
                    .position(|s| s == &v.display())
                    .map(|n| n as f64)
            })
            .collect::<Option<Vec<_>>>()
            .ok_or("invalid ordered enum value")?;
        (AxisKind::Ordinal, positions)
    } else {
        let texts: Vec<_> = values.iter().map(Value::display).collect();
        let dates: Vec<_> = texts.iter().map(|t| temporal(t)).collect();
        if dates.iter().any(Option::is_some)
            || texts.iter().any(|t| {
                t.len() >= 10
                    && t.as_bytes()[4] == b'-'
                    && t.as_bytes()[7] == b'-'
                    && t[..4].bytes().all(|b| b.is_ascii_digit())
            })
        {
            (
                AxisKind::Temporal,
                dates.into_iter().collect::<Option<Vec<_>>>().ok_or(
                    "malformed or mixed temporal values; use ISO dates or zoned ISO date-times",
                )?,
            )
        } else {
            for text in texts {
                if !levels.contains(&text) {
                    levels.push(text);
                }
            }
            (
                AxisKind::Categorical,
                values
                    .iter()
                    .map(|v| levels.iter().position(|s| s == &v.display()).unwrap() as f64)
                    .collect(),
            )
        }
    };
    let min = positions.iter().copied().reduce(f64::min).unwrap_or(0.);
    let max = if matches!(kind, AxisKind::Ordinal | AxisKind::Categorical) {
        levels.len().saturating_sub(1) as f64
    } else {
        positions.iter().copied().reduce(f64::max).unwrap_or(0.)
    };
    let bounds = |target: f64| {
        values
            .iter()
            .zip(&positions)
            .find(|(_, v)| **v == target)
            .map(|(v, _)| v.display())
            .unwrap_or_default()
    };
    Ok(Axis {
        attribute: attribute.into(),
        kind,
        min: if !levels.is_empty() { 0. } else { min },
        max,
        low: if !levels.is_empty() {
            levels.first().cloned().unwrap_or_default()
        } else {
            bounds(min)
        },
        high: if !levels.is_empty() {
            levels.last().cloned().unwrap_or_default()
        } else {
            bounds(max)
        },
        levels,
    })
}
/// Resolve a value against a previously checked common domain without host-specific coordinates.
fn coordinate(value: &Value, axis: &Axis) -> f64 {
    match axis.kind {
        AxisKind::Numeric => {
            if let Value::Number(n) = value {
                *n
            } else {
                0.
            }
        }
        AxisKind::Temporal => temporal(&value.display()).unwrap_or(0.),
        _ => axis
            .levels
            .iter()
            .position(|v| v == &value.display())
            .unwrap_or(0) as f64,
    }
}
/// Retain declared field types even when a collection is empty.
fn attribute_type(element: &Type, path: &str) -> Option<Type> {
    if path == "value" && !matches!(element, Type::Record(_) | Type::Choice) {
        return Some(element.clone());
    }
    let mut ty = element.clone();
    for part in path.split('.') {
        ty = match ty {
            Type::Record(fields) => fields.get(part)?.clone(),
            Type::Choice if matches!(part, "value" | "label") => Type::Text,
            _ => return None,
        };
    }
    Some(ty)
}
/// Normalize a typed relation into referenced IDs; empty text means no relation.
fn targets(value: &Value) -> Vec<String> {
    match value {
        Value::Text(text) => {
            if text.is_empty() {
                vec![]
            } else {
                vec![text.clone()]
            }
        }
        Value::Choice(choice) => vec![choice.value.clone()],
        Value::Choices(choices) => choices.iter().map(|c| c.value.clone()).collect(),
        Value::List { items, .. } => items.iter().flat_map(targets).collect(),
        _ => vec![],
    }
}
/// Detect return paths iteratively so cycles cannot exhaust the call stack.
fn reachable(start: &str, end: &str, edges: &[Edge]) -> bool {
    let mut queue = vec![start];
    let mut seen = BTreeSet::new();
    while let Some(node) = queue.pop() {
        if node == end {
            return true;
        }
        if seen.insert(node) {
            queue.extend(
                edges
                    .iter()
                    .filter(|e| e.from == node)
                    .map(|e| e.to.as_str()),
            );
        }
    }
    false
}

/// Resolve one typed snapshot. Data errors retain all items in a labelled fallback instead of stopping a practice.
pub fn resolve(spec: &ShowSpec, value: &Value, span: Span) -> ShowView {
    let (element, values) = match value {
        Value::List {
            element_type,
            items,
        } => (element_type.clone(), items.clone()),
        Value::Choices(choices) => (
            Type::Choice,
            choices.iter().cloned().map(Value::Choice).collect(),
        ),
        _ => (value.value_type(), vec![value.clone()]),
    };
    let mut view = ShowView {
        spec: spec.clone(),
        axes: vec![],
        panels: vec![],
        warnings: vec![],
    };
    let warning = |message: String| format!("!show (bytes {}–{}): {message}", span.start, span.end);
    for attribute in &spec.map {
        let data: Vec<_> = values
            .iter()
            .filter_map(|item| field(item, attribute))
            .collect();
        match axis(
            attribute,
            &data,
            attribute_type(&element, attribute).as_ref(),
        ) {
            Ok(axis) if data.len() == values.len() => view.axes.push(axis),
            result => {
                view.warnings.push(warning(format!(
                    "Cannot map '{attribute}': {}. Showing labelled items instead.",
                    result.err().unwrap_or_else(|| "missing values".into())
                )));
                view.axes.clear();
                break;
            }
        }
    }
    let mut indexed: Vec<_> = values.iter().enumerate().collect();
    if let Some(order) = &spec.order {
        let data: Vec<_> = values
            .iter()
            .filter_map(|item| field(item, &order.attribute))
            .collect();
        match axis(
            &order.attribute,
            &data,
            attribute_type(&element, &order.attribute).as_ref(),
        ) {
            Ok(axis) if data.len() == values.len() => indexed.sort_by(|(_, a), (_, b)| {
                let av = field(a, &order.attribute).unwrap();
                let bv = field(b, &order.attribute).unwrap();
                let cmp = if axis.kind == AxisKind::Categorical {
                    av.display().cmp(&bv.display())
                } else {
                    coordinate(&av, &axis).total_cmp(&coordinate(&bv, &axis))
                };
                if order.descending {
                    cmp.reverse()
                } else {
                    cmp
                }
            }),
            result => view.warnings.push(warning(format!(
                "Cannot order '{}': {}. Keeping source order.",
                order.attribute,
                result.err().unwrap_or_else(|| "missing values".into())
            ))),
        }
    }
    type Partition<'a> = (Option<String>, Vec<(usize, &'a Value)>);
    let mut partitions: Vec<Partition<'_>> = vec![];
    for (index, value) in indexed {
        let label = spec
            .split
            .as_ref()
            .and_then(|path| field(value, path))
            .map(|v| v.display());
        if let Some((_, items)) = partitions.iter_mut().find(|(key, _)| key == &label) {
            items.push((index, value));
        } else {
            partitions.push((label, vec![(index, value)]));
        }
    }
    if partitions.is_empty() {
        partitions.push((None, vec![]));
    }
    let all_ids: BTreeSet<_> = values
        .iter()
        .enumerate()
        .map(|(i, v)| identity(v, i))
        .collect();
    let duplicate_ids = all_ids.len() != values.len();
    if duplicate_ids && spec.link.is_some() {
        view.warnings.push(warning(
            "Relation identities are duplicated; use unique id fields. Showing a relation list."
                .into(),
        ));
    }
    for (label, partition) in partitions {
        let mut panel = Panel {
            label,
            representation: if view.axes.len() == 2 {
                Representation::Cartesian
            } else if view.axes.len() == 1 {
                Representation::Axis
            } else if spec.group.is_some() {
                Representation::Grouped
            } else if spec.order.is_some() {
                Representation::Ordered
            } else {
                Representation::Collection
            },
            items: vec![],
            edges: vec![],
            cyclic: false,
        };
        for (index, value) in &partition {
            panel.items.push(Item {
                id: identity(value, *index),
                label: self::label(value),
                fields: fields(value),
                coordinates: view
                    .axes
                    .iter()
                    .filter_map(|axis| field(value, &axis.attribute).map(|v| coordinate(&v, axis)))
                    .collect(),
                group: spec
                    .group
                    .as_ref()
                    .and_then(|path| field(value, path))
                    .map(|v| v.display()),
            });
        }
        if let Some(relation) = &spec.link {
            let local_ids: BTreeSet<_> = panel.items.iter().map(|i| i.id.clone()).collect();
            let mut unresolved = duplicate_ids;
            for (index, value) in &partition {
                for target in field(value, relation)
                    .as_ref()
                    .map(targets)
                    .unwrap_or_default()
                {
                    if !all_ids.contains(&target) {
                        view.warnings.push(warning(format!(
                            "Relation '{relation}' target '{target}' cannot be resolved."
                        )));
                        unresolved = true;
                        continue;
                    }
                    if !local_ids.contains(&target) {
                        view.warnings.push(warning(format!("Relation '{relation}' target '{target}' is outside this split; retained in the item fields.")));
                        continue;
                    }
                    let from = identity(value, *index);
                    let edge = if relation.rsplit('.').next() == Some("parent") {
                        Edge {
                            from: target,
                            to: from,
                            cyclic: false,
                        }
                    } else {
                        Edge {
                            from,
                            to: target,
                            cyclic: false,
                        }
                    };
                    if !panel.edges.contains(&edge) {
                        panel.edges.push(edge);
                    }
                }
            }
            if !unresolved && panel.items.len() <= 80 && panel.edges.len() <= 1000 {
                let cycles: Vec<_> = panel
                    .edges
                    .iter()
                    .map(|edge| reachable(&edge.to, &edge.from, &panel.edges))
                    .collect();
                for (edge, cyclic) in panel.edges.iter_mut().zip(cycles) {
                    edge.cyclic = cyclic;
                    panel.cyclic |= cyclic;
                }
                let mut degrees: BTreeMap<_, usize> = panel
                    .items
                    .iter()
                    .map(|item| (item.id.clone(), 0))
                    .collect();
                for edge in &panel.edges {
                    *degrees.get_mut(&edge.to).unwrap() += 1;
                }
                let tree =
                    !panel.cyclic && !panel.edges.is_empty() && degrees.values().all(|n| *n <= 1);
                if view.axes.is_empty() {
                    panel.representation = if tree {
                        Representation::Tree
                    } else {
                        Representation::Network
                    };
                }
            } else {
                panel.representation = if spec.group.is_some() {
                    Representation::Grouped
                } else if spec.order.is_some() {
                    Representation::Ordered
                } else {
                    Representation::Collection
                };
                if duplicate_ids {
                    panel.edges.clear();
                }
                view.warnings.push(warning("Relationships remain available below; this view uses a labelled list because identities or layout bounds are unsuitable.".into()));
            }
        }
        view.panels.push(panel);
    }
    view
}
