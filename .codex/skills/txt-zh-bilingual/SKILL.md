---
name: txt-zh-bilingual
description: Translate English .txt files into Chinese and produce sentence-aligned bilingual JSON with merging of short English sentences. Use when asked to batch-convert text files into [{"en","zh"}] arrays, split/merge sentences, or generate JSON alongside original .txt files.
---

# Txt Zh Bilingual

## Overview

Convert English `.txt` files into bilingual JSON arrays, with sentence splitting, merging of short English sentences, and Chinese translation for each aligned segment.

## Workflow

### 1. Prepare sentence segments (AI-guided)

Read the `.txt` file and manually build sentence segments in context instead of relying on the script. The source text may contain line breaks, captions, or fragments that are not full sentences, so reconstruct coherent English sentences before translation.

Guidelines:
- Merge fragments split by newlines into complete sentences when they belong together.
- Preserve intentional short lines only when they are standalone utterances (e.g., sound cues, one-word reactions, quoted asides).
- If a line is obviously a continuation (starts with conjunctions like "and", "but", "so", or lowercase), merge it into the previous segment.
- If punctuation is missing but the meaning clearly continues, merge until the thought completes.
- Keep each `en` segment concise; split long sentences if they become unwieldy for translation.

Create a JSON array where each object has `en` filled and `zh` empty.

### 2. Translate each segment

Fill each `zh` field with a faithful Chinese translation of its corresponding `en` field. Keep meaning, tone, and technical terms consistent across the file.

### 3. Validate output format

Ensure the JSON is an array of objects like:

```json
[
  {"en": "Example sentence.", "zh": "示例句子。"}
]
```

## Scripts (optional)

- `scripts/txt_to_bilingual_json.py`: Use only when the input is clean, well-punctuated prose. Avoid for transcript-style text with broken lines or fragmentary captions.
