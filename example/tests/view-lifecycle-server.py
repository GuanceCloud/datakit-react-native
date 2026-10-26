from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading, time, json, gzip, zlib, urllib.parse
from pathlib import Path
log=Path('/tmp/rn-view-runtime-events.jsonl')
lock=threading.Lock()
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def record(self,data):
  with lock:
   with log.open('a') as f: f.write(json.dumps({'received_at':time.time(),**data})+'\n')
 def do_GET(self):
  if self.path.startswith('/status'): content=b'packager-status:running'
  elif '.bundle' in self.path:
   platform=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('platform',['ios'])[0]
   content=Path('/tmp/rn-view-test-'+platform+'.bundle').read_bytes()
   self.record({'bundle':platform})
  else: content=b'{}'
  self.send_response(200); self.send_header('Content-Type','application/javascript' if '.bundle' in self.path else 'text/plain'); self.send_header('Content-Length',str(len(content))); self.end_headers(); self.wfile.write(content)
 def do_POST(self):
  if self.headers.get('Transfer-Encoding','').lower()=='chunked':
   chunks=[]
   while True:
    size=int(self.rfile.readline().split(b';')[0].strip(),16)
    if not size:
     self.rfile.readline(); break
    chunks.append(self.rfile.read(size)); self.rfile.read(2)
   data=b''.join(chunks)
  else: data=self.rfile.read(int(self.headers.get('Content-Length',0)))
  if self.headers.get('Content-Encoding')=='gzip': data=gzip.decompress(data)
  if data.startswith(b'\x78'):
   try: data=zlib.decompress(data)
   except zlib.error: pass
  self.record({'path':self.path,'body':data.decode('utf-8',errors='replace')})
  self.send_response(200); self.end_headers(); self.wfile.write(b'{}')
for port in [8081,8765]:
 threading.Thread(target=ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever,daemon=True).start()
print('ready',flush=True)
threading.Event().wait()
