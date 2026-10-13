use pattern_core::{
    compiler,
    manager::ManagerLimits,
    persistence::{self, MemoryStore},
    runtime::{self, Request, Status},
    snapshot::{ExecutableSnapshot, SourceBundle},
};
use std::collections::BTreeMap;

fn source(attributes: &str) -> String {
    format!(":language 1\n!video {{\n{attributes}\nWatch this excerpt.\n}}\nanswer = !ask {{\nWhat stood out?\n}}\n-> end")
}
fn video(attributes: &str) -> compiler::Video {
    let turn = runtime::start(
        compiler::compile(&source(attributes)).unwrap(),
        "video-test".into(),
        BTreeMap::new(),
    )
    .unwrap();
    assert_eq!(turn.state.status(), &Status::Waiting);
    assert_eq!(turn.effects.len(), 2);
    assert_eq!(
        turn.state.pending().unwrap().request.kind(),
        "interaction.ask"
    );
    let Request::Video { video, markdown } = &turn.effects[0].request else {
        panic!("expected video")
    };
    assert_eq!(markdown, "Watch this excerpt.");
    video.clone()
}

#[test]
fn shared_sources_and_timestamps_normalize() {
    for url in [
        "https://youtu.be/M7lc1UVf-VE?t=1m20s",
        "https://www.youtube.com/watch?v=M7lc1UVf-VE&start=80",
        "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE#t=80",
        "https://www.youtube.com/shorts/M7lc1UVf-VE?t=80",
        "https://m.youtube.com/live/M7lc1UVf-VE?t=80",
    ] {
        let v = video(&format!(":url \"{url}\"\n:end \"3:45\""));
        assert_eq!(v.provider, compiler::VideoProvider::Youtube);
        assert_eq!(v.id.as_deref(), Some("M7lc1UVf-VE"));
        assert_eq!((v.start_seconds, v.end_seconds), (80, Some(225)));
        assert!(!v.autoplay && !v.muted && !v.loop_video);
    }
    for (url, provider) in [
        (
            "https://vimeo.com/76979871/abcdef",
            compiler::VideoProvider::Vimeo,
        ),
        (
            "https://player.vimeo.com/video/76979871?h=abcdef",
            compiler::VideoProvider::Vimeo,
        ),
        (
            "https://www.dailymotion.com/video/x84sh87_title",
            compiler::VideoProvider::Dailymotion,
        ),
        (
            "https://dai.ly/x84sh87",
            compiler::VideoProvider::Dailymotion,
        ),
        (
            "https://example.com/movie.mp4?token=abc",
            compiler::VideoProvider::File,
        ),
        (
            "https://example.com/movie.webm",
            compiler::VideoProvider::File,
        ),
    ] {
        assert_eq!(video(&format!(":url \"{url}\"")).provider, provider);
    }
    let v = video(":url \"https://youtu.be/M7lc1UVf-VE?t=wrong&end=bad\"\n:start \"1:02:03\"\n:end 4000\n:autoplay true\n:muted true\n:loop true\n:captions \"en-US\"\n:title \"Introduction\"");
    assert_eq!(v.start_seconds, 3723);
    assert!(v.autoplay && v.muted && v.loop_video);
    assert_eq!(v.captions.as_deref(), Some("en-US"));
}

#[test]
fn invalid_video_configuration_is_rejected() {
    for attributes in [
        "",
        ":url https://youtu.be/M7lc1UVf-VE",
        ":url \"javascript:alert(1)\"",
        ":url \"http://example.com/movie.mp4\"",
        ":url \"https://user:pass@example.com/movie.mp4\"",
        ":url \"https://example.com:1234/movie.mp4\"",
        ":url \"https://youtube.com/playlist?list=123\"",
        ":url \"https://youtube.com/watch?v=bad\"",
        ":url \"https://example.com/article\"",
        ":url \"https://youtu.be/M7lc1UVf-VE?t=wrong\"",
    ] {
        assert!(
            compiler::compile(&source(attributes)).is_err(),
            "accepted {attributes}"
        );
    }
    for extra in [
        ":start -1",
        ":start 1:20",
        ":start 1.5",
        ":start \"80\"",
        ":start \"1:60\"",
        ":end 0",
        ":start 80\n:end 80",
        ":autoplay yes",
        ":muted \"true\"",
        ":loop true false",
        ":captions \"\"",
        ":start 0\n:start 1",
        ":url \"https://vimeo.com/76979871\"",
        ":unknown true",
    ] {
        assert!(
            compiler::compile(&source(&format!(
                ":url \"https://youtu.be/M7lc1UVf-VE\"\n{extra}"
            )))
            .is_err(),
            "accepted {extra}"
        );
    }
    assert!(compiler::compile(
        &source(":url \"https://youtu.be/M7lc1UVf-VE\"").replace("!video {", "clip = !video {")
    )
    .is_err());
}

#[test]
fn shorthand_and_markdown_interpolation_work_without_a_binding() {
    let src = ":language 1\ntopic = \"attention\"\n!video\n:url \"https://vimeo.com/76979871\"\nNotice {{topic}}.\n-> end";
    let turn = runtime::start(
        compiler::compile(src).unwrap(),
        "short".into(),
        BTreeMap::new(),
    )
    .unwrap();
    assert_eq!(turn.state.status(), &Status::Completed);
    assert!(
        matches!(&turn.effects[0].request, Request::Video { markdown, .. } if markdown == "Notice attention.")
    );
}

#[test]
fn videos_survive_replay_and_content_acknowledgement() {
    let source = source(":url \"https://youtu.be/M7lc1UVf-VE\"\n:start 80\n:end 225");
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "clip".into(),
        patterns: BTreeMap::from([("clip".into(), source)]),
    })
    .unwrap();
    let mut store = MemoryStore::default();
    let first = persistence::create(
        &mut store,
        snapshot,
        "run".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    let effects = first.deliverable();
    assert_eq!(
        effects.iter().map(|e| e.request.kind()).collect::<Vec<_>>(),
        ["content.video", "interaction.ask"]
    );
    let id = effects[0].effect_id.clone();
    let loaded = persistence::load(&mut store, "run").unwrap().unwrap();
    assert_eq!(loaded, first);
    let ack = persistence::acknowledge_content(&mut store, &loaded, &id).unwrap();
    assert_eq!(ack.deliverable().len(), 1);
    assert_eq!(persistence::load(&mut store, "run").unwrap().unwrap(), ack);
}

#[test]
fn documented_example_compiles() {
    compiler::compile(include_str!(
        "../../../docs/pattern-markdown/examples/video-reflection.pattern.md"
    ))
    .unwrap();
}
