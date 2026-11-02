# Cortinilla 2004 📺

**Español** · [English](#english)

Una cortinilla ("lower third") de televisión al estilo 2004 para tus maratones de series por pantalla compartida: barra azul brillante, logo redondo y frases como *"A continuación"* o *"Seguimos con"* seguidas del nombre de la serie.

Es una app de escritorio (Electron) con dos ventanas:

- **Overlay:** ventana transparente, sin bordes y siempre encima, que ocupa la pantalla que elijas. No bloquea el ratón.
- **Panel de control:** desde ahí eliges la frase, escribes la serie y la muestras.

## Características

- Animación de entrada y salida con destello, estilo TV de la época.
- Frases predefinidas en **español e inglés**: cambia de idioma con los botones **ES / EN** (el panel también cambia).
- **Vista previa** en el propio panel (no aparece en la pantalla compartida) para elegir bien los colores.
- Elección de la **pantalla** donde aparece (por defecto, la segunda si existe).
- **Logo personalizado**: imagen propia (PNG, JPG, GIF, WebP o SVG) o texto corto.
- **Colores** configurables para la barra, la frase, el título y el logo.
- Duración automática o manual.
- Recuerda tus preferencias entre sesiones.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior.
- Windows (probado), macOS o Linux (sin probar).

## Uso

```bash
npm install
npm start
```

En Windows también puedes hacer doble clic en `iniciar.bat`.

1. Comparte **la pantalla completa** donde aparece la cortinilla (no una ventana suelta).
2. Escribe el nombre de la serie en el panel y pulsa **Enter** para mostrarla; **Esc** la oculta.
3. Deja el panel en otra pantalla o minimízalo, para que no salga en lo que compartes.

### Atajos

| Tecla | Acción |
| ----- | ------ |
| Enter | Mostrar la cortinilla |
| Esc   | Ocultarla |

### Limitaciones

- Si compartes una ventana en vez de la pantalla, la cortinilla no se verá.
- Algunos reproductores en pantalla completa exclusiva pueden taparla.
- Solo cubre una pantalla a la vez.

## Versión para OBS

[`index.html`](index.html) es una versión de una sola página (con fondo transparente) para usarla como *Fuente de navegador* en OBS, sin necesidad de Electron.

## Estructura

| Archivo | Descripción |
| ------- | ----------- |
| `main.js` | Proceso principal de Electron: crea las ventanas y gestiona pantallas y logo. |
| `preload.js` | Puente seguro entre el panel/overlay y el proceso principal. |
| `panel.html` | Panel de control (idiomas ES/EN y vista previa). |
| `overlay.html` | La cortinilla que se dibuja sobre la pantalla. |
| `lower.css`, `lower.js` | Estilo y lógica de la cortinilla, compartidos por el overlay y la vista previa. |
| `index.html` | Versión independiente para OBS. |

## Privacidad

La app no usa red ni envía datos. Tus preferencias y el logo elegido se guardan solo en el almacenamiento local de la app en tu equipo, no en este repositorio.

---

## English

A 2004-style TV lower-third for your screen-sharing series nights: glossy blue bar, round logo, and phrases like *"Up next"* or *"Coming up"* followed by the show's name.

It's a desktop app (Electron) with two windows:

- **Overlay:** a transparent, frameless, always-on-top window covering the screen you choose. It never blocks the mouse.
- **Control panel:** pick the phrase, type the show and display it.

### Features

- Slide-in/out animation with a shine effect.
- Preset phrases in **Spanish and English**: switch with the **ES / EN** buttons (the panel UI changes too).
- Built-in **preview** in the panel (never shown on the shared screen) to fine-tune colors.
- Choose which **screen** it appears on (defaults to the second one if present).
- **Custom logo**: your own image (PNG, JPG, GIF, WebP or SVG) or short text.
- Customizable **colors** for the bar, phrase, title and logo.
- Automatic or manual duration.
- Remembers your settings between sessions.

### Requirements

- [Node.js](https://nodejs.org/) 18 or newer.
- Windows (tested), macOS or Linux (untested).

### Usage

```bash
npm install
npm start
```

1. Share your **entire screen** (the one showing the overlay), not a single window.
2. Type the show name in the panel and press **Enter** to display it; **Esc** hides it.
3. Keep the panel on another screen or minimized so it doesn't appear in the shared view.

### Limitations

- Sharing a single window won't capture the overlay.
- Some players in exclusive fullscreen may cover it.
- Covers one screen at a time.

### OBS version

[`index.html`](index.html) is a standalone single-page version (transparent background) you can use as a *Browser Source* in OBS, no Electron needed.

### Privacy

The app makes no network requests and sends no data. Your settings and chosen logo are stored only in the app's local storage on your machine, never in this repository.
