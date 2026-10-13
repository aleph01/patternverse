# Images

`!image` is a standalone content effect under `:language 1`, like `!show` and
`!video`. It creates no result binding and does not block the next interaction.

```pattern
:language 1
!image {
  :url "https://example.com/decision-tree.png"
  :alt "A decision tree showing three possible next steps."
  :title "Explore your options"

  Follow each branch and notice which outcome matters most.
}
-> end
```

Replace the example URL with your actual image source.

| Attribute | Meaning |
| --- | --- |
| `:url "…"` | Required HTTPS image source. |
| `:alt "…"` | Required plain text alternative describing the image's meaning. Use exactly `""` for a purely decorative image. |
| `:title "…"` | Optional visible heading. |

All attributes are quoted literal strings and precede the optional Markdown body.
The body becomes a caption or guidance below the image and supports the existing
`{{references}}` interpolation. URLs, titles and alternatives are not interpolated
or interpreted as Pattern source. Unknown/duplicate attributes, missing alternatives,
whitespace-only alternatives, unsupported URL schemes, credentials and custom ports
are compiler errors. Only decorative alternatives may be empty.

Shorthand is also supported:

```pattern
:language 1
!image
  :url "https://example.com/decoration.png"
  :alt ""
-> end
```

Images preserve their proportions and fit the available width. Meaningful images
can be clicked or opened with the keyboard to enlarge them in a modal. Escape or
the close button returns focus to the image's control. Decorative images remain
noninteractive and have an empty alternative. No sizing or layout attributes are
required.

The browser decides which image formats it can decode; the language does not require
a filename extension, so signed URLs and image endpoints also work. Images use
ordinary image elements, including SVG images, without interpreting their source as
page markup. Requests omit the referring page URL. A loading failure shows a message,
the alternative text and a source link without affecting practice progress.

The same component renders images in the practice runner, editor preview, embeds
and Mira. Images remain in saved-run content history. CLI output includes the source,
alternative and caption; workbook export produces a Markdown image with its alternative.

See the [image reflection example](examples/image-reflection.pattern.md).
