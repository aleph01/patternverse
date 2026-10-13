# Videos

`!video` displays a video under `:language 1`. Put its URL in `:url`; the
command has no header argument or result binding. It is a content effect like
`!show`: playback does not block the next interaction or advance the practice.

```pattern
:language 1
!video {
  :url "https://youtu.be/M7lc1UVf-VE"
  :title "A short introduction"
  :start "0:10"
  :end "0:30"
  :autoplay false
  :muted false
  :loop false
  :captions "en"

  Watch this excerpt, then reflect on what stood out.
}
-> end
```

Attributes precede optional Markdown guidance below the player. References in the
guidance interpolate normally. URLs and attribute values are literal configuration,
not generated or interpolated source. The usual shorthand also works:

```pattern
:language 1
!video
  :url "https://vimeo.com/76979871"
-> end
```

| Attribute | Meaning |
| --- | --- |
| `:url "…"` | Required HTTPS source URL. |
| `:title "…"` | Optional visible title and accessible player label. |
| `:start 80` / `:start "1:20"` | Initial position; defaults to 0. |
| `:end 225` / `:end "3:45"` | Stop position; omitted means the video's end. |
| `:autoplay true/false` | Request autoplay; defaults to false. Browsers may require a click. |
| `:muted true/false` | Initial mute state; defaults to false. |
| `:loop true/false` | Repeat the selected excerpt; defaults to false. |
| `:captions "en"` | Prefer an available caption language; not a guarantee of a track. |

Times accept whole seconds or quoted `M:SS` / `H:MM:SS`. Both are absolute positions
in the original video; start 80 and end 225 selects 145 seconds. End must be greater
than start. Shared URL `start`, `t`, `end`, and `#t=` timestamps are recognized;
explicit attributes take precedence. URL times additionally accept `1h2m3s`.
Unknown or duplicate attributes and invalid URLs/times are compiler errors.
Out-of-duration excerpts produce a host playback error when duration is available.

Supported sources are YouTube (watch, share, Shorts, live and embed URLs), Vimeo
(including unlisted URLs with their access hash), Dailymotion (share/video/embed
URLs), and direct MP4/WebM files. Credentials, custom ports, unsupported source
pages and URLs without a video ID are rejected. File decoding depends on browser
support. Caption preferences are best effort; direct files have no authored caption
track in this version.

YouTube uses its IFrame API and privacy-enhanced embed domain. Vimeo uses its Player
SDK. Dailymotion uses its current Web SDK and requires the host to set
`VITE_DAILYMOTION_PLAYER_ID` to its own Player ID; configure that player's autostart
off in Dailymotion Studio. Without a Player ID, the host explains the limitation and
offers the original source link. A source link is available for every provider.

The host seeks to start, stops at end and resets for replay. Looping repeats the
excerpt. Playback boundaries have provider-dependent timing precision and do not
physically trim the source. Provider controls remain available. Pausing or ending
a practice pauses its players; leaving a view destroys its players. SDK loading
failures and unavailable/embedding-disabled videos are visible playback errors.
Playback position is host-local, not a binding or receipt. Content survives saved-run
replay, but playback position is not restored. The CLI and workbook export display
the source URL and excerpt bounds rather than embedding a player.

See the [watch-and-reflect example](examples/video-reflection.pattern.md).
