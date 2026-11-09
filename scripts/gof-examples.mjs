// Original executable teaching examples. Each runs independently using Python's standard library.
export const gofExamples = {
  'factory-method': {
    introduction:
      'This Python example keeps the publishing sequence in Publisher. HtmlPublisher overrides only the creation hook. The exporters return text artifacts so the example stays independent of rendering libraries.',
    code: `from abc import ABC, abstractmethod
from html import escape


class TextExporter:
    def render(self, document):
        return document


class HtmlExporter:
    def render(self, document):
        return f"<p>{escape(document)}</p>"


class Publisher(ABC):
    def publish(self, document):
        if not document.strip():
            raise ValueError("A document needs content")
        exporter = self.create_exporter()
        return exporter.render(document)

    @abstractmethod
    def create_exporter(self):
        pass


class HtmlPublisher(Publisher):
    def create_exporter(self):
        return HtmlExporter()


print(HtmlPublisher().publish("Hello & welcome"))
# <p>Hello &amp; welcome</p>`,
    explanation:
      'The inherited publish operation owns validation and the point at which an exporter is needed. The subclass supplies the product. Calling HtmlExporter directly from each workflow would lose that extension point; a standalone make_exporter function would instead be a simple factory.',
    checks: `assert HtmlPublisher().publish("A") == "<p>A</p>"
try:
    HtmlPublisher().publish(" ")
    raise AssertionError("Validation was bypassed")
except ValueError:
    pass`,
  },
  'abstract-factory': {
    introduction:
      'The example below selects an entire widget family. The window asks for product roles and never chooses a concrete button and menu independently. Rendering returns strings to make the family relationship visible without a UI toolkit.',
    code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Button:
    family: str

    def render(self):
        return f"{self.family} button"


@dataclass(frozen=True)
class Menu:
    family: str

    def render(self):
        return f"{self.family} menu"


class NativeWidgets:
    def create_button(self):
        return Button("native")

    def create_menu(self):
        return Menu("native")


class BrowserWidgets:
    def create_button(self):
        return Button("browser")

    def create_menu(self):
        return Menu("browser")


def preferences_window(factory):
    return [factory.create_button().render(),
            factory.create_menu().render()]


print(preferences_window(BrowserWidgets()))
# ['browser button', 'browser menu']`,
    explanation:
      'Switching to NativeWidgets changes both products through one application-level choice. These small product classes encode the family as data; real toolkits may use entirely different classes behind the same product contracts. The important guarantee to test is that each factory supplies a coherent family.',
    checks: `assert preferences_window(NativeWidgets()) == ["native button", "native menu"]
assert preferences_window(BrowserWidgets()) == ["browser button", "browser menu"]`,
  },
  builder: {
    introduction:
      'ReportBuilder keeps incomplete construction state separate from the immutable Report. Its build method is the completion boundary. This example uses a title and sections; a production report can add its date and currency rules at the same boundary.',
    code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Report:
    title: str
    sections: tuple[str, ...]


class ReportBuilder:
    def __init__(self):
        self.title = ""
        self.sections = []

    def with_title(self, title):
        self.title = title.strip()
        return self

    def add_section(self, text):
        self.sections.append(text)
        return self

    def build(self):
        if not self.title or not self.sections:
            raise ValueError("A report needs a title and sections")
        return Report(self.title, tuple(self.sections))


builder = ReportBuilder().with_title("Quarterly review")
report = builder.add_section("Revenue increased").build()
builder.add_section("Draft note")
print(report.sections)
# ('Revenue increased',)`,
    explanation:
      'The finished report stores a tuple copied from the builder, so adding another section to the builder does not alter the existing result. Chaining makes this interface convenient; the separate construction state and explicit completion check provide the actual design benefit.',
    checks: `assert report.sections == ("Revenue increased",)
assert len(builder.build().sections) == 2
try:
    ReportBuilder().build()
    raise AssertionError("An incomplete report escaped")
except ValueError:
    pass`,
  },
  prototype: {
    introduction:
      'A shape owns its copying rule. The editor can duplicate it without knowing its constructor details. A new identity is assigned, editable labels are copied, and the immutable style value is deliberately shared.',
    code: `from dataclasses import dataclass, field
from uuid import uuid4


@dataclass(frozen=True)
class Style:
    fill: str


@dataclass
class Shape:
    style: Style
    labels: list[str]
    identity: str = field(default_factory=lambda: str(uuid4()))

    def clone(self):
        return Shape(self.style, self.labels.copy())


original = Shape(Style("green"), ["Entrance"])
duplicate = original.clone()
duplicate.labels.append("Copy")
print(original.labels, duplicate.labels)
# ['Entrance'] ['Entrance', 'Copy']`,
    explanation:
      'The duplicate has an independent label list and a different identity, while its immutable style can safely remain the same object. A generic shallow copy would share the labels. A blanket deep copy could duplicate data that should remain shared. The clone contract makes those decisions explicit.',
    checks: `assert duplicate.identity != original.identity
assert duplicate.style is original.style
assert original.labels == ["Entrance"]
assert duplicate.labels == ["Entrance", "Copy"]`,
  },
  singleton: {
    introduction:
      'This deliberately narrow Singleton controls construction of one coordinator object per Python class in one process. It does not acquire a hardware lock or establish uniqueness across processes. The lock guards creation only.',
    code: `from threading import Lock


class DeviceCoordinator:
    _instance = None
    _creation_lock = Lock()

    def __new__(cls):
        with cls._creation_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
            return cls._instance

    def identify(self):
        return "local device coordinator"


first = DeviceCoordinator()
second = DeviceCoordinator()
print(first is second)
# True`,
    explanation:
      'Two construction calls return the same object in this process. There is no mutable initialization step to rerun here. If operations mutate device state, they need their own coordination policy; the construction lock does not protect them. When callers merely need one shared service, constructing it once and passing it explicitly often gives a clearer lifetime.',
    checks: `assert first is second
assert first.identify() == "local device coordinator"`,
  },
  adapter: {
    introduction:
      'The application wants a submission identifier from send. The vendor accepts a differently shaped payload through submit. The adapter translates both the request and the result while preserving the promise of acceptance for delivery.',
    code: `class VendorMail:
    def submit(self, payload):
        self.last_payload = payload
        return {"accepted_token": "submission-42"}


class MailAdapter:
    def __init__(self, vendor):
        self.vendor = vendor

    def send(self, recipient, subject, body):
        response = self.vendor.submit({
            "destination": {"address": recipient},
            "message": {"subject": subject, "text": body},
        })
        return response["accepted_token"]


vendor = VendorMail()
mailer = MailAdapter(vendor)
print(mailer.send("reader@example.com", "Receipt", "Thank you"))
# submission-42`,
    explanation:
      'Order code can now depend on send rather than the vendor vocabulary. The local VendorMail is a test double: it records a payload and returns a fixed response without sending a message. A real adapter must also translate relevant error distinctions. The returned token means accepted submission, not completed delivery.',
    checks: `assert vendor.last_payload["destination"]["address"] == "reader@example.com"
assert vendor.last_payload["message"] == {"subject": "Receipt", "text": "Thank you"}`,
  },
  bridge: {
    introduction:
      'The drawing abstraction delegates to a rendering implementation. Circle and Rectangle vary independently from SvgRenderer and TextRenderer. The example returns descriptions rather than drawing pixels, making both dimensions easy to inspect.',
    code: `class SvgRenderer:
    def circle(self, radius):
        return f'<circle r="{radius}"/>'

    def rectangle(self, width, height):
        return f'<rect width="{width}" height="{height}"/>'


class TextRenderer:
    def circle(self, radius):
        return f"circle radius={radius}"

    def rectangle(self, width, height):
        return f"rectangle {width}x{height}"


class Circle:
    def __init__(self, renderer, radius):
        self.renderer, self.radius = renderer, radius

    def draw(self):
        return self.renderer.circle(self.radius)


class Rectangle:
    def __init__(self, renderer, width, height):
        self.renderer = renderer
        self.width, self.height = width, height

    def draw(self):
        return self.renderer.rectangle(self.width, self.height)


print(Circle(SvgRenderer(), 4).draw())
print(Rectangle(TextRenderer(), 3, 5).draw())
# <circle r="4"/>
# rectangle 3x5`,
    explanation:
      'The two shape abstractions work with either renderer; there is no SvgCircle or TextRectangle subclass for every pairing. This does not make extension free. A new drawing primitive in the renderer contract still requires support from each renderer.',
    checks: `assert Circle(TextRenderer(), 4).draw() == "circle radius=4"
assert Rectangle(SvgRenderer(), 3, 5).draw() == '<rect width="3" height="5"/>'`,
  },
  composite: {
    introduction:
      'A product and a bundle both answer price_cents. The bundle delegates to its children, which can include other bundles. This is an acyclic ownership tree with fixed prices; discounts and shared catalog references would need additional rules.',
    code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Product:
    name: str
    cents: int

    def price_cents(self):
        return self.cents


@dataclass(frozen=True)
class Bundle:
    children: tuple

    def price_cents(self):
        return sum(child.price_cents() for child in self.children)


pencil = Product("Pencil", 100)
notebook = Product("Notebook", 500)
stationery = Bundle((pencil, notebook))
gift = Bundle((stationery, Product("Card", 200)))
print(gift.price_cents())
# 800`,
    explanation:
      'Checkout can ask either a leaf product or a nested bundle for its price. It does not inspect types or repeat the recursion. Child-management methods are intentionally absent from Product: sharing one meaningful operation does not require pretending a leaf is a container.',
    checks: `assert pencil.price_cents() == 100
assert stationery.price_cents() == 600
assert Bundle(()).price_cents() == 0`,
  },
  decorator: {
    introduction:
      'A metrics wrapper preserves the catalog lookup contract and adds a call count around delegation. It can wrap any compatible catalog. This small example avoids introducing compression or encryption code that would distract from the wrapping mechanism.',
    code: `class Catalog:
    def lookup(self, product_id):
        return {"id": product_id, "name": "Notebook"}


class CountedCatalog:
    def __init__(self, inner):
        self.inner = inner
        self.calls = 0

    def lookup(self, product_id):
        self.calls += 1
        return self.inner.lookup(product_id)


catalog = CountedCatalog(Catalog())
print(catalog.lookup("book-1")["name"])
print(catalog.calls)
# Notebook
# 1`,
    explanation:
      'The caller still uses lookup; the added responsibility lives in the wrapper. The counter records attempts, including failed calls, because it increments before delegation. If success-only counts are required, increment after the call. Even a small decorator needs a precise account of the behavior it adds.',
    checks: `assert catalog.lookup("book-2")["id"] == "book-2"
assert catalog.calls == 2`,
  },
  facade: {
    introduction:
      'The export facade gives a screen one operation instead of a sequence of subsystem calls. The functions here use in-memory values so their order and return behavior can be inspected without files or external services.',
    code: `def load_assets(project):
    return project["pages"]


def render_pages(pages):
    return [page.upper() for page in pages]


def package_pages(pages):
    return "\\n".join(pages).encode("utf-8")


class ExportFacade:
    def export_project(self, project):
        assets = load_assets(project)
        rendered = render_pages(assets)
        return package_pages(rendered)


artifact = ExportFacade().export_project({"pages": ["Cover", "Notes"]})
print(artifact.decode("utf-8"))
# COVER
# NOTES`,
    explanation:
      'The caller requests an export while the facade owns routine collaboration. These subsystem operations may still be used directly by specialized tools. A real exporter must define failures, cleanup, and partial output; presenting one method does not turn the sequence into a transaction.',
    checks: `assert artifact == b"COVER\\nNOTES"
assert ExportFacade().export_project({"pages": []}) == b""`,
  },
  flyweight: {
    introduction:
      'TreeType holds immutable species data shared by many logical trees. Each Tree stores only its position and a reference to that type. The factory key includes every shared property used here, preventing different assets from being merged accidentally.',
    code: `from dataclasses import dataclass


@dataclass(frozen=True)
class TreeType:
    species: str
    asset: str


class TreeTypes:
    def __init__(self):
        self.types = {}

    def get(self, species, asset):
        key = (species, asset)
        if key not in self.types:
            self.types[key] = TreeType(species, asset)
        return self.types[key]


@dataclass(frozen=True)
class Tree:
    x: int
    y: int
    kind: TreeType


types = TreeTypes()
first = Tree(10, 20, types.get("oak", "oak.svg"))
second = Tree(30, 40, types.get("oak", "oak.svg"))
print(first.kind is second.kind)
# True`,
    explanation:
      'The trees remain distinct values at different coordinates. Their species asset is one shared object. Mutable per-tree properties must stay outside that object; otherwise changing one tree can affect every tree sharing the flyweight. The cache itself also needs an appropriate lifetime and memory policy.',
    checks: `assert first != second
assert first.kind is second.kind
assert types.get("oak", "winter-oak.svg") is not first.kind`,
  },
  proxy: {
    introduction:
      'The client can call render on either an image or its lazy proxy. Creating the proxy does not load image data. The first render creates the subject, and later renders reuse it. The loader is local and records when it runs.',
    code: `loads = []


class Image:
    def __init__(self, name):
        loads.append(name)
        self.name = name

    def render(self):
        return f"render {self.name}"


class LazyImage:
    def __init__(self, name):
        self.name = name
        self.subject = None

    def render(self):
        if self.subject is None:
            self.subject = Image(self.name)
        return self.subject.render()


image = LazyImage("map.png")
print(len(loads))
print(image.render())
print(image.render())
print(len(loads))
# 0
# render map.png
# render map.png
# 1`,
    explanation:
      'The proxy preserves the useful rendering interface and changes when access occurs. This single-threaded example does not synchronize first access. A concurrent version needs a policy for duplicate loads, failure, retry, and disposal rather than assuming lazy construction automatically handles those concerns.',
    checks: `assert loads == ["map.png"]
assert image.subject is not None`,
  },
  'chain-of-responsibility': {
    introduction:
      'The first handler that accepts a keyboard event ends the search. An explicit boolean result distinguishes handled from unhandled; processing order is part of the behavior.',
    code: `class Handler:
    def __init__(self, action, successor=None):
        self.action = action
        self.successor = successor

    def handle(self, event):
        if self.action(event):
            return True
        if self.successor is not None:
            return self.successor.handle(event)
        return False


actions = []


def text_field(event):
    if event == "copy":
        actions.append("copy selection")
        return True
    return False


def window(event):
    if event == "close":
        actions.append("close window")
        return True
    return False


chain = Handler(text_field, Handler(window))
print(chain.handle("close"), actions)
print(chain.handle("unknown"))
# True ['close window']
# False`,
    explanation:
      'The text field declines close, so the request reaches the window. An unknown event reaches the end and returns False. This is first-match handling; a pipeline that requires every stage to run needs a different continuation contract. A cyclic successor graph would require prevention or detection.',
    checks: `assert chain.handle("copy") is True
assert actions == ["close window", "copy selection"]
assert chain.handle("unknown") is False`,
  },
  command: {
    introduction:
      'An editor action stores the information needed to invoke a receiver later. The history belongs to the invoker. This deletion command supports undo only when it is the most recent edit and nothing has changed the document since execution.',
    code: `from dataclasses import dataclass


@dataclass
class Document:
    text: str


class DeleteRange:
    def __init__(self, document, start, stop):
        self.document = document
        self.start, self.stop = start, stop
        self.before = None

    def execute(self):
        self.before = self.document.text
        self.document.text = (self.before[:self.start]
                              + self.before[self.stop:])

    def undo(self):
        if self.before is None:
            raise RuntimeError("Execute before undo")
        self.document.text = self.before
        self.before = None


document = Document("Hello world")
command = DeleteRange(document, 5, 11)
history = []
command.execute()
history.append(command)
print(document.text)
history.pop().undo()
print(document.text)
# Hello
# Hello world`,
    explanation:
      'A menu and a keyboard shortcut can construct the same command. The receiver remains the document, and history decides when undo runs. Restoring the previous text is an intentionally small demonstration; concurrent edits, range validation, redo, and persistent history require stronger policies.',
    checks: `assert document.text == "Hello world"
assert history == []
try:
    command.undo()
    raise AssertionError("Undo without execution")
except RuntimeError:
    pass`,
  },
  interpreter: {
    introduction:
      'A rule is built from terminal expressions and a compound expression. This example constructs the syntax tree directly; it does not parse user text or execute it as Python.',
    code: `from dataclasses import dataclass


@dataclass(frozen=True)
class HasValue:
    field: str
    expected: object

    def evaluate(self, task):
        return task.get(self.field) == self.expected


@dataclass(frozen=True)
class And:
    left: object
    right: object

    def evaluate(self, task):
        return self.left.evaluate(task) and self.right.evaluate(task)


unfinished_high_priority = And(
    HasValue("done", False),
    HasValue("priority", "high"),
)
task = {"done": False, "priority": "high"}
print(unfinished_high_priority.evaluate(task))
# True`,
    explanation:
      'HasValue interprets a terminal condition. And interprets conjunction by recursively evaluating its children, including short-circuit behavior. Parsing, validation, and limits on expression depth are separate responsibilities. The tree should contain only expression types admitted by the small language.',
    checks: `assert unfinished_high_priority.evaluate({"done": True, "priority": "high"}) is False
assert unfinished_high_priority.evaluate({"done": False, "priority": "low"}) is False`,
  },
  iterator: {
    introduction:
      "A tree exposes depth-first iteration through Python's iterator protocol. Each call to iter creates a fresh generator with its own traversal state. The reporting client consumes values without implementing a tree walk.",
    code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Node:
    name: str
    children: tuple = ()

    def __iter__(self):
        yield self.name
        for child in self.children:
            yield from child


tree = Node("Root", (Node("First"), Node("Second")))
left = iter(tree)
right = iter(tree)
print(next(left), next(left))
print(next(right))
print(list(tree))
# Root First
# Root
# ['Root', 'First', 'Second']`,
    explanation:
      'Advancing left does not move right. The immutable example avoids a mutation policy; a mutable tree would need to define whether edits during iteration are forbidden, reflected live, or read from a snapshot. For very deep trees, an explicit stack can replace recursive generator calls.',
    checks: `assert list(left) == ["Second"]
assert list(right) == ["First", "Second"]
assert list(Node("Only")) == ["Only"]`,
  },
  mediator: {
    introduction:
      'A control reports a change to the dialog mediator rather than directly changing its peers. The mediator reads the combined state and owns the rule for enabling the test button. This is synchronous local UI coordination.',
    code: `class Field:
    def __init__(self, mediator):
        self.mediator = mediator
        self.value = ""

    def set_value(self, value):
        self.value = value
        self.mediator.changed()


class TestButton:
    def __init__(self):
        self.enabled = False


class ConnectionDialog:
    def __init__(self):
        self.server = Field(self)
        self.credential = Field(self)
        self.test_button = TestButton()

    def changed(self):
        self.test_button.enabled = bool(
            self.server.value.strip() and self.credential.value.strip()
        )


dialog = ConnectionDialog()
dialog.server.set_value("staging")
print(dialog.test_button.enabled)
dialog.credential.set_value("test credential")
print(dialog.test_button.enabled)
# False
# True`,
    explanation:
      'The fields know only how to notify their mediator. They do not hold references to the button or each other. The mediator coordinates availability; a real credential field and server selector still need their own validation. Centralizing their collaboration should not move every local behavior into the mediator.',
    checks: `assert dialog.test_button.enabled is True
dialog.credential.set_value(" ")
assert dialog.test_button.enabled is False`,
  },
  memento: {
    introduction:
      'The layout owns snapshot creation and restoration. History stores the returned value without unpacking it. Python naming conventions provide an encapsulation boundary here, rather than a security barrier against inspecting the snapshot.',
    code: `from dataclasses import dataclass


@dataclass(frozen=True)
class _Snapshot:
    positions: tuple[tuple[str, int], ...]


class Layout:
    def __init__(self):
        self.positions = {"title": 10, "body": 40}

    def save(self):
        return _Snapshot(tuple(self.positions.items()))

    def restore(self, snapshot):
        self.positions = dict(snapshot.positions)


layout = Layout()
history = [layout.save()]
layout.positions["title"] = 90
layout.restore(history.pop())
print(layout.positions["title"])
# 10`,
    explanation:
      'The snapshot contains immutable values, so later edits do not modify the saved state. Restoration creates a new dictionary. In a richer layout, the originator would capture and validate all state needed for coherent restoration, including constraints. An in-memory snapshot of one object does not reverse external effects.',
    checks: `saved = layout.save()
layout.positions["title"] = 100
assert dict(saved.positions)["title"] == 10
layout.restore(saved)
assert layout.positions["title"] == 10`,
  },
  observer: {
    introduction:
      'A document notifies callbacks after its title changes. Subscription returns an explicit cleanup operation. Notifications are synchronous, and the subscriber list is copied so callbacks may unsubscribe without corrupting iteration.',
    code: `class Document:
    def __init__(self):
        self.title = "Untitled"
        self.observers = []

    def subscribe(self, observer):
        self.observers.append(observer)

        def unsubscribe():
            if observer in self.observers:
                self.observers.remove(observer)

        return unsubscribe

    def rename(self, title):
        self.title = title
        for observer in tuple(self.observers):
            observer(title)


document = Document()
headings = []
unsubscribe = document.subscribe(headings.append)
document.rename("Design notes")
unsubscribe()
document.rename("Private draft")
print(headings)
# ['Design notes']`,
    explanation:
      'The document does not know whether the callback updates a heading, an index, or a test recorder. Cleanup ends the relationship explicitly. In this small version, a callback exception stops later notifications; an application must choose whether to propagate, isolate, or collect subscriber failures.',
    checks: `assert headings == ["Design notes"]
assert document.title == "Private draft"
unsubscribe()
assert document.observers == []`,
  },
  state: {
    introduction:
      'The upload delegates requests to its current state. Starting changes Idle to Transferring; pausing changes Transferring to Paused; resuming is valid only in Paused. The example models transitions without starting a network transfer.',
    code: `class UploadState:
    def start(self, upload):
        raise RuntimeError("Cannot start in this state")

    def pause(self, upload):
        raise RuntimeError("Cannot pause in this state")

    def resume(self, upload):
        raise RuntimeError("Cannot resume in this state")


class Idle(UploadState):
    def start(self, upload):
        upload.state = Transferring()


class Transferring(UploadState):
    def pause(self, upload):
        upload.state = Paused()


class Paused(UploadState):
    def resume(self, upload):
        upload.state = Transferring()


class Upload:
    def __init__(self):
        self.state = Idle()

    def start(self):
        self.state.start(self)

    def pause(self):
        self.state.pause(self)

    def resume(self):
        self.state.resume(self)


upload = Upload()
upload.start()
upload.pause()
print(type(upload.state).__name__)
upload.resume()
print(type(upload.state).__name__)
# Paused
# Transferring`,
    explanation:
      'The current state owns which transition a request permits. Unsupported operations fail explicitly through the base state. A real upload also needs completion, cancellation, failure, and coordination with in-flight work. Creating state objects does not make those transitions atomic or persist them.',
    checks: `assert isinstance(upload.state, Transferring)
try:
    Upload().resume()
    raise AssertionError("Idle accepted resume")
except RuntimeError:
    pass`,
  },
  'template-method': {
    introduction:
      'The base importer owns the sequence and the shared validation. Subclasses supply how records are read. Both are in-memory formats here, allowing the code to focus on the template without inventing a file lifecycle.',
    code: `from abc import ABC, abstractmethod


class Importer(ABC):
    def run(self, text):
        records = self.read_records(text)
        normalized = [record.strip() for record in records]
        if any(not record for record in normalized):
            raise ValueError("Empty records are not allowed")
        return normalized

    @abstractmethod
    def read_records(self, text):
        pass


class LineImporter(Importer):
    def read_records(self, text):
        return text.splitlines()


class SemicolonImporter(Importer):
    def read_records(self, text):
        return text.split(";")


print(LineImporter().run(" Alpha\\nBeta "))
print(SemicolonImporter().run(" Alpha;Beta "))
# ['Alpha', 'Beta']
# ['Alpha', 'Beta']`,
    explanation:
      'Neither subclass repeats normalization or validation. The semicolon example is a deliberately tiny format, not a CSV parser. When imports use resources, the base workflow also needs a defined cleanup path on exceptions. Overriding the entire run method would bypass the shared sequence.',
    checks: `assert LineImporter().run(" A\\nB ") == ["A", "B"]
try:
    SemicolonImporter().run("A;;B")
    raise AssertionError("Shared validation was bypassed")
except ValueError:
    pass`,
  },
  visitor: {
    introduction:
      'Each expression node routes accept to its type-specific visitor method. The operation lives in the visitor. In this example, each visitor explicitly owns recursive traversal, so children are visited once.',
    code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Number:
    value: int

    def accept(self, visitor):
        return visitor.visit_number(self)


@dataclass(frozen=True)
class Addition:
    left: object
    right: object

    def accept(self, visitor):
        return visitor.visit_addition(self)


class Evaluate:
    def visit_number(self, node):
        return node.value

    def visit_addition(self, node):
        return node.left.accept(self) + node.right.accept(self)


class Format:
    def visit_number(self, node):
        return str(node.value)

    def visit_addition(self, node):
        return f"({node.left.accept(self)} + {node.right.accept(self)})"


expression = Addition(Number(2), Number(3))
print(expression.accept(Evaluate()))
print(expression.accept(Format()))
# 5
# (2 + 3)`,
    explanation:
      'Adding formatting did not require adding format methods to each element. Adding a new element type would require a corresponding method on both visitors. The node selects the type-specific visit operation; the supplied visitor selects which overall operation is performed.',
    checks: `assert expression.accept(Evaluate()) == 5
assert expression.accept(Format()) == "(2 + 3)"
assert Addition(expression, Number(4)).accept(Evaluate()) == 9`,
  },
};
