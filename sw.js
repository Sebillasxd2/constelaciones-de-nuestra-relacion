/* El parámetro v hace que la instalación de cada cáscara sea atómica. */
const base = self.registration.scope
const prefijo = 'nuestro-cielo:cascaron:' + new URL(base).pathname + ':'
const version = new URL(self.location.href).searchParams.get('v') || 'inicial'
const nombre = prefijo + version
const local = ruta => new URL(ruta,base).href
self.addEventListener('install', event => event.waitUntil((async()=>{
  const listado = await fetch(local('precache.json'),{cache:'no-store'})
  if (!listado.ok) throw Error('Falta la lista de archivos de instalación.')
  const rutas = await listado.json()
  const cache=await caches.open(nombre)
  const peticiones=rutas.map(ruta=>{
    const url=new URL(ruta,base)
    if(!url.href.startsWith(base) || url.pathname.includes('/boveda/')) throw Error('Archivo de instalación inválido.')
    return new Request(url.href,{cache:'reload'})
  })
  await cache.addAll(peticiones)
  await self.skipWaiting()
})()))
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await self.clients.claim()
  // Conserva una edición anterior para pestañas todavía abiertas.
  const previas=(await caches.keys()).filter(n=>n.startsWith(prefijo)&&n!==nombre)
  await Promise.all(previas.slice(0,-1).map(n=>caches.delete(n)))
})()))
self.addEventListener('fetch',event=>{
  const req=event.request
  if(req.method!=='GET' || !req.url.startsWith(base))return
  const url=new URL(req.url)
  if(url.pathname.startsWith(new URL('boveda/',base).pathname))return
  event.respondWith((async()=>{
    const cache=await caches.open(nombre)
    if(req.mode==='navigate'){
      const index=await cache.match(local('index.html'))
      return index || fetch(req)
    }
    if(req.url===local('version.json')){
      try { const res=await fetch(req,{cache:'no-store'}); if(res.ok)return res } catch {}
    }
    const copia=await cache.match(req) || await caches.match(req)
    return copia || fetch(req)
  })())
})

