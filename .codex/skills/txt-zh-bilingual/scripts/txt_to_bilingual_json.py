#!/usr/bin/env python3
"""Convert an English .txt file to a bilingual JSON skeleton.

- Split text into sentences.
- Merge English sentences with fewer than N words into context.
- Output JSON array with {"en": ..., "zh": ""}.
"""

import argparse
import json
import re
from pathlib import Path


SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n+")
WORD_RE = re.compile(r"[A-Za-z0-9']+")


def split_sentences(text: str) -> list[str]:
    parts = SENTENCE_SPLIT_RE.split(text)
    sentences = []
    for part in parts:
        s = " ".join(part.strip().split())
        if s:
            sentences.append(s)
    return sentences


def count_words(sentence: str) -> int:
    return len(WORD_RE.findall(sentence))


def merge_short_sentences(sentences: list[str], min_words: int) -> list[str]:
    merged: list[str] = []
    i = 0
    while i < len(sentences):
        s = sentences[i]
        if count_words(s) < min_words:
            if merged:
                merged[-1] = f"{merged[-1].rstrip()} {s.lstrip()}".strip()
            elif i + 1 < len(sentences):
                sentences[i + 1] = f"{s.rstrip()} {sentences[i + 1].lstrip()}".strip()
            else:
                merged.append(s)
        else:
            merged.append(s)
        i += 1
    return merged


def build_items(sentences: list[str]) -> list[dict[str, str]]:
    return [{"en": s, "zh": ""} for s in sentences]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Split English txt into bilingual JSON skeleton.",
    )
    parser.add_argument("input", type=Path, help="Path to .txt file")
    parser.add_argument(
        "--min-words",
        type=int,
        default=5,
        help="Merge sentences with fewer than this many words",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Optional output .json path (default: same name as input)",
    )
    args = parser.parse_args()

    text = args.input.read_text(encoding="utf-8")
    sentences = split_sentences(text)
    sentences = merge_short_sentences(sentences, args.min_words)
    items = build_items(sentences)

    output_path = args.output or args.input.with_suffix(".json")
    output_path.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
