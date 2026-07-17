import sys

path = r'c:\DEV\documentacao-syspro\apps\web\content\docs\admin\documentacao-portal\banco-dados\index.mdx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    'Ã§Ãµes': 'ções',
    'Ã§Ã£o': 'ção',
    'Ã§': 'ç',
    'Ã£': 'ã',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã³': 'ó',
    'Ã­': 'í',
    'Ãª': 'ê',
    'Ã¢': 'â',
    'Ãº': 'ú',
    'â€”': '—',
    'â†’': '→',
    'â”œâ”€â”€': '├──',
    'â””â”€â”€': '└──',
    'â”‚': '│',
    'domiÂ­nio': 'domínio',
    'domi­nio': 'domínio',
    'Ãndices': 'Índices'
}

for k, v in replacements.items():
    text = text.replace(k, v)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

with open(path, 'r', encoding='utf-8') as f:
    print("".join(f.readlines()[:15]))
