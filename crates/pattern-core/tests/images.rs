use pattern_core::{
    compiler,
    manager::ManagerLimits,
    persistence::{self, MemoryStore},
    runtime::{self, Request, Status},
    snapshot::{ExecutableSnapshot, SourceBundle},
};
use std::collections::BTreeMap;

fn source(attributes: &str) -> String {
    format!(":language 1\n!image {{\n{attributes}\nFollow each branch.\n}}\nanswer = !ask {{\nWhich option stands out?\n}}\n-> end")
}

#[test]
fn images_emit_content_without_blocking_or_creating_a_binding() {
    let turn = runtime::start(compiler::compile(&source(":url \"https://example.com/image?token=abc\"\n:alt \"Three possible next steps.\"\n:title \"Options\"")).unwrap(), "image-test".into(), BTreeMap::new()).unwrap();
    assert_eq!(turn.state.status(), &Status::Waiting);
    assert_eq!(
        turn.effects
            .iter()
            .map(|e| e.request.kind())
            .collect::<Vec<_>>(),
        ["content.image", "interaction.ask"]
    );
    let Request::Image { image, markdown } = &turn.effects[0].request else {
        panic!("image")
    };
    assert_eq!(image.url, "https://example.com/image?token=abc");
    assert_eq!(image.alt, "Three possible next steps.");
    assert_eq!(image.title.as_deref(), Some("Options"));
    assert_eq!(markdown, "Follow each branch.");
    let restored: runtime::RunState =
        serde_json::from_str(&serde_json::to_string(&turn.state).unwrap()).unwrap();
    assert_eq!(restored, turn.state);
}

#[test]
fn decorative_images_and_shorthand_keep_explicit_alternatives() {
    let source = ":language 1\ntopic = \"attention\"\n!image\n:url \"https://example.com/decoration.svg\"\n:alt \"\"\nNotice **{{topic}}**.\n-> end";
    let turn = runtime::start(
        compiler::compile(source).unwrap(),
        "decorative".into(),
        BTreeMap::new(),
    )
    .unwrap();
    assert_eq!(turn.state.status(), &Status::Completed);
    assert!(
        matches!(&turn.effects[0].request, Request::Image { image, markdown } if image.alt.is_empty() && image.title.is_none() && markdown == "Notice **attention**.")
    );
}

#[test]
fn invalid_images_have_diagnostics_instead_of_partial_content() {
    for attributes in [
        "",
        ":url \"https://example.com/image.png\"",
        ":alt \"Image\"",
        ":url https://example.com/image.png\n:alt \"Image\"",
        ":url \"javascript:alert(1)\"\n:alt \"Image\"",
        ":url \"data:image/png;base64,abc\"\n:alt \"Image\"",
        ":url \"file:///tmp/image.png\"\n:alt \"Image\"",
        ":url \"http://example.com/image.png\"\n:alt \"Image\"",
        ":url \"https://user:pass@example.com/image.png\"\n:alt \"Image\"",
        ":url \"https://example.com:1234/image.png\"\n:alt \"Image\"",
    ] {
        assert!(
            compiler::compile(&source(attributes)).is_err(),
            "accepted {attributes}"
        );
    }
    for extra in [
        ":alt image",
        ":alt \" \"",
        ":alt \"Image\" extra",
        ":title \"\"",
        ":width 500",
        ":alt \"Duplicate\"",
        ":url \"https://example.com/duplicate.png\"",
    ] {
        let attrs = if extra.starts_with(":alt ") && extra != ":alt \"Duplicate\"" {
            format!(":url \"https://example.com/image.png\"\n{extra}")
        } else {
            format!(":url \"https://example.com/image.png\"\n:alt \"Image\"\n{extra}")
        };
        assert!(
            compiler::compile(&source(&attrs)).is_err(),
            "accepted {attrs}"
        );
    }
    let valid = source(":url \"https://example.com/image.png\"\n:alt \"Image\"");
    assert!(compiler::compile(&valid.replace("!image {", "picture = !image {")).is_err());
    assert!(compiler::compile(&valid.replace("!image {", "!image picture {")).is_err());
}

#[test]
fn images_are_replayed_and_acknowledged_like_other_content() {
    let source = source(":url \"https://example.com/image.png\"\n:alt \"Image\"");
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "image".into(),
        patterns: BTreeMap::from([("image".into(), source)]),
    })
    .unwrap();
    let mut store = MemoryStore::default();
    let first = persistence::create(
        &mut store,
        snapshot,
        "image-run".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    let effects = first.deliverable();
    let id = effects[0].effect_id.clone();
    assert_eq!(effects[0].request.kind(), "content.image");
    let loaded = persistence::load(&mut store, "image-run").unwrap().unwrap();
    assert_eq!(loaded, first);
    let ack = persistence::acknowledge_content(&mut store, &loaded, &id).unwrap();
    assert_eq!(ack.deliverable().len(), 1);
    assert_eq!(
        persistence::load(&mut store, "image-run").unwrap().unwrap(),
        ack
    );
}

#[test]
fn workbook_preserves_alternatives_without_injecting_markdown() {
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "image".into(),
        patterns: BTreeMap::from([(
            "image".into(),
            source(
                ":url \"https://example.com/image.png\"\n:alt \"[a] <script>\"\n:title \"Options\"",
            ),
        )]),
    })
    .unwrap();
    let workbook = snapshot.worksheet().unwrap();
    assert!(workbook.markdown.contains("### Options"));
    assert!(workbook
        .markdown
        .contains("(<https://example.com/image.png>)"));
    assert!(workbook
        .markdown
        .contains("![\\[a\\] &lt;script&gt;](<https://example.com/image.png>)"));
    assert!(workbook.markdown.contains("Follow each branch."));
}

#[test]
fn documentation_examples_compile() {
    compiler::compile(include_str!(
        "../../../docs/pattern-markdown/examples/image-reflection.pattern.md"
    ))
    .unwrap();
    for block in include_str!("../../../docs/pattern-markdown/images.md")
        .split("```pattern\n")
        .skip(1)
    {
        compiler::compile(block.split("```").next().unwrap()).unwrap();
    }
}
