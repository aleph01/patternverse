---
id: "abstract-factory"
type: "pattern"
title: "Abstract Factory"
summary: "Create families of compatible products through one coherent creation interface."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "creational"
  - "abstract-factory"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

A desktop application supports two visual toolkits. Its buttons come from one toolkit, its menus from another, and its dialogs assume the first toolkit's event system. Each component works in isolation, but the assembled interface behaves inconsistently. The problem is no longer choosing a concrete button. It is choosing a coherent family of objects.

Abstract Factory makes that family the unit of selection. A client receives an interface with creation operations for the products it needs. One concrete factory supplies all products for toolkit A; another supplies all products for toolkit B. The client requests buttons, menus, and dialogs through the chosen factory, without naming their concrete classes.

![One family choice supplies a coherent set of widgets rather than independently mixing products.](/diagrams/gof/abstract-factory.svg "One family choice supplies a coherent set of widgets rather than independently mixing products.")

### Compatibility as an explicit boundary

A factory for interface widgets might expose create_button, create_menu, and create_dialog. Each operation returns the corresponding abstract product contract. A concrete toolkit factory knows the actual classes and any shared platform configuration needed to create them.

This reduces the number of independent choices callers must make. Instead of selecting a button implementation, a menu implementation, and a dialog implementation separately, the application selects one toolkit family at startup. The resulting wiring is easier to inspect and harder to mix accidentally.

The pattern organizes compatibility; it does not automatically prove it. A concrete factory can still be implemented incorrectly. In some languages, types can enforce parts of the family relationship. In others, construction boundaries and integration tests carry more of that responsibility. The design is valuable because it puts the responsibility somewhere identifiable.

### Switching an interface toolkit

Consider a preferences window with a Save button, a language menu, and a confirmation dialog. Before introducing the factory, its constructor creates all three directly. Supporting another toolkit requires editing each construction site, and a missed site produces a hybrid window.

With a WidgetFactory dependency, the window's code describes its needs without specifying the platform. A NativeWidgetFactory creates native products; a BrowserWidgetFactory creates browser-oriented products. The application chooses the factory before constructing the window.

The contracts must remain meaningful across families. If the browser dialog can be asynchronous while the native dialog blocks, hiding that difference behind an unrealistically synchronous interface creates a fragile abstraction. A shared contract should capture compatible behavior, perhaps through an asynchronous confirmation result, rather than erase a consequential difference.

That qualification matters: Abstract Factory is strongest when families really support comparable product roles. It becomes strained when products are grouped only because they happen to share a vendor name.

### Keeping infrastructure variants together

An application stores blobs and their metadata using one of two infrastructure setups. The first uses an in-memory blob store and metadata repository for local tests. The second uses remote services with shared authentication and naming rules. Selecting repositories independently can create a local metadata record that points to a remote blob, or a remote repository configured with the wrong namespace.

A StorageFamilyFactory supplies both a BlobStore and a MetadataRepository using the same configuration. Tests receive the local family. Deployment wiring supplies the remote family. Business operations depend on the product contracts and receive compatible collaborators.

This factory does not make two writes transactional. If uploading a blob succeeds and writing metadata fails, the application still needs a recovery policy. The family boundary controls construction compatibility, while transaction design controls consistency during use. Keeping these concerns distinct prevents an attractive factory interface from promising more than it can deliver.

### Where extension becomes expensive

Abstract Factory makes adding another family comparatively straightforward: implement the existing creation interface and supply the new concrete products. Adding another product role is harder. A new create_toolbar operation may require changes to every concrete factory, including local and test families.

This is the pattern's central tradeoff. It supports growth along the family dimension while making the product-role dimension more coordinated. If product roles change constantly and families rarely do, a large abstract factory can become a maintenance burden.

Another mistake is building an enormous application-wide factory that creates unrelated services. A family should have a clear reason to stay together. Otherwise the factory hides a dependency graph behind a convenient name and makes every client appear to depend on much more than it needs.

Clients should also avoid escaping the abstraction by inspecting concrete product types. If every operation checks whether a button is native or browser-based, the factory has merely postponed the coupling. Family-specific features may deserve a narrower explicit capability rather than repeated casts.

### Neighboring designs

Factory Method concerns an overridable creation operation and often appears inside an abstract factory's implementation. Abstract Factory's defining feature is the coordinated set of products, not the particular technique used to instantiate them.

Builder organizes the construction of a complex result through stages. It answers how a result is assembled; Abstract Factory answers which compatible family supplies its parts. Bridge separates two independently varying dimensions of a design. A factory can wire the chosen bridge implementation, but creation and ongoing behavioral delegation remain separate responsibilities.

Use Abstract Factory when a single family choice should govern several objects. Its value comes from preserving a relationship among products, not merely from replacing constructors with longer method names.

## Pattern details

**Category:** Creational · **Difficulty:** Intermediate

### Use when

- Several collaborators must belong to the same implementation family
- A client should switch a whole platform or provider without mixing variants

### Not ideal when

- Only one independent product varies
- Product families have no meaningful compatibility constraint

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[factory-method|Factory Method]] · [[bridge|Bridge]] · [[builder|Builder]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
