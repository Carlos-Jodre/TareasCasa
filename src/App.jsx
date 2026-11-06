import { useEffect, useState } from 'react'
import {
  collection, doc, addDoc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const num = s => {
  const n = parseFloat(String(s).replace(',', '.'))
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}
const store = {
  get: () => { try { return localStorage.getItem('casa') } catch { return null } },
  set: c => { try { localStorage.setItem('casa', c) } catch {} },
  del: () => { try { localStorage.removeItem('casa') } catch {} }
}

export default function App() {
  const [code, setCode] = useState(() => {
    const p = new URLSearchParams(location.search).get('casa')
    if (p) { store.set(p); history.replaceState(null, '', location.pathname); return p }
    return store.get()
  })
  if (!code) return <Welcome onCode={c => { store.set(c); setCode(c) }} />
  return <Casa code={code} onLeave={() => { store.del(); setCode(null) }} />
}

function Welcome({ onCode }) {
  const [join, setJoin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function crear() {
    setBusy(true); setErr('')
    try {
      const c = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
      await setDoc(doc(db, 'casas', c), { c: Date.now() })
      const b = writeBatch(db)
      ;[['Lavar los platos', 0.5], ['Sacar la basura', 0.3], ['Pasar la aspiradora', 1]].forEach(([name, value], i) =>
        b.set(doc(collection(db, 'casas', c, 'tareas')), { name, value, c: Date.now() + i }))
      await b.commit()
      onCode(c)
    } catch (e) { setErr('No se pudo crear la casa (' + (e.code || 'error') + '). Revisa la configuración de Firebase.'); setBusy(false) }
  }
  async function unirme() {
    const c = join.trim()
    if (!c) return
    setBusy(true); setErr('')
    try {
      const s = await getDoc(doc(db, 'casas', c))
      if (s.exists()) onCode(c)
      else { setErr('No existe ninguna casa con ese código.'); setBusy(false) }
    } catch (e) { setErr('No se pudo comprobar el código (' + (e.code || 'error') + ').'); setBusy(false) }
  }
  return (
    <main className="welcome">
      <div><h1>Tareas de casa</h1><p className="sub">Reparte las tareas, apunta quién las hace y lleva la cuenta en euros.</p></div>
      <div className="card">
        <b>Primera vez</b>
        <p className="sub">Crea la casa y luego comparte el enlace con tu familia.</p>
        <button className="pri" disabled={busy} onClick={crear}>Crear casa</button>
      </div>
      <div className="card">
        <b>Ya tengo un código</b>
        <div className="add">
          <input className="t" placeholder="Código de la casa" value={join} onChange={e => setJoin(e.target.value)} onKeyDown={e => e.key === 'Enter' && unirme()} />
          <button className="pri" disabled={busy} onClick={unirme}>Unirme</button>
        </div>
      </div>
      {err && <div className="card">{err}</div>}
    </main>
  )
}

function Casa({ code, onLeave }) {
  const [tareas, setT] = useState([])
  const [personas, setP] = useState([])
  const [regs, setR] = useState([])
  const [sel, setSel] = useState(null)
  const [editing, setEditing] = useState(null)
  const [armed, setArmed] = useState(null)
  const [msg, setMsg] = useState('')
  const [nt, setNt] = useState(''); const [nv, setNv] = useState(''); const [np, setNp] = useState('')
  const [en, setEn] = useState(''); const [ev, setEv] = useState('')

  useEffect(() => {
    const sub = (n, set) => onSnapshot(
      collection(db, 'casas', code, n),
      s => set(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.c || a.ts || 0) - (b.c || b.ts || 0))),
      e => setMsg('Error de conexión (' + e.code + ').')
    )
    const u = [sub('tareas', setT), sub('personas', setP), sub('registros', setR)]
    return () => u.forEach(f => f())
  }, [code])

  const ref = (n, id) => doc(db, 'casas', code, n, id)
  const run = p => Promise.resolve(p).catch(e => setMsg('No se pudo guardar (' + (e.code || 'error') + ').'))
  const arm = k => { setArmed(k); setTimeout(() => setArmed(a => (a === k ? null : a)), 3000) }
  const twice = (k, fn) => { if (armed === k) { setArmed(null); fn() } else arm(k) }

  const pOf = id => personas.find(p => p.id === id)
  const mine = pid => regs.filter(l => l.pid === pid && l.ts > ((pOf(pid) || {}).resetAt || 0))
  const bal = pid => Math.round(mine(pid).reduce((a, l) => a + l.value, 0) * 100) / 100
  const done = l => { const p = pOf(l.pid); return !!p && l.ts <= (p.resetAt || 0) }
  const total = personas.reduce((a, p) => a + bal(p.id), 0)
  const selP = pOf(sel)

  async function compartir() {
    const url = location.origin + '/?casa=' + code
    try {
      if (navigator.share) await navigator.share({ title: 'Tareas de casa', url })
      else { await navigator.clipboard.writeText(url); setMsg('Enlace copiado. Envíalo a tu familia.') }
    } catch {}
  }
  const resetOne = id => run(updateDoc(ref('personas', id), { resetAt: Date.now() }))
  const resetAll = () => { const b = writeBatch(db), n = Date.now(); personas.forEach(p => b.update(ref('personas', p.id), { resetAt: n })); run(b.commit()) }
  const delPerson = id => {
    const b = writeBatch(db)
    regs.filter(l => l.pid === id).forEach(l => b.delete(ref('registros', l.id)))
    b.delete(ref('personas', id)); run(b.commit())
  }
  const addT = () => { const x = num(nv); if (nt.trim() && x !== null) { run(addDoc(collection(db, 'casas', code, 'tareas'), { name: nt.trim(), value: x, c: Date.now() })); setNt(''); setNv('') } }
  const addP = () => { if (np.trim()) { run(addDoc(collection(db, 'casas', code, 'personas'), { name: np.trim(), c: Date.now() })); setNp('') } }
  const saveT = id => { const x = num(ev); if (en.trim() && x !== null) { run(updateDoc(ref('tareas', id), { name: en.trim(), value: x })); setEditing(null) } }
  const saveP = id => { if (en.trim()) { run(updateDoc(ref('personas', id), { name: en.trim() })); setEditing(null) } }
  const log = t => selP && run(addDoc(collection(db, 'casas', code, 'registros'), { pid: sel, name: t.name, value: t.value, ts: Date.now() }))

  const enter = (e, fn) => e.key === 'Enter' && fn()

  return (
    <main>
      {msg && <div className="card msg" onClick={() => setMsg('')}>{msg}</div>}
      <div className="bar">
        <div><h1>Tareas de casa</h1><p className="sub">Pendiente de pagar en total: <b>{eur.format(total)}</b></p></div>
        <div className="bar">
          <button onClick={compartir}>Compartir</button>
          {personas.length > 1 && <button className={'dan ' + (armed === 'all' ? 'armed' : '')} onClick={() => twice('all', resetAll)}>{armed === 'all' ? '¿Confirmar?' : 'Poner todos a 0 €'}</button>}
        </div>
      </div>

      <h2>Acumulado por persona</h2>
      {personas.length ? (
        <div className="grid">
          {personas.map(p => (
            <div key={p.id} className={'card person ' + (p.id === sel ? 'sel' : '')} onClick={() => setSel(p.id)}>
              <b>{p.name}</b>
              <div className="big">{eur.format(bal(p.id))}</div>
              <div className="mut">{mine(p.id).length} tarea{mine(p.id).length === 1 ? '' : 's'} desde el último cero</div>
              <div style={{ marginTop: 8 }}>
                <button className={'dan ' + (armed === 'r' + p.id ? 'armed' : '')} onClick={e => { e.stopPropagation(); twice('r' + p.id, () => resetOne(p.id)) }}>{armed === 'r' + p.id ? '¿Confirmar?' : 'Poner a 0 €'}</button>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty">Añade a la primera persona más abajo, en «Personas».</div>}

      <h2>Registrar tarea hecha</h2>
      <p className="sub">{selP ? <>Registrando para <b>{selP.name}</b>. Toca una tarea:</> : 'Toca primero una persona y luego la tarea.'}</p>
      {tareas.length ? (
        <div className="grid">
          {tareas.map(t => <button key={t.id} className="task" disabled={!selP} onClick={() => log(t)}>{t.name}<b>+ {eur.format(t.value)}</b></button>)}
        </div>
      ) : <div className="empty">No hay tareas todavía.</div>}

      <h2>Tareas y valores</h2>
      <div className="card">
        {tareas.map(t => editing === 't' + t.id ? (
          <div className="row" key={t.id}>
            <input className="t" value={en} onChange={e => setEn(e.target.value)} onKeyDown={e => enter(e, () => saveT(t.id))} />
            <input className="v" inputMode="decimal" value={ev} onChange={e => setEv(e.target.value)} onKeyDown={e => enter(e, () => saveT(t.id))} /> €
            <button className="pri" onClick={() => saveT(t.id)}>Guardar</button>
            <button onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        ) : (
          <div className="row" key={t.id}>
            <span className="n">{t.name}</span><b>{eur.format(t.value)}</b>
            <button onClick={() => { setEditing('t' + t.id); setEn(t.name); setEv(String(t.value).replace('.', ',')) }}>Editar</button>
            <button className={'dan ' + (armed === 't' + t.id ? 'armed' : '')} onClick={() => twice('t' + t.id, () => run(deleteDoc(ref('tareas', t.id))))}>{armed === 't' + t.id ? '¿Seguro?' : 'Quitar'}</button>
          </div>
        ))}
        <div className="add">
          <input className="t" placeholder="Nueva tarea" value={nt} onChange={e => setNt(e.target.value)} onKeyDown={e => enter(e, addT)} />
          <input className="v" inputMode="decimal" placeholder="Valor €" value={nv} onChange={e => setNv(e.target.value)} onKeyDown={e => enter(e, addT)} />
          <button className="pri" onClick={addT}>Añadir</button>
        </div>
      </div>

      <h2>Personas</h2>
      <div className="card">
        {personas.map(p => editing === 'p' + p.id ? (
          <div className="row" key={p.id}>
            <input className="t" value={en} onChange={e => setEn(e.target.value)} onKeyDown={e => enter(e, () => saveP(p.id))} />
            <button className="pri" onClick={() => saveP(p.id)}>Guardar</button>
            <button onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        ) : (
          <div className="row" key={p.id}>
            <span className="n">{p.name}</span>
            <button onClick={() => { setEditing('p' + p.id); setEn(p.name) }}>Editar</button>
            <button className={'dan ' + (armed === 'p' + p.id ? 'armed' : '')} onClick={() => twice('p' + p.id, () => delPerson(p.id))}>{armed === 'p' + p.id ? '¿Seguro?' : 'Quitar'}</button>
          </div>
        ))}
        <div className="add">
          <input className="t" placeholder="Nueva persona" value={np} onChange={e => setNp(e.target.value)} onKeyDown={e => enter(e, addP)} />
          <button className="pri" onClick={addP}>Añadir</button>
        </div>
      </div>

      <h2>Historial reciente</h2>
      <div className="card">
        {regs.length ? [...regs].reverse().slice(0, 30).map(l => {
          const p = pOf(l.pid)
          return (
            <div className={'row ' + (done(l) ? 'done' : '')} key={l.id}>
              <span className="n">{p ? p.name : '—'} · {l.name}
                <div className="mut">{new Date(l.ts).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}{done(l) ? ' · puesto a 0' : ''}</div>
              </span>
              <b>{eur.format(l.value)}</b>
              <button className="dan" onClick={() => run(deleteDoc(ref('registros', l.id)))}>Deshacer</button>
            </div>
          )
        }) : <div className="empty">Aún no hay registros.</div>}
      </div>

      <p className="mut" style={{ marginTop: 24 }}>Código de la casa: {code} · <a href="#" onClick={e => { e.preventDefault(); twice('leave', onLeave) }}>{armed === 'leave' ? '¿Seguro? Toca otra vez' : 'Salir de esta casa'}</a></p>
    </main>
  )
}
