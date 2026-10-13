//! Atomic grouped questions reuse the existing templates, record types and timer contracts.
use super::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Form<P> {
    pub title: Option<String>,
    pub blocks: Vec<FormBlock<P>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum FormBlock<P> {
    Show {
        content: P,
    },
    Ask {
        id: String,
        prompt: P,
        required: bool,
        multiline: bool,
        placeholder: Option<String>,
    },
    Timer {
        id: String,
        prompt: P,
        timer: Timer,
        persistent: bool,
    },
}

impl<P> Form<P> {
    /// Transform templates while preserving field contracts and authored ordering.
    pub(crate) fn map<Q>(self, mut map: impl FnMut(P) -> Q) -> Form<Q> {
        Form {
            title: self.title,
            blocks: self
                .blocks
                .into_iter()
                .map(|block| match block {
                    FormBlock::Show { content } => FormBlock::Show {
                        content: map(content),
                    },
                    FormBlock::Ask {
                        id,
                        prompt,
                        required,
                        multiline,
                        placeholder,
                    } => FormBlock::Ask {
                        id,
                        prompt: map(prompt),
                        required,
                        multiline,
                        placeholder,
                    },
                    FormBlock::Timer {
                        id,
                        prompt,
                        timer,
                        persistent,
                    } => FormBlock::Timer {
                        id,
                        prompt: map(prompt),
                        timer,
                        persistent,
                    },
                })
                .collect(),
        }
    }

    /// Render templates with the same fallible evaluator used by standalone interactions.
    pub(crate) fn try_map<Q, E>(
        self,
        mut map: impl FnMut(P) -> Result<Q, E>,
    ) -> Result<Form<Q>, E> {
        Ok(Form {
            title: self.title,
            blocks: self
                .blocks
                .into_iter()
                .map(|block| {
                    Ok(match block {
                        FormBlock::Show { content } => FormBlock::Show {
                            content: map(content)?,
                        },
                        FormBlock::Ask {
                            id,
                            prompt,
                            required,
                            multiline,
                            placeholder,
                        } => FormBlock::Ask {
                            id,
                            prompt: map(prompt)?,
                            required,
                            multiline,
                            placeholder,
                        },
                        FormBlock::Timer {
                            id,
                            prompt,
                            timer,
                            persistent,
                        } => FormBlock::Timer {
                            id,
                            prompt: map(prompt)?,
                            timer,
                            persistent,
                        },
                    })
                })
                .collect::<Result<_, E>>()?,
        })
    }
}

/// Read an optional boolean without accepting quoted or truthy values.
fn boolean(attrs: &BTreeMap<&str, &Attribute>, key: &str, default: bool) -> Check<bool> {
    let Some(attr) = attrs.get(key) else {
        return Ok(default);
    };
    let word = &arity(attr, 1)?[0];
    match (word.quoted, word.text.as_str()) {
        (false, "true") => Ok(true),
        (false, "false") => Ok(false),
        _ => Err(err("Expected true or false", word.span.clone())),
    }
}

/// Validate ordered fields and declare one record binding only after the whole form checks.
pub(super) fn check(b: &Block, symbols: &mut Scope) -> Check<CheckedStep> {
    let attrs = attributes(b, &["title"])?;
    if b.argument.is_some() || b.body.iter().any(|line| !line.text.trim().is_empty()) {
        return Err(err(
            "!form contains only !show, !ask and !timer blocks",
            b.span.clone(),
        ));
    }
    let title = attrs
        .get("title")
        .map(|attr| quoted(&arity(attr, 1)?[0]))
        .transpose()?;
    let binding = required_binding(b)?;
    let mut fields = BTreeMap::new();
    let mut blocks = vec![];
    if b.statements.is_empty() || b.statements.len() > 256 {
        return Err(err("!form requires 1 through 256 blocks", b.span.clone()));
    }
    for statement in &b.statements {
        let Statement::Block(child) = statement else {
            return Err(err(
                "!form cannot contain control flow or assignments",
                statement.span(),
            ));
        };
        // No hidden AI calls or intra-form dependencies: the whole record commits together.
        if !child.statements.is_empty() || child.argument.is_some() {
            return Err(err(
                "Form fields cannot contain nested effects",
                child.span.clone(),
            ));
        }
        let prompt = check_template(child, symbols)?;
        let (block, field) = match child.kind.as_str() {
            "show" => {
                attributes(child, &[])?;
                if child.binding.is_some() {
                    return Err(err("!show has no binding", child.span.clone()));
                }
                (FormBlock::Show { content: prompt }, None)
            }
            "ask" => {
                let attrs = attributes(child, &["required", "multiline", "placeholder"])?;
                let id = required_binding(child)?;
                let placeholder = attrs
                    .get("placeholder")
                    .map(|attr| quoted(&arity(attr, 1)?[0]))
                    .transpose()?;
                (
                    FormBlock::Ask {
                        id: id.clone(),
                        prompt,
                        required: boolean(&attrs, "required", true)?,
                        multiline: boolean(&attrs, "multiline", true)?,
                        placeholder,
                    },
                    Some((id, Type::Text)),
                )
            }
            "timer" => {
                let attrs = attributes(
                    child,
                    &[
                        "duration",
                        "adjustable",
                        "min",
                        "max",
                        "blocking",
                        "sticky",
                        "persistent",
                    ],
                )?;
                let persistent = boolean(&attrs, "persistent", false)?;
                let mut timer_block = child.clone();
                timer_block
                    .attributes
                    .retain(|attr| attr.name != "persistent");
                let mut local = Scope::default();
                let CheckedStep::Timer {
                    binding: id, timer, ..
                } = timer::check(&timer_block, &mut local, vec![])?
                else {
                    unreachable!()
                };
                if persistent && timer.blocking {
                    return Err(err(
                        "Persistent form timers must be non-blocking",
                        child.span.clone(),
                    ));
                }
                (
                    FormBlock::Timer {
                        id: id.clone(),
                        prompt,
                        timer,
                        persistent,
                    },
                    Some((id, Timer::output_type())),
                )
            }
            _ => {
                return Err(err(
                    "!form supports only !show, !ask and !timer",
                    child.span.clone(),
                ))
            }
        };
        if let Some((id, ty)) = field {
            if fields.insert(id, ty).is_some() {
                return Err(err("Duplicate form field", child.span.clone()));
            }
        }
        blocks.push(block);
    }
    declare(
        symbols,
        binding.clone(),
        Type::Record(fields),
        b.binding.as_ref().unwrap().span.clone(),
    )?;
    Ok(CheckedStep::Form {
        binding,
        form: Form { title, blocks },
    })
}
