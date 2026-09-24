//! Source-level documentation gate, including private and platform-specific functions.
use std::{
    fs,
    path::{Path, PathBuf},
};
use syn::{
    visit::{self, Visit},
    Attribute, Expr, Lit, Meta, Signature, Visibility,
};

#[derive(Default)]
struct Audit {
    missing: Vec<String>,
    functions: usize,
}

/// Recognize only explicit test-only items; do not hide uncompiled platform branches.
fn test_only(attrs: &[Attribute]) -> bool {
    attrs.iter().any(|a| {
        a.path().is_ident("test")
            || (a.path().is_ident("cfg")
                && a.parse_args::<syn::Path>()
                    .is_ok_and(|p| p.is_ident("test")))
    })
}

impl Audit {
    /// Require nonempty rustdoc for each authored function, and error contracts for public Results.
    fn check(&mut self, attrs: &[Attribute], sig: &Signature, public: bool) {
        self.functions += 1;
        let docs = attrs
            .iter()
            .filter_map(|a| match &a.meta {
                Meta::NameValue(v) if v.path.is_ident("doc") => match &v.value {
                    Expr::Lit(l) => match &l.lit {
                        Lit::Str(s) => Some(s.value()),
                        _ => None,
                    },
                    _ => None,
                },
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("\n");
        let returns_result = match &sig.output {
            syn::ReturnType::Type(_, ty) => {
                matches!(ty.as_ref(), syn::Type::Path(p) if p.path.segments.last().is_some_and(|s| s.ident == "Result"))
            }
            _ => false,
        };
        let problem = if docs.trim().is_empty() {
            Some("missing function docs")
        } else if public && returns_result && !docs.lines().any(|l| l.trim() == "# Errors") {
            Some("missing # Errors contract")
        } else if sig.unsafety.is_some() && !docs.lines().any(|l| l.trim() == "# Safety") {
            Some("missing # Safety contract")
        } else {
            None
        };
        if let Some(problem) = problem {
            self.missing.push(format!(
                "{}:{}: {problem}",
                sig.ident,
                sig.ident.span().start().line
            ));
        }
    }
}
impl<'ast> Visit<'ast> for Audit {
    fn visit_item_impl(&mut self, item: &'ast syn::ItemImpl) {
        if !test_only(&item.attrs) {
            visit::visit_item_impl(self, item);
        }
    }
    fn visit_item_trait(&mut self, item: &'ast syn::ItemTrait) {
        if !test_only(&item.attrs) {
            visit::visit_item_trait(self, item);
        }
    }
    fn visit_item_mod(&mut self, item: &'ast syn::ItemMod) {
        if !test_only(&item.attrs) {
            visit::visit_item_mod(self, item);
        }
    }
    fn visit_item_fn(&mut self, item: &'ast syn::ItemFn) {
        if test_only(&item.attrs) {
            return;
        }
        self.check(
            &item.attrs,
            &item.sig,
            matches!(item.vis, Visibility::Public(_)),
        );
        visit::visit_item_fn(self, item);
    }
    fn visit_impl_item_fn(&mut self, item: &'ast syn::ImplItemFn) {
        if test_only(&item.attrs) {
            return;
        }
        self.check(
            &item.attrs,
            &item.sig,
            matches!(item.vis, Visibility::Public(_)),
        );
        visit::visit_impl_item_fn(self, item);
    }
    fn visit_trait_item_fn(&mut self, item: &'ast syn::TraitItemFn) {
        if test_only(&item.attrs) {
            return;
        }
        self.check(&item.attrs, &item.sig, true);
        visit::visit_trait_item_fn(self, item);
    }
}

/// Collect source files without traversing build outputs, dependencies or fixture directories.
fn sources(directory: &Path, files: &mut Vec<PathBuf>) {
    for entry in fs::read_dir(directory).expect("source directory is readable") {
        let path = entry.unwrap().path();
        if path.is_dir() {
            sources(&path, files);
        } else if path.extension().is_some_and(|e| e == "rs") {
            files.push(path);
        }
    }
}

#[test]
fn production_functions_have_documented_contracts() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let mut files = Vec::new();
    sources(&root.join("crates/pattern-core/src"), &mut files);
    files.sort();
    let mut errors = Vec::new();
    let mut count = 0;
    for file in files {
        let source = fs::read_to_string(&file).unwrap();
        let parsed = syn::parse_file(&source).unwrap_or_else(|e| panic!("{}: {e}", file.display()));
        let mut audit = Audit::default();
        audit.visit_file(&parsed);
        count += audit.functions;
        errors.extend(
            audit
                .missing
                .into_iter()
                .map(|e| format!("{}::{e}", file.strip_prefix(&root).unwrap().display())),
        );
    }
    assert!(
        count > 180,
        "source audit unexpectedly stopped covering production code"
    );
    assert!(
        errors.is_empty(),
        "{} functions checked; documentation gaps:\n{}",
        count,
        errors.join("\n")
    );
    println!("{count} production functions have documented contracts");
}

#[test]
fn checker_covers_private_trait_and_platform_functions_without_counting_tests() {
    let source = r#"
        #[cfg(test)] mod tests { fn fixture() {} }
        #[cfg(target_os = "macos")] fn platform() {}
        fn private() {}
        trait Boundary { fn load(&self) -> Result<(), ()>; }
        struct S;
        #[cfg(test)] impl S { fn test_helper() {} }
        #[cfg(test)] trait TestHelper { fn helper(); }
        impl S { /// Present but incomplete.
            pub fn save(&self) -> Result<(), ()> { Ok(()) }
        }
        ///   
        fn empty() {}
        /// Calls a raw boundary.
        unsafe fn unsafe_call() {}
    "#;
    let mut audit = Audit::default();
    audit.visit_file(&syn::parse_file(source).unwrap());
    assert_eq!(audit.functions, 6);
    assert_eq!(audit.missing.len(), 6);
    assert!(audit.missing.iter().any(|m| m.contains("missing # Errors")));
    assert!(audit.missing.iter().any(|m| m.contains("missing # Safety")));
}

#[test]
fn checker_accepts_real_contracts_and_documented_trait_implementations() {
    let source = r#"
        /// Load an optional record.
        /// # Errors
        /// Storage failure leaves records untouched.
        pub fn load() -> Result<(), ()> { Ok(()) }
        /// Read the raw pointer.
        /// # Safety
        /// The pointer must remain valid during this call.
        unsafe fn read() {}
        trait T { /// Return the label.
            fn label(&self);
        }
        impl T for () { /// Emit this implementation's label.
            fn label(&self) {}
        }
    "#;
    let mut audit = Audit::default();
    audit.visit_file(&syn::parse_file(source).unwrap());
    assert_eq!(audit.functions, 4);
    assert!(audit.missing.is_empty());
}
