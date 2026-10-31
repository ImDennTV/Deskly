# Prova di Deskly in Chrome (5 minuti)

Per ogni punto: fai l'azione, controlla il risultato. Se qualcosa non va, annota il numero del punto e cosa vedi: basta questo per correggerlo.

## 0. Installazione (1 min)
1. `chrome://extensions` → attiva **Modalità sviluppatore**.
2. **Carica estensione non pacchettizzata** → scegli la cartella `deskly` (quella con `manifest.json`).
3. Atteso: nessun errore rosso sulla scheda di Deskly. Se c'è un errore, clicca «Errori» e copia il testo.
4. Atteso: si apre da sola una nuova scheda con l'onboarding.

## 1. Nuova scheda e icone dei siti (1 min)
1. Nell'onboarding scegli un kit (es. Lavoro e Sviluppo) e conferma.
2. Atteso: le cartelle compaiono con le icone vere dei siti (Gmail, GitHub…), non solo lettere.
   - Se vedi solo lettere: l'icona via `_favicon` non funziona. Segnalamelo (punto 1).
3. Apri una scheda nuova con Ctrl+T: deve mostrare Deskly. Premi Ctrl+K: la ricerca si attiva.

## 2. Pannello laterale (1 min)
1. Clicca l'icona di Deskly nella barra degli strumenti (se non la vedi: icona puzzle → puntina).
2. Atteso: si apre il pannello a destra con le stesse cartelle.
3. Chiudilo e riaprilo con **Alt+Shift+D**.
4. Crea una cartella da «Aggiungi → Nuova cartella» e aggiungi un link: deve comparire anche nella nuova scheda aperta, senza ricaricare.

## 3. Gruppi di schede (1 min)
1. Nel pannello clicca un link di una cartella con il colore.
   - Atteso: si apre la scheda e finisce in un gruppo con nome e colore della cartella.
2. Clicca lo stesso link un'altra volta: deve portarti alla scheda già aperta, non aprirne una nuova.
3. Clicca l'icona a livelli nell'intestazione della cartella (o dal menu «⋯» della cartella): si apre un solo gruppo con tutti i link.
4. Chiudi il gruppo, riapri la cartella da Deskly: il gruppo si ricrea. Questo è il punto che Chrome non fa da solo.

## 4. Aggiungere da una pagina (30 s)
1. Vai su un sito qualsiasi, clic destro sulla pagina → **Aggiungi a Deskly** → scegli una cartella.
2. Atteso: sull'icona compare per un attimo una ✓ verde e il link è nella cartella.
3. Ripeti con la stessa pagina: deve comparire «=» grigio (già presente).
4. Prova anche **Alt+Shift+S**: il pannello si apre con il link già pronto da salvare.

## 5. Barra degli indirizzi (30 s)
1. Scrivi `dk`, premi Spazio, poi le prime lettere di un link.
2. Atteso: i suggerimenti mostrano link e cartelle di Deskly. Invio apre il link (o la cartella intera).

## 6. Dati (30 s)
1. Impostazioni (ingranaggio) → cambia tema e colore d'accento: devono applicarsi subito, in pannello e nuova scheda.
2. Impostazioni → Dati → **Esporta**: scarica un file `deskly-backup-….json`.
3. Chiudi e riapri Chrome: le cartelle ci sono ancora.

## Cosa mandarmi
Una riga per ogni punto che non torna, per esempio: «3.2: apre una scheda nuova invece di andare a quella aperta». Se c'è un errore in `chrome://extensions`, incolla il testo.
