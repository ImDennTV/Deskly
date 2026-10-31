# Deskly — Cartelle di siti e link

Estensione Chrome (Manifest V3) per organizzare siti e link in cartelle con nome, icona e colore.
Risolve due limiti di Chrome: i 10 collegamenti della nuova scheda e i gruppi di schede che spariscono quando si chiudono.

## Installazione (cartella non pacchettizzata)

1. Scarica l'ultimo zip da [Releases](https://github.com/ImDennTV/Deskly/releases/latest) ed estrailo in una cartella fissa.
2. Apri `chrome://extensions` e attiva **Modalità sviluppatore** (in alto a destra).
3. Clicca **Carica estensione non pacchettizzata** e scegli la cartella che contiene `manifest.json`.
4. Si apre la nuova scheda di Deskly con la configurazione iniziale: scegli un kit di partenza o parti da zero.

Richiede Chrome 114 o successivo. Non spostare né cancellare la cartella dopo l'installazione: Chrome la legge da lì.

## Come si usa

- **Pannello laterale**: clicca l'icona di Deskly nella barra degli strumenti.
- **Nuova scheda**: ogni nuova scheda mostra le tue cartelle, con ricerca.
- **Aggiungi**: pulsante «Aggiungi», oppure clic destro su una pagina o un link → «Aggiungi a Deskly».
- **Apri una cartella intera**: si aprono tutti i link come gruppo di schede con nome e colore della cartella. Se un sito è già aperto, Deskly passa a quella scheda invece di duplicarla.
- **Ordina**: trascina link e cartelle.
- **Annulla**: ogni modifica si può annullare (Ctrl/⌘+Z o dal messaggio che compare).

### Scorciatoie

| Azione | Tasti |
| --- | --- |
| Apri il pannello | Alt+Shift+D |
| Aggiungi la pagina corrente | Alt+Shift+S |
| Cerca nel pannello / nella nuova scheda | Ctrl/⌘+K |
| Cerca dalla barra degli indirizzi | scrivi `dk`, poi Spazio, poi il nome |

Le scorciatoie si possono cambiare in `chrome://extensions/shortcuts`.

## Ricerca e suggerimenti

- La barra della nuova scheda funziona come quella di Chrome: mentre scrivi mostra le tue cartelle, la cronologia e i suggerimenti web. Invio apre il primo risultato o cerca sul web.
- Sotto la barra c'è la prima riga «testo – Ricerca Google», poi i completamenti (la parte che hai già scritto resta normale, il resto è in grassetto) e, quando Google lo propone, i siti con la loro icona. Con Google o Chrome come motore c'è anche il pulsante **AI Mode** (o **Alt+Invio**) che apre la ricerca in modalità AI di Google. Le foto e i sottotitoli dei risultati "entità" (come nella barra di Chrome) non sono disponibili per le estensioni: restano solo testo e icona.
- Quando aggiungi un link basta scrivere una parola ("terminal"): Deskly la cerca nella cronologia e ti propone l'indirizzo giusto.
- «Suggeriti per te» propone i siti che visiti di più e che non hai ancora salvato; «Organizza i miei siti» li divide per categoria in cartelle.

## Personalizzazione

**Temi personalizzati** (Impostazioni → Aspetto): parti da un preset (Nord, Dracula, Rosé, Foresta, Oceano, Sabbia, Sakura, Menta) o crea il tuo scegliendo quattro colori; fino a 12 temi, duplicabili, esportabili e importabili come testo. Le **etichette** dei link si aggiungono con un selettore a icone, le **icone dei siti** sono in alta qualità (128 px) e il gruppo di schede di Chrome si scioglie da solo se torni indietro alla nuova scheda.

**Disposizione e ordine** (Impostazioni → Pagina): scegli con anteprime il layout (griglia, solo icone, elenco, compatta), le colonne di cartelle (auto, 1–4), la dimensione delle icone e la larghezza. Cartelle e link si possono ordinare a mano, per nome, per numero di link o per uso/recenza (solo nella vista: il tuo ordine salvato non cambia), con i preferiti in cima e il numero di link visibili per cartella. In Aspetto scegli stile delle carte e forma delle icone (arrotondata, cerchio, quadrata); in Comportamento decidi se aprire i link nella stessa scheda.

Impostazioni (icona ingranaggio), in cinque schede: **Aspetto** (tema, colore d'accento, font, stile delle carte, densità, angoli, lingua), **Sfondo** (aurora, sfumatura, tinta unita o una tua immagine, grana, effetti), **Pagina** (layout, dimensione delle tessere, larghezza, riquadro con logo e nome, orologio e data, sezioni da mostrare), **Comportamento** (raggruppamento schede, motore di ricerca, suggerimenti web e cronologia) e **Dati**.

Il piede di pagina di Chrome («Personalizza Chrome») non si può togliere da un'estensione: clic destro su di esso → nascondi.

## Backup e condivisione

- **Esporta / Importa** (Impostazioni → Dati): un file JSON con tutte le cartelle. È il modo più semplice per mandare la tua configurazione a un collega, che la importa dopo aver installato Deskly.
- I dati restano sul tuo computer in `chrome.storage.local`. Le uniche richieste in rete sono tre, tutte spegnibili: i suggerimenti web di Google mentre scrivi nella barra (Impostazioni → Comportamento; viene inviato solo il testo digitato), le icone ad alta qualità dei siti (servizio favicon di Google: viene inviato solo il dominio del sito; si spegne in Impostazioni → Comportamento, e Chrome usa le sue icone locali) e il controllo degli aggiornamenti su GitHub (Impostazioni → Dati → Aggiornamenti; non viene inviato nulla).

## Permessi

| Permesso | Perché |
| --- | --- |
| `storage` | salvare cartelle e impostazioni |
| `tabs`, `tabGroups` | aprire i link, riusare le schede già aperte, creare i gruppi |
| `sidePanel` | il pannello laterale |
| `contextMenus` | «Aggiungi a Deskly» |
| `favicon` | mostrare l'icona di ogni sito (letta localmente da Chrome) |
| `history`, `topSites` | cercare nella cronologia e proporti i siti più visitati (restano in locale) |
| `search` | cercare con il motore predefinito di Chrome |
| host `suggestqueries.google.com` | suggerimenti web mentre scrivi |
| host `t3.gstatic.com` | icone dei siti ad alta qualità (solo il dominio) |
| host `api.github.com` | sapere se esiste una versione più recente (solo lettura, nessun dato inviato) |
| `bookmarks` (opzionale) | solo se importi i preferiti; viene chiesto in quel momento |

## Distribuzione ristretta

- **Ora**: le versioni sono nelle [Releases](https://github.com/ImDennTV/Deskly/releases) di GitHub. Deskly controlla da solo se ce n'è una nuova (un puntino sull'ingranaggio e un avviso in Impostazioni → Dati) e propone il download.
- **Aggiornare su Windows con un comando**: scarica l'ultima release, aggiorna la cartella e apre `chrome://extensions`; resta solo «Ricarica» (Chrome non permette installazioni silenziose fuori dal Web Store).

  ```powershell
  irm https://raw.githubusercontent.com/ImDennTV/Deskly/main/install.ps1 | iex
  ```

  La cartella è `D:\Deskly\deskly` se esiste, altrimenti `%LOCALAPPDATA%\Deskly\extension`; si può scegliere con `-Path`.
- **Più avanti**: Chrome Web Store con visibilità **Privata** (solo account Google indicati) o **Non in elenco** (solo chi ha il link). Così si installa con un clic e si aggiorna da solo.

## Sviluppo

Nessuna build: JavaScript e CSS puri. La cartella `tools/` serve solo in sviluppo e non fa parte del pacchetto.

```bash
node tools/serve.mjs          # anteprima su http://localhost:5178/sidepanel.html e /newtab.html
node tools/test-background.mjs  # prova del service worker con un finto chrome
node tools/check-icons.mjs      # controlla che le icone usate esistano
```

In anteprima web le icone dei siti arrivano da un servizio esterno; nell'estensione vera le legge dalla cache di Chrome (`_favicon`), senza contattare nessuno.

## Licenza

[MIT](LICENSE).
