# Triaged Spec Review - spec

_Generated: 2026-06-02T06:11:00Z_
_Spec: docs/spec.md_
_Process: bottom-up - the last finding (T12) is addressed first; the first finding (T11) is addressed last._

_Triage tally: 1 high retained (T11). Medium and lower findings (T01-T10) removed by request._

---

# T11 - README repository-layout table cites stale npm scope `@mariozechner/pi-*`

**Kind:** doc-alignment-broad
**Importance:** high
**Score:** 100
**Must-fix:** true
**Shape:** single
**State:** reduced

## Problem

`README.md`'s repository-layout table describes the `package.json` row as declaring "peer-deps on `@mariozechner/pi-*`". The actual peer-dep scope, used consistently by `package.json` and throughout the spec corpus, is `@earendil-works/pi-*`. The scope prefix is load-bearing: it is the npm organisation under which the four Pi packages resolve, so a reader who consults the README before `package.json` would reference packages under the wrong organisation and fail. This is the lone surviving `@mariozechner/` reference in the repository.

## Solution approach

In `README.md`'s repository-layout table, rename the `package.json` row's `@mariozechner/pi-*` to `@earendil-works/pi-*`.

## Solution constraints

- None.

## Relationships

None
