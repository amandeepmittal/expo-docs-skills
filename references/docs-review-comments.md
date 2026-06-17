# Docs Review — Comment Body Format

How to write the `body` field of each finding so the severity is scannable and the fix is one-click-applicable when possible. The body renders on GitHub's Files Changed tab.

## First line: severity tag and rule reference

Every body starts with the severity tag and the rule reference. Format:

```
**[<severity>]** <explanation> (`<rule-ref>`).
```

The severity tag at the top of the comment is the classification. Do not justify the severity choice in prose ("Suggestion rather than design because...") — that's noise on top of the tag.

## When the fix is a literal replacement

When the fix is a literal replacement of one or more contiguous lines, follow the first line with a GitHub `suggestion` block. GitHub renders it as a green/red diff with a one-click **Commit suggestion** button:

````
**[nit]** File and directory names should be bold, not inline code (`style-guide.md#formatting-and-structure`). The same file follows this rule on line 69.

```suggestion
**android/gradle.properties**
```
````

The fence language must be exactly `suggestion`. Other fence languages render as regular code blocks without an apply button.

## When the fix needs judgment

When the fix needs judgment (split a sentence, restructure a paragraph, rewrite a heading) but you can still write the concrete replacement, use a `suggestion` block. The author can edit before applying.

Use a prose-only comment (no `suggestion` block) only when you genuinely cannot write the concrete replacement. Example:

```
**[suggestion]** Sentence is 28 words with a nested parenthetical and a compound condition (`style-guide.md#voice-and-tone`). Consider splitting into two shorter sentences so the parallel between the two clauses lands on first read.
```

## Multi-line suggestion blocks

When the replacement spans more than one line in the head file, set `start_line` to the first line of the range and `line` to the last. Both must be on the same side (`start_side: "RIGHT"`, `side: "RIGHT"`). The `suggestion` block then replaces the entire `start_line`-through-`line` range with its contents, and GitHub still renders a single **Commit suggestion** button. Without `start_line`, the suggestion only replaces the single line at `line` — usually wrong for fixes like swapping a fenced code block for a `Terminal` component, or folding a colon + bullet into a paragraph.

