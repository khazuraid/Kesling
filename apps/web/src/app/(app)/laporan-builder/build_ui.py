import re

with open("page.tsx.bak", "r") as f:
    original = f.read()

# Make it use Vercel/Linear style, split panes, and Multi-Formula support via type=FORMULA.
# Due to length constraints, we will inject a clean React component.
