//! Portable semantic building blocks for Pattern Markdown.
//!
//! The compiler/runtime execute typed interactions, collections and isolated subpatterns.
//! M5 adds an atomic Host persistence boundary, replay and scripted restart scenarios.
//! Refinement remains a tested semantic frame until body compilation is added.
pub mod compiler;
mod expression;
pub mod host;
pub mod library;
pub mod manager;
pub mod persistence;
pub mod refine;
pub mod runtime;
pub mod scenario;
pub mod semantic;
pub mod show;
pub mod snapshot;
pub mod syntax;
pub mod value;
