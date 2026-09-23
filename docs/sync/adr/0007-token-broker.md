# ADR 0007: Token broker remains an authentication boundary

**Status:** proposed

A minimal token broker is preferred over persisting Dropbox refresh credentials in
JavaScript-accessible browser storage. It would keep refresh credentials encrypted outside
JavaScript and return short-lived access tokens to browser memory. Corpus bytes would travel
directly between browser and Dropbox. Milestone 0 must verify hosting, cookie, rotation,
revocation, mobile redirect, and no-account constraints before this ADR is accepted.
