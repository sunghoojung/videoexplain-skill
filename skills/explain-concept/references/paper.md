# Understand the paper before animating it

Accept a supplied PDF, an accessible paper URL, or pasted paper text. For a URL,
retrieve the actual paper and confirm its title and version. Prefer the primary
paper over secondary summaries. Keep its source URL alongside the local file.

Use native document tools or the bundled helper to read a local PDF:

```bash
node /path/to/explain-concept/scripts/explain-concept.mjs ingest \
  --paper paper.pdf --output paper-source --python /path/to/python
```

The helper extracts page-indexed text with pypdf and optionally renders preview
pages with Poppler. Read `paper.md` and `manifest.json`. PDF extraction can lose
equation symbols and column order. Inspect original pages containing the key
equations, figures, and results using the agent's document/image tools. Preview
pages are a starting point, not full visual coverage. For a scanned paper, use an
available OCR tool rather than treating empty extraction as an empty document.

Build a short source map while reading:

| Question | Evidence to locate |
|---|---|
| What problem is being solved? | Introduction and stated problem |
| What changes compared with the baseline? | Method and baseline definition |
| How does it work? | Algorithm, equations, architecture, or experimental mechanism |
| Why should the mechanism help? | Derivation or clearly marked hypothesis |
| What evidence supports the claim? | Experiment setup, metric, comparison, table/figure |
| Where does the claim stop? | Assumptions, limitations, and failure cases |

Explain the contribution in one sentence, then choose a small example that
demonstrates its mechanism. Reconstruct the key computation with actual values
where possible. Keep the invented teaching example separate from the paper's
reported experiment. Preserve axes, units, baseline, and evaluation conditions
when redrawing a result. Mark schematic diagrams and illustrative values.

Record section, PDF page, figure, or equation references for each sourced scene
in the project's `references` array. A claim that an approach is better must
retain what it was compared against and under which conditions. Do not turn an
ablation, benchmark result, or author hypothesis into a universal guarantee.

The teaching sequence usually follows problem, baseline, new mechanism, worked
example, evidence, and limits. Give the mechanism most of the time. The video
should help the viewer understand the paper, rather than narrate its section
headings. Adapt this sequence when a derivation or experiment needs another order.
