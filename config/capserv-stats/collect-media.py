import subprocess,json,pathlib,datetime,os,urllib.parse
base=pathlib.Path(os.environ.get('POSTIZ_DIR','.'))/'data';out=base/'postiz-config/capserv-stats/cadence-media.json';uploads=(base/'postiz-uploads').resolve()
rows=json.loads(subprocess.check_output(['docker','exec','postiz','node','/config/capserv-stats/export-media.cjs'],timeout=40));items={}
try: old=json.loads(out.read_text()).get('items',{})
except (OSError,ValueError): old={}
for row in rows:
 try:
  u=urllib.parse.urlparse(json.loads(row['image'])[0]['path'])
  if u.hostname!=urllib.parse.urlparse(os.environ.get('POSTIZ_URL','')).hostname or not u.path.startswith('/uploads/'): continue
  path=(uploads/urllib.parse.unquote(u.path[len('/uploads/'):])).resolve()
  if not path.is_relative_to(uploads) or not path.is_file():continue
  stamp=f'{path.stat().st_size}:{path.stat().st_mtime_ns}'
  if old.get(row['key'],{}).get('stamp')==stamp:items[row['key']]=old[row['key']];continue
  meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height:format=duration','-of','json',str(path)],timeout=20))
  v=meta['streams'][0];items[row['key']]={'width':v['width'],'height':v['height'],'duration':float(meta['format']['duration']),'stamp':stamp}
 except (OSError,ValueError,KeyError,IndexError,subprocess.SubprocessError):continue
payload={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'items':items};tmp=out.with_suffix('.tmp');tmp.write_text(json.dumps(payload));tmp.chmod(0o600);os.replace(tmp,out)
print(json.dumps({'formats':len(items),'checkedAt':payload['checkedAt']}))
