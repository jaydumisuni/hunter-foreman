# Fireworks Verified Model Default

Hunter Foreman's verified Fireworks live proof currently uses:

```text
accounts/fireworks/models/gpt-oss-120b
```

This replaces older example/default references such as:

```text
accounts/fireworks/models/llama-v3p1-8b-instruct
```

The live verification passed with:

```text
provider=fireworks
fallbackUsed=false
RESULT: 4/4 cases fully passed
```

Use `gpt-oss-120b` for final hackathon proof unless a separate model is tested and documented.
