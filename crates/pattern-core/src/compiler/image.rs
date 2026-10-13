//! Literal image configuration; rendering and enlargement belong to the host.
use super::*;
use url::Url;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Image {
    pub url: String,
    pub alt: String,
    pub title: Option<String>,
}

/// Validate an image source and explicit alternative text without creating a binding.
pub(super) fn check(b: &Block, body: Vec<CheckedPart>) -> Check<CheckedStep> {
    if b.binding.is_some() || b.argument.is_some() {
        return Err(err(
            "!image has no binding or header argument; use :url inside the block",
            b.span.clone(),
        ));
    }
    let attrs = attributes(b, &["url", "alt", "title"])?;
    let text = |key: &str| -> Check<Option<String>> {
        attrs.get(key).map(|a| {
            let w = &arity(a, 1)?[0];
            if !w.quoted {
                return Err(err(format!(":{key} requires a quoted string"), w.span.clone()));
            }
            if w.text.trim().is_empty() && (key != "alt" || !w.text.is_empty()) {
                return Err(err(format!(":{key} must be nonempty; only :alt \"\" may be empty for a decorative image"), w.span.clone()));
            }
            Ok(w.text.clone())
        }).transpose()
    };
    let raw = text("url")?.ok_or_else(|| err("!image requires :url", b.span.clone()))?;
    let alt = text("alt")?.ok_or_else(|| {
        err(
            "!image requires :alt; use \"\" for a decorative image",
            b.span.clone(),
        )
    })?;
    let url = Url::parse(&raw).map_err(|_| err("Invalid image URL", attrs["url"].span.clone()))?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
    {
        return Err(err(
            "Image URLs must use HTTPS without credentials or a custom port",
            attrs["url"].span.clone(),
        ));
    }
    Ok(CheckedStep::Image {
        image: Image {
            url: url.to_string(),
            alt,
            title: text("title")?,
        },
        body,
    })
}
