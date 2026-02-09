# 📱 PWA Mobile-First - Guía de Implementación

## ✅ **Lo que acabamos de implementar:**

### 1. **Configuración PWA Base**
- ✅ `manifest.json` con configuración de app
- ✅ Metadata optimizada para móvil (viewport, theme-color, etc.)
- ✅ Service Worker con caché offline
- ✅ Componente PWAInstaller para registro automático

### 2. **Características Implementadas**
- ✅ **Instalable**: Los usuarios pueden "Añadir a pantalla de inicio"
- ✅ **Offline**: Funciona sin conexión (páginas cacheadas)
- ✅ **Notificaciones Push**: Preparado para recibir notificaciones
- ✅ **Accesos Directos**: 3 shortcuts (Equipo, Mercado, Ranking)
- ✅ **Optimización iOS**: Configuración específica para Safari

---

## 🚀 **Próximos Pasos CRÍTICOS**

### **PASO 1: Crear Iconos de la App**

Necesitas crear 3 imágenes PNG en la carpeta `public/`:

1. **icon-192.png** (192x192px)
2. **icon-512.png** (512x512px)
3. **apple-icon.png** (180x180px)

**Diseño sugerido:**
- Fondo: `#0F1923` (v-navy)
- Logo: Estilo Valorant con el texto "VCT" o "Fantasy VCT"
- Bordes redondeados para iOS

**Herramienta recomendada:**
```bash
# Usa https://realfavicongenerator.net/ o Figma
# O genera con IA usando el prompt:
"App icon for Valorant Fantasy League, dark background #0F1923, 
red accent #FF4655, minimalist, gaming style, square format"
```

---

### **PASO 2: Configurar Next.js para PWA**

Instala el plugin oficial:

```bash
npm install next-pwa
```

Luego actualiza `next.config.mjs`:

```javascript
import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    }
  ]
});

export default nextConfig;
```

---

### **PASO 3: Optimizaciones Mobile Adicionales**

#### A. **Mejorar Gestos Táctiles**

Instala:
```bash
npm install react-swipeable
```

Usa en componentes clave:
```tsx
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => console.log('Swipe left'),
  onSwipedRight: () => console.log('Swipe right'),
});

<div {...handlers}>Contenido</div>
```

#### B. **Haptic Feedback (Vibración)**

Añade feedback táctil en acciones importantes:
```typescript
// En lib/utils/haptics.ts
export const haptic = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(20),
  heavy: () => navigator.vibrate?.(30),
  success: () => navigator.vibrate?.([10, 50, 10]),
  error: () => navigator.vibrate?.([50, 100, 50])
};

// Uso:
import { haptic } from '@/lib/utils/haptics';

async function handleBuyPlayer() {
  const result = await buyPlayer(...);
  if (result.success) {
    haptic.success();
  } else {
    haptic.error();
  }
}
```

#### C. **Pull-to-Refresh**

```bash
npm install react-simple-pull-to-refresh
```

```tsx
import PullToRefresh from 'react-simple-pull-to-refresh';

<PullToRefresh onRefresh={async () => {
  await refetchData();
}}>
  <YourContent />
</PullToRefresh>
```

---

### **PASO 4: Notificaciones Push (Backend)**

Crea endpoint para enviar notificaciones:

```typescript
// app/api/notifications/send/route.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:tu@email.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const { subscription, title, body } = await request.json();
  
  await webpush.sendNotification(subscription, JSON.stringify({
    title,
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  }));
  
  return Response.json({ success: true });
}
```

Genera claves VAPID:
```bash
npx web-push generate-vapid-keys
```

---

### **PASO 5: Testing en Dispositivos Reales**

#### **Android (Chrome)**
1. Abre Chrome DevTools
2. Device Mode → Selecciona dispositivo
3. Lighthouse → Run PWA audit
4. Debe pasar todos los checks

#### **iOS (Safari)**
1. Abre Safari en iPhone
2. Visita tu app
3. Toca "Compartir" → "Añadir a pantalla de inicio"
4. Verifica que se abre en fullscreen

---

## 📊 **Métricas de Éxito PWA**

Tu app debe cumplir:
- ✅ **Lighthouse PWA Score**: >90
- ✅ **Performance**: >85
- ✅ **Accessibility**: >90
- ✅ **Best Practices**: >90
- ✅ **SEO**: >90

---

## 🎯 **Roadmap Mobile-First**

### **Semana 1-2: PWA Base** (LO QUE ACABAMOS DE HACER)
- [x] Manifest.json
- [x] Service Worker
- [x] Metadata móvil
- [ ] Iconos de app
- [ ] Testing en dispositivos reales

### **Semana 3-4: Optimización UX Mobile**
- [ ] Pull-to-refresh
- [ ] Haptic feedback
- [ ] Gestos swipe
- [ ] Animaciones optimizadas
- [ ] Bottom sheet modals

### **Semana 5-6: Notificaciones Push**
- [ ] Backend de notificaciones
- [ ] Suscripción de usuarios
- [ ] Notificaciones automáticas:
  - Mercado abierto/cerrado
  - Partido en vivo
  - Puntuaciones finales

### **Semana 7-8: Features Mobile-Exclusive**
- [ ] Modo offline completo
- [ ] Sincronización en background
- [ ] Widget de clasificación
- [ ] Share sheet nativo

---

## 🔥 **Comandos Útiles**

```bash
# Desarrollo con PWA
npm run dev

# Build de producción
npm run build

# Verificar PWA
npx lighthouse https://tu-app.vercel.app --view

# Generar iconos automáticamente
npx pwa-asset-generator logo.svg public/icons
```

---

## ✅ **Checklist Final**

Antes de lanzar:
- [ ] Iconos creados (192, 512, 180)
- [ ] next-pwa instalado y configurado
- [ ] Service worker funcionando
- [ ] Instalable en iOS y Android
- [ ] Lighthouse PWA score >90
- [ ] Notificaciones push configuradas
- [ ] Tested en iPhone y Android real

---

**Siguiente paso inmediato:** Crear los 3 iconos PNG y probar la instalación en tu teléfono.
