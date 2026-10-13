//! Provider-independent video configuration. Playback belongs to the host.
use super::*;
use url::Url;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VideoProvider {
    Youtube,
    Vimeo,
    Dailymotion,
    File,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Video {
    pub url: String,
    pub provider: VideoProvider,
    pub id: Option<String>,
    pub title: Option<String>,
    pub start_seconds: u32,
    pub end_seconds: Option<u32>,
    pub autoplay: bool,
    pub muted: bool,
    pub loop_video: bool,
    pub captions: Option<String>,
}

/// Whole seconds or an author-friendly clock timestamp; no ambiguous decimals.
fn clock(value: &str) -> Option<u32> {
    let parts: Vec<_> = value.split(':').collect();
    if parts.is_empty()
        || parts.len() > 3
        || parts
            .iter()
            .any(|p| p.is_empty() || !p.bytes().all(|c| c.is_ascii_digit()))
    {
        return None;
    }
    let mut result = 0u32;
    for (i, part) in parts.iter().enumerate() {
        let n = part.parse::<u32>().ok()?;
        if i > 0 && (part.len() != 2 || n >= 60) {
            return None;
        }
        result = result.checked_mul(60)?.checked_add(n)?;
    }
    Some(result)
}

/// Decode clock or ordered h/m/s units in a provider share URL.
fn shared_time(value: &str) -> Option<u32> {
    if let Some(n) = clock(value) {
        return Some(n);
    }
    let mut rest = value;
    let mut total = 0u32;
    let mut found = false;
    for (unit, factor) in [('h', 3600u32), ('m', 60), ('s', 1)] {
        if let Some((digits, tail)) = rest.split_once(unit) {
            if digits.is_empty() || !digits.bytes().all(|c| c.is_ascii_digit()) {
                return None;
            }
            total = total.checked_add(digits.parse::<u32>().ok()?.checked_mul(factor)?)?;
            rest = tail;
            found = true;
        }
    }
    (found && rest.is_empty()).then_some(total)
}

/// Validate literal source/options and construct a standalone display effect.
pub(super) fn check(b: &Block, body: Vec<CheckedPart>) -> Check<CheckedStep> {
    if b.binding.is_some() || b.argument.is_some() {
        return Err(err(
            "!video has no binding or header argument; use :url inside the block",
            b.span.clone(),
        ));
    }
    let attrs = attributes(
        b,
        &[
            "url", "title", "start", "end", "autoplay", "muted", "loop", "captions",
        ],
    )?;
    let text = |key: &str| -> Check<Option<String>> {
        attrs
            .get(key)
            .map(|a| {
                let w = &arity(a, 1)?[0];
                if !w.quoted || w.text.trim().is_empty() {
                    return Err(err(
                        format!(":{key} requires a nonempty quoted string"),
                        w.span.clone(),
                    ));
                }
                Ok(w.text.clone())
            })
            .transpose()
    };
    let raw = text("url")?.ok_or_else(|| err("!video requires :url", b.span.clone()))?;
    let url = Url::parse(&raw).map_err(|_| err("Invalid video URL", b.span.clone()))?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
    {
        return Err(err(
            "Video URLs must use HTTPS without credentials or a custom port",
            b.span.clone(),
        ));
    }
    let path: Vec<_> = url
        .path_segments()
        .into_iter()
        .flatten()
        .filter(|s| !s.is_empty())
        .collect();
    let query = |key: &str| {
        url.query_pairs()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.into_owned())
    };
    let (provider, id) = match url.host_str().unwrap() {
        "youtu.be" | "www.youtu.be" => {
            (VideoProvider::Youtube, path.first().map(|s| s.to_string()))
        }
        "youtube.com"
        | "www.youtube.com"
        | "m.youtube.com"
        | "music.youtube.com"
        | "youtube-nocookie.com"
        | "www.youtube-nocookie.com" => {
            let id = match path.as_slice() {
                ["watch"] => query("v"),
                ["embed" | "shorts" | "live", id] => Some(id.to_string()),
                _ => None,
            };
            (VideoProvider::Youtube, id)
        }
        "vimeo.com" | "www.vimeo.com" | "player.vimeo.com" => {
            let id = if path.first() == Some(&"video") {
                path.get(1)
            } else {
                path.first()
            };
            (VideoProvider::Vimeo, id.map(|s| s.to_string()))
        }
        "dai.ly" | "www.dai.ly" => (
            VideoProvider::Dailymotion,
            path.first().map(|s| s.to_string()),
        ),
        "dailymotion.com" | "www.dailymotion.com" => {
            let id = match path.as_slice() {
                ["video", id] | ["embed", "video", id] => {
                    Some(id.split('_').next().unwrap().to_string())
                }
                _ => None,
            };
            (VideoProvider::Dailymotion, id)
        }
        _ if url.path().to_ascii_lowercase().ends_with(".mp4")
            || url.path().to_ascii_lowercase().ends_with(".webm") =>
        {
            (VideoProvider::File, None)
        }
        _ => return Err(err(
            "Unsupported video source; use YouTube, Vimeo, Dailymotion, or a direct MP4/WebM URL",
            b.span.clone(),
        )),
    };
    let valid_id = match (&provider, &id) {
        (VideoProvider::Youtube, Some(id)) => {
            id.len() == 11
                && id
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
        }
        (VideoProvider::Vimeo, Some(id)) => {
            !id.is_empty() && id.bytes().all(|c| c.is_ascii_digit())
        }
        (VideoProvider::Dailymotion, Some(id)) => {
            !id.is_empty() && id.bytes().all(|c| c.is_ascii_alphanumeric())
        }
        (VideoProvider::File, None) => true,
        _ => false,
    };
    if !valid_id {
        return Err(err(
            "Video URL must identify a single valid video",
            b.span.clone(),
        ));
    }
    let time = |key: &str, shared: Option<String>| -> Check<Option<u32>> {
        if let Some(a) = attrs.get(key) {
            let w = &arity(a, 1)?[0];
            if w.quoted != w.text.contains(':') {
                return Err(err(
                    "Use whole seconds or a quoted M:SS / H:MM:SS timestamp",
                    w.span.clone(),
                ));
            }
            return clock(&w.text).map(Some).ok_or_else(|| {
                err(
                    "Use whole seconds or a quoted M:SS / H:MM:SS timestamp",
                    w.span.clone(),
                )
            });
        }
        shared
            .map(|s| {
                shared_time(&s).ok_or_else(|| {
                    err(
                        format!("Invalid {key} timestamp in video URL"),
                        b.span.clone(),
                    )
                })
            })
            .transpose()
    };
    let fragment_time = url
        .fragment()
        .and_then(|f| f.strip_prefix("t="))
        .map(str::to_owned);
    let start_seconds = time(
        "start",
        query("start").or_else(|| query("t")).or(fragment_time),
    )?
    .unwrap_or(0);
    let end_seconds = time("end", query("end"))?;
    if end_seconds.is_some_and(|end| end <= start_seconds) {
        return Err(err(
            "Video :end must be greater than :start (both refer to the original video)",
            b.span.clone(),
        ));
    }
    let boolean = |key: &str| -> Check<bool> {
        let Some(a) = attrs.get(key) else {
            return Ok(false);
        };
        let w = &arity(a, 1)?[0];
        match (w.quoted, w.text.as_str()) {
            (false, "true") => Ok(true),
            (false, "false") => Ok(false),
            _ => Err(err("Expected true or false", w.span.clone())),
        }
    };
    let captions = text("captions")?;
    if captions.as_ref().is_some_and(|s| {
        !s.split('-')
            .all(|part| !part.is_empty() && part.bytes().all(|c| c.is_ascii_alphanumeric()))
    }) {
        return Err(err(
            "Caption language must be a language tag such as en or en-US",
            b.span.clone(),
        ));
    }
    Ok(CheckedStep::Video {
        video: Video {
            url: url.to_string(),
            provider,
            id,
            title: text("title")?,
            start_seconds,
            end_seconds,
            autoplay: boolean("autoplay")?,
            muted: boolean("muted")?,
            loop_video: boolean("loop")?,
            captions,
        },
        body,
    })
}
