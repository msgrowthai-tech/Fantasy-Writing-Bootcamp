"""Preserve workbook values/formulas privately; never put source data in the public bundle."""
import argparse,datetime,json,pathlib,hashlib
import openpyxl
p=argparse.ArgumentParser();p.add_argument('--finance',required=True);p.add_argument('--contacts',required=True);a=p.parse_args()
def clean(v):
 if isinstance(v,(datetime.datetime,datetime.date)):return v.isoformat()
 if hasattr(v,"text"):return {"text":v.text,"ref":v.ref}
 return v
def read(path):
 w=openpyxl.load_workbook(path,data_only=True);f=openpyxl.load_workbook(path,data_only=False)
 out={}
 for s in w:
  rows=[]
  for n,row in enumerate(s.values,1):
   if not any(v is not None and v!='' for v in row):continue
   rows.append({'row':n,'values':[clean(v) for v in row],'formulas':{str(c.column):clean(c.value) for c in f[s.title][n] if c.data_type=='f'}})
  out[s.title]=rows
 return {'sha256':hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest(),'filename':pathlib.Path(path).name,'sheets':out}
d={'importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'asOf':'2026-11-10','finance':read(a.finance),'contacts':read(a.contacts)}
pathlib.Path('.local').mkdir(exist_ok=True);pathlib.Path('.local/source.json').write_text(json.dumps(d,ensure_ascii=False))
print('Imported',len(d['finance']['sheets']),'financial tabs and',len(d['contacts']['sheets']['Contacts'])-1,'contacts into private local storage.')
