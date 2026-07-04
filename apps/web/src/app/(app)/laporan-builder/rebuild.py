import re

with open("page.tsx.bak", "r") as f:
    text = f.read()

# Make it Vercel style split pane, keep dropdown Format Input Data
text = re.sub(
    r'<div className="w-full lg:w-[280px] bg-white border-r border-neutral-200 flex flex-col">',
    '<div className="w-[280px] shrink-0 bg-neutral-50/50 border-r border-neutral-100 flex flex-col">',
    text
)

text = re.sub(
    r'className="w-full text-xs h-9 px-3 border border-neutral-200 outline-none focus:border-black rounded-lg"',
    'className="w-full text-xs h-9 px-3 border border-neutral-200 bg-white outline-none focus:border-black"',
    text
)

# Convert format input select rounded
text = re.sub(
    r'<select([^>]+)rounded-lg([^>]+)>',
    r'<select\1\2>',
    text
)

with open("page.tsx", "w") as f:
    f.write(text)
