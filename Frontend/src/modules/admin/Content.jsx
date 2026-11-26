import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { api, inr, SIGNS } from '../../lib/api.js';
import { Badge, Button, Field, Modal, PageLoader, Select, TextArea, useAsync, useToast } from '../../shared/ui.jsx';
import { ImageInput, Panel, Table, Tabs } from './kit.jsx';

/* Generic CRUD panel for banners / reports / remedies */
function Crud({ title, path, fields, cols, blank }) {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.admin.get(path), [path]);
  const [edit, setEdit] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    try { edit._id ? await api.admin.put(`${path}/${edit._id}`, edit) : await api.admin.post(path, edit); toast('Saved', 'success'); setEdit(null); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  const del = async (r) => { if (!window.confirm('Delete this item?')) return; try { await api.admin.del(`${path}/${r._id}`); reload(); } catch (err) { toast(err.message, 'error'); } };
  const toggle = async (r) => { try { await api.admin.put(`${path}/${r._id}`, { active: !r.active }); reload(); } catch (err) { toast(err.message, 'error'); } };
  return (
    <Panel title={title} action={<Button size="sm" onClick={() => setEdit(blank)}><Plus size={14} /> Add</Button>}>
      {loading && !data ? <PageLoader variant="table" /> : <Table rows={data} cols={[...cols, { h: 'Active', cell: (r) => <button onClick={() => toggle(r)}><Badge tone={r.active ? 'green' : 'slate'}>{r.active ? 'on' : 'off'}</Badge></button> }, { h: '', right: true, cell: (r) => <div className="flex justify-end gap-1.5"><Button size="sm" variant="outline" onClick={() => setEdit(r)}><Pencil size={13} /></Button><Button size="sm" variant="danger" onClick={() => del(r)}><Trash2 size={13} /></Button></div> }]} />}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? `Edit ${title}` : `New ${title}`}>
        {edit && <form onSubmit={save} className="space-y-3">
          {fields.map(({ k, label, type, options }) => type === 'image' ? <ImageInput key={k} label={label} value={edit[k]} onChange={(v) => setEdit({ ...edit, [k]: v })} aspect="aspect-square" /> : type === 'textarea' ? <TextArea key={k} label={label} rows={3} value={edit[k] || ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /> : type === 'select' ? <Select key={k} label={label} value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}>{options.map((o) => <option key={o}>{o}</option>)}</Select> : <Field key={k} label={label} type={type || 'text'} value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: type === 'number' ? +e.target.value : e.target.value })} required={k === 'title'} />)}
          <Button type="submit" className="w-full">Save</Button>
        </form>}
      </Modal>
    </Panel>
  );
}

function Horoscopes() {
  const toast = useToast();
  const { data, reload } = useAsync(() => api.admin.get('/admin/horoscopes'));
  const [f, setF] = useState({ sign: 'Aries', period: 'daily', text: '', lucky: { color: '', number: 1 }, scores: { love: 80, career: 80, health: 80, money: 80 } });
  const save = async (e) => {
    e.preventDefault();
    try { await api.admin.put('/admin/horoscopes', f); toast('Horoscope published', 'success'); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  const generate = async () => {
    const overwrite = window.confirm('Overwrite ALL existing horoscopes with fresh drafts?\n\nOK = overwrite everything\nCancel = only fill missing ones');
    try { const r = await api.admin.post('/admin/horoscopes/generate', { overwrite }); toast(`${r.created} horoscopes generated`, 'success'); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  const load = (h) => setF({ sign: h.sign, period: h.period, text: h.text, lucky: h.lucky, scores: h.scores });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Edit horoscope">
        <form onSubmit={save} className="space-y-3 p-4">
          <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-800">The user app shows only what is published here (12 signs x daily/weekly/monthly). Pick a row on the right to edit it, or use "Generate drafts" to fill missing ones, then edit.</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Sign" value={f.sign} onChange={(e) => setF({ ...f, sign: e.target.value })}>{SIGNS.map((s) => <option key={s}>{s}</option>)}</Select>
            <Select label="Period" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })}><option>daily</option><option>weekly</option><option>monthly</option></Select>
          </div>
          <TextArea label="Prediction" rows={5} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lucky colour" value={f.lucky.color} onChange={(e) => setF({ ...f, lucky: { ...f.lucky, color: e.target.value } })} />
            <Field label="Lucky number" type="number" value={f.lucky.number} onChange={(e) => setF({ ...f, lucky: { ...f.lucky, number: +e.target.value } })} />
            {Object.keys(f.scores).map((k) => <Field key={k} label={`${k} %`} type="number" min={0} max={100} value={f.scores[k]} onChange={(e) => setF({ ...f, scores: { ...f.scores, [k]: +e.target.value } })} />)}
          </div>
          <Button type="submit" className="w-full">Publish</Button>
        </form>
      </Panel>
      <Panel title={`Published horoscopes (${data?.length || 0}/36)`} action={<Button size="sm" variant="outline" onClick={generate}>Generate drafts</Button>}>
        <Table rows={data} empty="Nothing published yet - click Generate drafts" cols={[
          { h: 'Sign', cell: (h) => h.sign }, { h: 'Period', cell: (h) => h.period }, { h: 'Text', cell: (h) => <span className="line-clamp-1 max-w-[14rem] text-xs">{h.text}</span> },
          { h: '', right: true, cell: (h) => <div className="flex justify-end gap-1.5"><Button size="sm" variant="outline" onClick={() => load(h)}><Pencil size={13} /></Button><Button size="sm" variant="danger" onClick={async () => { try { await api.admin.del(`/admin/horoscopes/${h._id}`); reload(); } catch (err) { toast(err.message, 'error'); } }}><Trash2 size={13} /></Button></div> },
        ]} />
      </Panel>
    </div>
  );
}

// Home posters are managed in Settings > App Management.
export default function Content() {
  const [tab, setTab] = useState('horoscope');
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[['horoscope', 'Horoscope'], ['reports', 'Paid reports'], ['remedies', 'Remedies']]} />
      {tab === 'horoscope' && <Horoscopes />}
      {tab === 'reports' && <Crud title="Report" path="/admin/reports" blank={{ title: '', category: '', description: '', price: 299, active: true }}
        fields={[{ k: 'title', label: 'Title' }, { k: 'category', label: 'Category' }, { k: 'description', label: 'Description', type: 'textarea' }, { k: 'price', label: 'Price (₹)', type: 'number' }, { k: 'imageUrl', label: 'Card image (home screen)', type: 'image' }]}
        cols={[{ h: 'Title', cell: (r) => <span className="flex items-center gap-2">{r.imageUrl && <img src={r.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />}<b className="text-slate-900">{r.title}</b></span> }, { h: 'Category', cell: (r) => r.category }, { h: 'Price', cell: (r) => inr(r.price) }]} />}
      {tab === 'remedies' && <Crud title="Remedy" path="/admin/remedies" blank={{ title: '', category: '', description: '', price: 499, active: true }}
        fields={[{ k: 'title', label: 'Title' }, { k: 'category', label: 'Category' }, { k: 'description', label: 'Description', type: 'textarea' }, { k: 'price', label: 'Price (₹)', type: 'number' }, { k: 'imageUrl', label: 'Card image (home screen)', type: 'image' }]}
        cols={[{ h: 'Title', cell: (r) => <span className="flex items-center gap-2">{r.imageUrl && <img src={r.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />}<b className="text-slate-900">{r.title}</b></span> }, { h: 'Category', cell: (r) => r.category }, { h: 'Price', cell: (r) => inr(r.price) }]} />}
    </>
  );
}
