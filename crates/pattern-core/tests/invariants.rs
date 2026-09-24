use pattern_core::{
    compiler,
    manager::{self, Command, ManagerLimits},
    persistence::{self, AtomicStore, Checkpoint, MemoryStore, StoreError, Stored},
    runtime::{Event, Fulfillment, Receipt, Status},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::Value,
};
use proptest::prelude::*;
use std::collections::{BTreeMap, BTreeSet};

fn snapshot(source: &str) -> ExecutableSnapshot {
    ExecutableSnapshot::build(SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([("root".into(), source.into())]),
    })
    .unwrap()
}
fn command(c: &Checkpoint, result: Fulfillment) -> Command {
    let p = c.state().pending().unwrap();
    Command {
        run_id: p.run_id.clone(),
        event: Event::Fulfill(Receipt {
            effect_id: p.effect_id.clone(),
            result,
        }),
    }
}
#[derive(Default)]
struct FaultStore {
    inner: MemoryStore,
    mode: u8,
}
impl AtomicStore for FaultStore {
    fn load(&mut self, key: &str) -> Result<Option<Stored>, StoreError> {
        self.inner.load(key)
    }
    fn compare_and_swap(
        &mut self,
        key: &str,
        expected: Option<u64>,
        record: Stored,
    ) -> Result<(), StoreError> {
        let mode = std::mem::take(&mut self.mode);
        if mode == 1 {
            return Err(StoreError::Unavailable);
        }
        self.inner.compare_and_swap(key, expected, record)?;
        if mode == 2 {
            return Err(StoreError::OutcomeUnknown);
        }
        Ok(())
    }
}
proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]
    #[test]
    fn arbitrary_unicode_source_never_panics_or_reports_invalid_byte_spans(chars in prop::collection::vec(any::<char>(),0..250)) {
        let source:String=chars.into_iter().collect();
        if let Err(errors)=compiler::compile(&source) {
            for e in errors { prop_assert!(source.get(e.primary).is_some());for (span,_) in e.secondary {prop_assert!(source.get(span).is_some());} }
        }
    }
    #[test]
    fn generated_arithmetic_and_branch_paths_preserve_typed_outputs(left in -1000i32..1000,right in -1000i32..1000,path in any::<bool>()) {
        let source=format!(":language 1\n:output result\n?branch {{\n:when {path} -> left\n:else -> right\n}}\nleft:\n= result {left} + {right}\n-> joined\nright:\n= result {left} - {right}\njoined:\n-> end");
        let mut store=MemoryStore::default();let checkpoint=persistence::create(&mut store,snapshot(&source),"math".into(),BTreeMap::new(),ManagerLimits::default()).unwrap();
        prop_assert_eq!(checkpoint.state().root().outputs()["result"].clone(),Value::Number(if path {(left+right) as f64} else {(left-right) as f64}));
        prop_assert!(checkpoint.deliverable().is_empty());
        prop_assert_eq!(Checkpoint::decode(&checkpoint.encode().unwrap()).unwrap(),checkpoint);
    }
    #[test]
    fn child_collections_survive_restarts_pause_retry_duplicates_and_unknown_commits(
        texts in prop::collection::vec("[a-zA-Z !{}>-]{0,24}",0..5),
        faults in prop::collection::vec(0u8..3,10),
        pauses in prop::collection::vec(any::<bool>(),10)
    ) {
        let source=":language 1\n:input items list<text>\n:output entries\n!collect entries {\n:from items\n:as item\n!use detail as result {\n:with topic = item\n}\n}\n-> end";
        let child=":language 1\n:input topic text\n:output answer\n!agent draft {\n:returns text\n{{topic}}\n}\n!ask answer {\n{{draft}}\n}\n-> end";
        let executable=ExecutableSnapshot::build(SourceBundle{root:"root".into(),patterns:BTreeMap::from([("root".into(),source.into()),("detail".into(),child.into())])}).unwrap();
        let inputs=BTreeMap::from([("items".into(),Value::List{element_type:pattern_core::value::Type::Text,items:texts.iter().cloned().map(Value::Text).collect()})]);
        let mut baseline=manager::start(executable.clone(),"property".into(),inputs.clone(),ManagerLimits::default()).unwrap().state;
        let mut store=FaultStore::default();let mut saved=persistence::create(&mut store,executable,"property".into(),inputs,ManagerLimits::default()).unwrap();
        let mut ids=BTreeSet::new();
        for (i,text) in texts.iter().flat_map(|text|[text,text]).enumerate() {
            let pending=saved.state().pending().unwrap().clone();prop_assert!(ids.insert(pending.effect_id.clone()));
            if pauses[i] {
                let pause=Command{run_id:saved.key().into(),event:Event::Pause};saved=persistence::apply(&mut store,&saved,pause).unwrap();
                prop_assert!(saved.deliverable().is_empty());
                saved=persistence::load(&mut store,"property").unwrap().unwrap();
                let resume=Command{run_id:saved.key().into(),event:Event::Resume};saved=persistence::apply(&mut store,&saved,resume).unwrap();
                prop_assert_eq!(saved.state().pending(),Some(&pending));
            }
            let retry=Command{run_id:pending.run_id.clone(),event:Event::Retry{effect_id:pending.effect_id.clone()}};
            prop_assert_eq!(persistence::apply(&mut store,&saved,retry).unwrap(),saved.clone());
            let result=if i%2==0 {Fulfillment::Generated(Value::Text(text.clone()))} else {Fulfillment::Text(text.clone())};
            let reply=command(&saved,result);
            baseline=manager::transition(&baseline,reply.clone()).unwrap().state;
            store.mode=faults[i];
            let attempt=persistence::apply(&mut store,&saved,reply.clone());
            if let Ok(next)=attempt {saved=next;} else {saved=persistence::load(&mut store,"property").unwrap().unwrap();saved=persistence::apply(&mut store,&saved,reply.clone()).unwrap();}
            let loaded=persistence::load(&mut store,"property").unwrap().unwrap();
            prop_assert_eq!(&loaded,&saved);saved=loaded;
            prop_assert_eq!(persistence::apply(&mut store,&saved,reply).unwrap(),saved.clone());
            prop_assert_eq!(saved.state().ledger().count(),i+1);
            prop_assert_eq!(saved.state().pending(),baseline.pending());
        }
        prop_assert_eq!(saved.state().root().status(),&Status::Completed);
        prop_assert_eq!(saved.state().root().outputs(),baseline.root().outputs());
        prop_assert_eq!(saved.state().runs().len(),texts.len()+1);
        prop_assert!(saved.deliverable().is_empty());
    }
    #[test]
    fn content_acknowledgement_order_and_invalid_replies_do_not_change_execution(text in ".{0,40}",order in prop::collection::vec(any::<bool>(),3)) {
        let source=":language 1\n!show {\nA\n}\n!show {\nB\n}\n!ask answer {\nAnswer\n}\n!show {\n{{answer}}\n}\n-> end";
        let mut store=MemoryStore::default();let mut saved=persistence::create(&mut store,snapshot(source),"acks".into(),BTreeMap::new(),ManagerLimits::default()).unwrap();
        let before=saved.encode().unwrap();let invalid=command(&saved,Fulfillment::Rating(2.));
        prop_assert!(persistence::apply(&mut store,&saved,invalid).is_err());
        prop_assert_eq!(persistence::load(&mut store,"acks").unwrap().unwrap().encode().unwrap(),before);
        let reply=command(&saved,Fulfillment::Text(text));saved=persistence::apply(&mut store,&saved,reply).unwrap();
        let mut acknowledged=BTreeSet::new();
        for from_back in order {
            let effects=saved.deliverable();let effect=if from_back {effects.last().unwrap()} else {effects.first().unwrap()};let id=effect.effect_id.clone();
            prop_assert!(acknowledged.insert(id.clone()));saved=persistence::acknowledge_content(&mut store,&saved,&id).unwrap();
            let loaded=persistence::load(&mut store,"acks").unwrap().unwrap();
            prop_assert_eq!(&loaded,&saved);saved=loaded;
            prop_assert!(saved.deliverable().iter().all(|e|!acknowledged.contains(&e.effect_id)));
        }
        prop_assert!(saved.deliverable().is_empty());prop_assert_eq!(saved.state().ledger().count(),1);prop_assert_eq!(saved.revision(),4);
    }
}
