---
name: txt-zh-bilingual
description: Translate English .txt files into Chinese and produce sentence-aligned bilingual JSON with merging of short English sentences. Use when asked to batch-convert text files into [{"en","zh"}] arrays, split/merge sentences, or generate JSON alongside original .txt files.
---

# Txt Zh Bilingual

## Overview

Convert English `.txt` files into bilingual JSON arrays, with sentence splitting, merging of short English sentences, and Chinese translation for each aligned segment.

## Workflow

### 1. Prepare sentence segments

Run the helper script to split and merge English sentences, producing a JSON skeleton with empty `zh` fields.

```bash
python3 scripts/txt_to_bilingual_json.py path/to/file.txt
```

Notes:
- The output file is created next to the input with the same basename and `.json` extension.
- Sentences with fewer than 5 words are merged into the previous sentence; if there is no previous sentence, they merge into the next one.
- Adjust the threshold when needed: `--min-words 5`.

### 2. Translate each segment

Fill each `zh` field with a faithful Chinese translation of its corresponding `en` field. Keep meaning, tone, and technical terms consistent across the file.

### 3. Validate output format

Ensure the JSON is an array of objects like:

```json
[
  {"en": "Example sentence.", "zh": "示例句子。"}
]
```

## Scripts

- `scripts/txt_to_bilingual_json.py`: Split/merge sentences and generate the bilingual JSON skeleton.
