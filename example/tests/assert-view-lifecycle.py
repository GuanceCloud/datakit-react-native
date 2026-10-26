"""Assert live collector evidence, not mocked lifecycle callbacks."""
import json
import re
import sys
from pathlib import Path

records = [json.loads(line) for line in Path(sys.argv[1]).read_text().splitlines()]
markers = [json.loads(r['body']) for r in records if r.get('path') == '/marker']
assert not any(m['event'] in ('JS_STOP_VIEW', 'ERROR') for m in markers), markers
results = {}
for platform in ('ios', 'android'):
    views = []
    for r in records:
        for line in r.get('body', '').splitlines():
            if not line.startswith('view,') or f'view_name=RuntimeAuto-{platform}' not in line:
                continue
            views.append({
                'id': re.search(r'(?:^|,)view_id=([^, ]+)', line).group(1),
                'active': re.search(r'is_active=(true|false)', line).group(1) == 'true',
                'loading': re.search(r'(?:[ ,])loading_time=([^, ]+)', line),
                'received': r['received_at'],
            })
    closed = next(v for v in reversed(views) if not v['active'])
    assert any(v['active'] and v['id'] == closed['id'] and v['received'] < closed['received'] for v in views), platform
    resumed = next(v for v in views if v['active'] and v['received'] > closed['received'])
    assert resumed['id'] != closed['id'], platform
    assert resumed['loading'] is None, platform
    background = [m for m in markers if m['platform'] == platform and m.get('state') == 'background' and m['at'] / 1000 < closed['received']]
    foreground = [m for m in markers if m['platform'] == platform and m.get('state') == 'active' and closed['received'] < m['at'] / 1000 <= resumed['received']]
    assert background and foreground, platform
    results[platform] = {'closed_view_id': closed['id'], 'resumed_view_id': resumed['id'], 'js_stop_count': 0, 'reused_loading': False}
print(json.dumps(results, indent=2))
