# Release version naming

## Release-version naming and legacy aliases

<a id="gov-19"></a> **GOV-19 (release-version naming scheme).** Theta releases are named under two parallel literal forms:

- **Design-scope literal.** `theta <major>.<minor>` (e.g. `theta 1.0`, `theta 2.0`) and `theta <major>.x` (e.g. `theta 1.x`) name a major design scope. A design-scope literal makes claims about the design direction, scope decisions, scope carve-outs, and forward-compatibility seams shared by every release in the named scope.
- **Frozen-baseline literal.** `theta <major>.<minor>.<patch>` (e.g. `theta 1.0.0`, `theta 1.0.1`) names a frozen-baseline release — a closed inventory of the release's enumerated invariants at the publishing moment. A frozen-baseline literal makes claims about closed enumerations ("exactly N panic sources", "the closed `details.kind` set", "loads cleanly under"), discriminator inventories, and any other closure-shaped invariant whose membership is fixed at the publishing moment.

The two literal forms are lexically distinguishable: `theta <major>.<minor>` matches `theta \d+\.(?:\d+|x)`; `theta <major>.<minor>.<patch>` matches `theta \d+\.\d+\.\d+`. A callsite's spelling chooses its sense. Versioning follows semver semantics: `theta <major>.<minor>` is the design scope of every `theta <major>.<minor>.<patch>` release sharing that `<major>.<minor>` prefix; the relation `theta 1.0 ⊇ theta 1.0.0` holds, so a claim that binds `theta 1.0` binds every concrete release the design scope admits including `theta 1.0.0`. The frozen-baseline literal does not by itself promise stability between adjacent patch releases under that scope — inter-release stability across `theta 1.0.x` is governed by [GOV-15](./source-language-stability.md#gov-15)'s source-language-equivalence release-process goal, not by this rule.

A *closed enumeration*, as used in the frozen-baseline literal definition above, is any spec-corpus enumeration whose intensional or extensional membership is asserted to be exhaustive at the publishing moment. This intensional exhaustive-membership test is the normative criterion: an enumeration is closed iff it asserts exhaustive membership at the publishing moment, regardless of the wording it uses to do so. Surface phrases such as "exactly N", "the closed set", "the N-element set", a count-bearing list ("the four hard ceilings", "the eight non-goals"), "loads cleanly under", "closed at", "frozen at", or a closed `details.kind` / `Err`-variant / discriminator inventory are non-binding illustrations of wording that typically signals the test is met; they neither extend nor restrict it. GOV-20's *closure heuristic* below consumes this intensional test.

<a id="gov-20"></a> **GOV-20 (legacy version-token aliases).** The legacy version tokens `V1`, `V1.0`, `V1.x`, and `V2` are governed aliases under the present rule. Each legacy token maps to the new naming scheme per the table below; the alias is in force at every callsite in the spec corpus until that callsite is converted to its alias-mapped spelling. Conversion is incremental — a future spec edit MAY convert any single legacy-token callsite without converting siblings, and the spec MAY carry mixed spellings during a transitional period with every untouched callsite governed by this rule.

| Legacy token | Maps to | Sense |
|---|---|---|
| `V1` | `theta 1.0` or `theta 1.0.0` | sense-overloaded — resolved per the *closure heuristic* below |
| `V1.0` | `theta 1.0` or `theta 1.0.0` | sense-overloaded — resolved per the *closure heuristic* below |
| `V1.x` | `theta 1.x` | design-scope only |
| `V2` | `theta 2.0` | design-scope only |

*Closure heuristic.* The legacy tokens `V1` and `V1.0` are sense-overloaded between design-scope and frozen-baseline. At a callsite where the surrounding sentence asserts exhaustive membership per GOV-19's *closed enumeration* intensional test above, the token aliases to `theta 1.0.0` (frozen-baseline). At every other callsite the token aliases to `theta 1.0` (design-scope). Default on ambiguity: `theta 1.0.0` — frozen-baseline is the stronger commitment, and design-scope claims subsume frozen-baseline claims.

*Persistence of the alias.* For prose tokens, the alias is *transitional* — once every prose callsite of a legacy token has been converted to its alias-mapped new-scheme spelling, that token's row above MAY be retired in a future edit that updates this table per GOV-7 / GOV-8 lifecycle. GOV-20 governs prose tokens only. There is no HTML-anchor alias machinery: the former `v1-*` dual-anchor convention (previously GOV-25 – GOV-29) was retired wholesale in the Theta rename — see *Retired HTML-anchor alias convention* at the end of this section.

*Out-of-scope tokens (GOV-20).* The following tokens are NOT governed by [GOV-20](#gov-20) and MUST NOT be classified as legacy version-token aliases:

- Pi SDK version literals (e.g. `~0.74.1`, `0.75.5`) — Pi-side `peerDependencies` versions, not theta versions.
- Node version literals (e.g. `>= 20.6.0`, `>= 22.19.0`) — runtime engine versions.
- Diagnostic codes (e.g. `theta/parse/non-string-enum-value`) — opaque tokens.
- Inline labels `HC3-a` … `HC3-e`, `NOCEIL-1` … `NOCEIL-4` (governed by GOV-16) and REQ-IDs `CIO-1` … `CIO-6` (governed by GOV-1 / GOV-3 / GOV-8 / GOV-9).
- `V8` (JavaScript engine).
- Plan-phase identifiers `V1` … `Vn` reserved by `docs/plan_topics/conventions.md:9` — these are plan-document identifiers governed by the plan's own conventions, and are out of the spec corpus's binding scope per [GOV-17](./corpus-direction-and-scope.md#gov-17) / [GOV-18](./corpus-direction-and-scope.md#gov-18). The plan-side `V1` … `Vn` reservation is unaffected by this rule.

### Retired HTML-anchor alias convention

<a id="retired-html-anchor-alias-convention"></a> The `v1-*` HTML-anchor dual-anchor convention — formerly GOV-25 (canonical-arm citation), GOV-26 (alias permanence), GOV-27 (dual-anchored intensional definition), GOV-28 (alias retirement discharge), and GOV-29 (cross-page canonical-arm uniqueness) — was **retired wholesale** in the Theta rename. Every legacy `<a id="v1-…">` alias arm was removed and every inbound `#v1-…` cross-reference repointed to the surviving `theta-1-0-*` canonical arm in the same pass, so no dual-anchor back-compat obligation remains. GOV-19 (naming scheme) and GOV-20 (prose-token aliases) are unaffected; only the HTML-anchor permanence machinery is gone. The retirement is recorded on [`anchor-scheme-and-retired.md`](./anchor-scheme-and-retired.md#retired-anchor-aliases).
