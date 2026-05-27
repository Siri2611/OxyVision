import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Backgrounds
content = content.replace('bg-neutral-50', 'bg-[#0a0a0a]')
content = content.replace('bg-white', 'bg-[#121212]')
content = content.replace('bg-neutral-100', 'bg-[#1e1e1e]')

# Borders
content = content.replace('border-neutral-200', 'border-[#2a2a2a]')
content = content.replace('border-neutral-100', 'border-[#2a2a2a]')
content = content.replace('border-transparent hover:bg-neutral-50 hover:border-neutral-100', 'border-transparent hover:bg-[#1a1a1a] hover:border-[#2a2a2a]')

# Text colors
content = content.replace('text-neutral-900', 'text-zinc-100')
content = content.replace('text-neutral-700', 'text-zinc-300')
content = content.replace('text-neutral-600', 'text-zinc-400')
content = content.replace('text-neutral-500', 'text-zinc-500')
content = content.replace('text-neutral-400', 'text-zinc-600')

# Indigo
content = content.replace('text-indigo-600', 'text-indigo-400')
content = content.replace('text-indigo-800', 'text-indigo-300')
content = content.replace('bg-indigo-50/30', 'bg-indigo-900/20')
content = content.replace('bg-indigo-200', 'bg-indigo-900/50')
content = content.replace('bg-indigo-50/50', 'bg-[#0f0f15]')

# Hardware Panel / Status Colors
content = content.replace('bg-green-50', 'bg-green-950/40')
content = content.replace('border-green-200', 'border-green-900/50')
content = content.replace('text-green-700', 'text-green-400')

content = content.replace('bg-amber-50', 'bg-amber-950/40')
content = content.replace('border-amber-200', 'border-amber-900/50')
content = content.replace('text-amber-700', 'text-amber-400')

content = content.replace('bg-red-50', 'bg-red-950/40')
content = content.replace('border-red-200', 'border-red-900/50')
content = content.replace('text-red-700', 'text-red-400')

# Inputs
content = content.replace('bg-neutral-50 border border-neutral-200', 'bg-[#0a0a0a] border border-[#2a2a2a]')

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
