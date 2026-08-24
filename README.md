# iDayss × IcezyBrawlMartBOT

Bot Discord completo per un negozio di boosting Brawl Stars. Versione **1.1** — corregge tutti i bug segnalati e aggiunge le funzionalità richieste.

---

## 🔧 COSA HO SISTEMATO (leggi con attenzione)

### 1. `/g create` e `/g end` non rispondevano ("L'applicazione non ha risposto")
**Causa:** Discord dà al bot solo **3 secondi** per confermare di aver ricevuto il comando. Il codice vecchio faceva prima le chiamate al database (salvare il giveaway, ecc.) e SOLO DOPO rispondeva — se il database (MongoDB Atlas) impiegava anche solo un secondo in più del previsto (es. dopo un periodo di inattività), Discord annullava tutto.
**Fix:** ora il bot risponde subito con un "sto pensando..." (`deferReply`) e solo dopo fa le operazioni lente sul database, modificando poi la risposta. Ho applicato lo stesso identico fix a **tutti** i bottoni/menu del bot (ordini, ticket, prove, recensioni, giveaway) per evitare che il problema si ripresenti altrove — è probabilmente anche la causa del bug della Winstreak (punto 5).

### 2. Metodi di pagamento sbagliati
Sostituiti con la lista esatta del tuo screenshot: PayPal, Revolut Jr, Venmo, Cashapp, Wise, Apple Pay, Zelle, Binance, Revolut, Chime, Skrill, BitCoin, Litecoin, Ethereum, Solana, Tether, Bank Trasfer Portal.

### 3. Emoji del server per i metodi di pagamento
Il bot ora **cerca automaticamente** un'emoji personalizzata nel tuo server con lo stesso nome del metodo di pagamento (es. un'emoji chiamata `paypal`, una chiamata `venmo`, ecc.) e la usa ovunque venga mostrato quel metodo. Se non trova un'emoji con quel nome, usa un'emoji normale di riserva.
👉 **Cosa devi fare tu:** carica nel tuo server (Impostazioni server → Emoji) le emoji con questi nomi esatti (minuscolo, senza spazi):
```
paypal, revolutjr, venmo, cashapp, wise, applepay, zelle, binance,
revolut, chime, skrill, bitcoin, litecoin, ethereum, solana, tether, banktransfer
```
Non serve toccare il codice: appena l'emoji esiste nel server con quel nome, il bot la trova da solo.

### 4. Ranked Boost non chiedeva i Power 11
Aggiunto lo step "How many Power 11 brawlers do you have?" nel flusso Ranked, esattamente come nei tuoi screenshot (dopo current/desired rank, prima del pagamento).

### 5. Winstreak si bloccava dopo "Who picks the brawler"
Risolto dal fix del punto 1 (risposta immediata + elaborazione dopo). Il bug non dovrebbe più presentarsi in nessuno step del wizard.

### 6. `/setup` ora chiede un'immagine
Ho aggiunto un'opzione **obbligatoria** `image` ai comandi `/setup ranked|prestige|matcherino|winstreak`: quando scrivi il comando, Discord ti farà scegliere/allegare un file immagine direttamente nella finestra dello slash command, che verrà usata nel pannello pubblicato.

### 7. `/ticket proofs` diceva "nessun ordine in corso" + non postava nel canale giusto
Due bug distinti, entrambi risolti:
- Il tuo canale si chiama **`proofs`**, non `completed-jobs` come avevo impostato di default — ora il nome corretto è `proofs` (comunque personalizzabile con `PROOFS_CHANNEL_NAME` nel `.env`).
- Se per qualsiasi motivo l'ordine non viene trovato nel database (es. ticket vecchio), il comando **non fallisce più**: procede comunque usando il nome del canale per indovinare il prodotto, così puoi sempre pubblicare la prova.
- Il messaggio pubblicato ora mostra Buyer (con emoji del metodo di pagamento), Order Amount, Order Type, Order Details formattati leggibili (rank/spec/brawlers ecc, non più un blob JSON) e l'immagine allegata — come nel tuo screenshot.

### 8. `/review` ora ha un pulsante "Procedi / Submit"
Il cliente, dopo aver scelto le stelle e scritto commento + importo, vede ora un'**anteprima** della recensione con due bottoni: **✅ Procedi / Submit** (pubblica davvero nel canale recensioni) e **❌ Cancel** (annulla). Prima veniva pubblicata subito senza conferma.

---

## 1. Cosa contiene

```
bot/
├── index.js              → avvio del bot
├── deploy-commands.js    → registra gli slash command
├── keepAlive.js          → mini web-server per hosting gratuiti
├── config.js             → colori, ruoli, canali, LISTINO PREZZI, metodi di pagamento
├── commands/              /setup  /review  /ticket proofs  /g create|end
├── handlers/               logica di ordini, ticket, prove, recensioni, giveaway
├── models/                 schema MongoDB (Order, Review, Proof, Giveaway)
├── utils/                  embed, prezzi, permessi, emoji personalizzate, formattazione dettagli
└── events/                 ready, interactionCreate
```

---

## 2. Come aggiornare il bot che hai già online (Render + GitHub)

Dato che usi già **Render + GitHub + UptimeRobot**, ecco i passaggi per sostituire il codice vecchio con questa versione corretta:

1. **Scarica** lo zip allegato ed estrailo sul tuo PC.
2. Apri la cartella del **tuo repository GitHub locale** (quello collegato a Render) e:
   - cancella tutti i file/cartelle tranne `.git` e `.env` (se presente localmente)
   - copia dentro tutti i file estratti dallo zip
3. Da terminale, dentro la cartella:
   ```bash
   git add .
   git commit -m "fix: giveaway, payment methods, ranked P11, proofs, review confirm"
   git push
   ```
4. Render rileverà il push e farà automaticamente un nuovo deploy (puoi controllarlo nella tab **Events** di Render).
5. **Importante — registra di nuovo gli slash command**, perché `/setup` e altri sono cambiati (nuova opzione immagine):
   - Apri la **Shell** del tuo servizio su Render (tab "Shell") e lancia:
     ```bash
     npm run deploy
     ```
   - Se hai impostato `GUILD_ID` nel tuo `.env`/variabili d'ambiente su Render, l'aggiornamento è istantaneo. Altrimenti aspetta fino a un'ora perché Discord aggiorni i comandi ovunque.
6. Su Render, controlla in **Environment** che siano presenti (aggiungile se mancano):
   ```
   PROOFS_CHANNEL_NAME=proofs
   VOUCHES_CHANNEL_NAME=customer-vouches
   TICKET_CATEGORY_NAME=Tickets
   ```
   (se il tuo canale prove si chiama esattamente `proofs`, va già bene di default anche senza questa variabile)

### Se invece stai partendo da zero
Segui la guida completa che ti avevo già mandato in precedenza (creazione bot su Discord Developer Portal, MongoDB Atlas M0 gratuito, deploy su Render, UptimeRobot) — è identica, cambia solo il codice che ora è questa versione corretta.

---

## 3. Crea le emoji personalizzate (facoltativo ma consigliato)

Per avere le iconcine dei metodi di pagamento come nel tuo screenshot:
1. Vai su **Impostazioni server → Emoji**
2. Carica un'emoji per ciascun metodo di pagamento, chiamandola **esattamente** come indicato nel punto 3 sopra (es. l'emoji PayPal deve chiamarsi `paypal`)
3. Non serve fare altro — il bot le userà automaticamente ovunque appaia quel metodo di pagamento (menu a tendina, ticket, prove)

---

## 4. Verifica finale — testa ogni fix

1. `/g create prize:"Test" winners:1 duration:1m` → deve rispondere subito "✅ Giveaway started!" e finire da solo dopo 1 minuto.
2. `/setup ranked` (Discord ti chiederà di allegare un'immagine) → pannello pubblicato con l'immagine.
3. Ordina un Ranked Boost dal pannello → verifica che ti chieda anche "How many Power 11 brawlers do you have?".
4. Ordina una Winstreak Boost fino in fondo, senza blocchi dopo "Who picks the brawler".
5. Nel menu pagamento, verifica che compaiano le emoji giuste (se le hai caricate nel server).
6. In un ticket esistente, prova `/ticket proofs`, allega una foto → controlla che venga pubblicato in `#proofs` con tutti i dettagli leggibili.
7. `/review @cliente ranked` → nel DM, scegli le stelle, scrivi commento e importo → verifica che appaia l'anteprima con il bottone **Procedi / Submit**, e che solo dopo averlo premuto la recensione compaia in `#customer-vouches`.

Se qualcosa non torna ancora, dimmi esattamente quale passaggio e cosa vedi (screenshot se possibile) e lo sistemo.

---

## 5. Note sui prezzi

Il listino prezzi resta in `config.js` (sezioni `RANK_STEP_COSTS`, `PRESTIGE_OPTIONS`, `MATCHERINO_OPTIONS`, `WINSTREAK_OPTIONS`) — modificalo liberamente, è tutto commentato e non serve toccare altro codice.
