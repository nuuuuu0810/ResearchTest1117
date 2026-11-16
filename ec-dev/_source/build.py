import re, pathlib, shutil
HERE = pathlib.Path(__file__).resolve().parent
S = HERE; D = HERE.parent
D.mkdir(exist_ok=True)
css = (S/'common.css').read_text(); js = (S/'common.js').read_text()
for p in sorted((S/'pages').glob('*.html')):
    t = p.read_text()
    title = re.search(r'<!--\s*title:\s*(.*?)\s*-->', t).group(1)
    styles = '\n'.join(re.findall(r'<style>(.*?)</style>', t, re.S))
    scripts = '\n'.join(re.findall(r'<script>(.*?)</script>', t, re.S))
    body = re.sub(r'<!--\s*title:.*?-->|<style>.*?</style>|<script>.*?</script>', '', t, flags=re.S).strip()
    out = f'''<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
{css}
/* ===== このページ固有のスタイル ===== */
{styles}
</style>
</head>
<body>
<div id="pg"><main id="app">
{body}
</main></div>
<script>
{js}
</script>
<script>
/* ===== このページ固有の処理 ===== */
{scripts}
</script>
</body>
</html>
'''
    (D/p.name).write_text(out)
shutil.copy(S/'main.html', D/'main.html')
shutil.copy(S/'icon.png', D/'icon.png')
idx = (S/'index.html').read_text().replace('コンピュータとプログラミング　ソート', 'システム開発体験 ECサイトをつくろう')
(D/'index.html').write_text(idx)
print('built', len(list(D.glob('*.html'))))
