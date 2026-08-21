# iDayss × IcezyBrawlMartBOT

Bot Discord completo per un negozio di boosting Brawl Stars: Ranked / Prestige / Matcherino / Winstreak, sistema ticket, prove, recensioni, giveaway. Tutto in **inglese** lato utente, guida in **italiano**.

100% gratuito: Discord (gratis) + MongoDB Atlas M0 (gratis per sempre) + hosting gratuito.

---

## 1. Cosa contiene

```
idayss-bot/
├── index.js              → avvio del bot
├── deploy-commands.js    → registra gli slash command
├── keepAlive.js          → mini web-server per hosting gratuiti
├── config.js             → colori, ruoli, canali, LISTINO PREZZI (modificabile)
├── commands/              /setup  /review  /ticket proofs  /g create|end
├── handlers/              logica di ordini, ticket, prove, recensioni, giveaway
├── models/                schema MongoDB (Order, Review, Proof, Giveaway)
└── events/                ready, interactionCreate
```

### Funzionalità incluse
- `/setup ranked|prestige|matcherino|winstreak` → pannello con bottone d'acquisto, grafica viola/blu.
- `/setup ticket` → pannello con menu a tendina (Purchase / Apply for a Role / Get Help).
- Flusso d'ordine guidato (Boost/Carry → selezione rank/spec/brawlers → pagamento → note → conferma) → crea automaticamente un **canale ticket privato** visibile solo a cliente + ruoli Staff/Owner.
- Ticket: "I Sent Payment" → proxy pagamento (Zelle/Wise) con "Input Payment Info" / "Find Exchange via Heatz" → conferma pagamento → "Order Assigned" → Close / Close With Reason.
- `/ticket proofs` (solo staff, dentro un ticket) → chiede una foto, poi pubblica in `#completed-jobs` con bottone "Anonymous 💵" o nome pubblico.
- `/review @utente prodotto` (solo staff) → manda un DM al cliente con bottone "Leave a Review" → stelle 1-5 + commento → pubblica in `#customer-vouches`.
- `/g create prize winners duration` (es. `1d`, `12h`, `30m`) → giveaway con bottone 🎉, estrazione automatica anche dopo un riavvio del bot (i giveaway pendenti vengono ripresi dal database).

### Prezzi
Il listino di partenza è in `config.js` (sezioni `RANK_STEP_COSTS`, `PRESTIGE_OPTIONS`, `MATCHERINO_OPTIONS`, `WINSTREAK_OPTIONS`) basato sulle immagini che mi hai mandato. Alcuni valori (soprattutto i rank Masters/Pro) erano parzialmente illeggibili negli screenshot: **apri `config.js` e correggi i numeri come preferisci**, non serve toccare altro codice.

---

## 2. Crea il bot su Discord (gratis)

1. Vai su https://discord.com/developers/applications → **New Application** → dagli il nome `iDayss x IcezyBrawlMartBOT`.
2. Tab **Bot** → **Add Bot**. Attiva:
   - `Server Members Intent`
   - `Message Content Intent`
3. Copia il **Token** (Reset Token se necessario) → lo userai come `DISCORD_TOKEN`.
4. Tab **OAuth2 → General** → copia **Client ID** → lo userai come `CLIENT_ID`.
5. Tab **OAuth2 → URL Generator**: seleziona scope `bot` + `applications.commands`; permessi: Manage Channels, Manage Roles, Send Messages, Embed Links, Attach Files, Read Message History, Use Slash Commands. Apri l'URL generato e invita il bot nel tuo server.
6. Nel tuo server crea (se non esistono già) i ruoli **Staff** e **Owner**, e i canali: `ranked`, `prestige`, `matcherino`, `winstreak`, `order-here`, `completed-jobs`, `customer-vouches`.

---

## 3. Database gratuito (MongoDB Atlas)

1. Vai su https://www.mongodb.com/cloud/atlas/register → crea un account gratuito.
2. Crea un cluster **M0 Free Tier** (resta gratis per sempre, 512MB).
3. **Database Access** → crea un utente con password.
4. **Network Access** → Add IP Address → `0.0.0.0/0` (consenti da ovunque, necessario per l'hosting cloud).
5. **Connect → Drivers** → copia la connection string, tipo:
   `mongodb+srv://user:password@cluster.mongodb.net/idayss?retryWrites=true&w=majority`
   Questa è la tua `MONGODB_URI`.

---

## 4. Configurazione locale (facoltativa, solo per test)

```bash
cd idayss-bot
npm install
cp .env.example .env
# apri .env e incolla DISCORD_TOKEN, CLIENT_ID, MONGODB_URI, ecc.
npm run deploy   # registra gli slash command
npm start        # avvia il bot
```

---

## 5. Come tenerlo online 24/7 GRATIS

Ti consiglio **una delle due opzioni** sotto. La Opzione A è la più semplice da configurare, la Opzione B è la più affidabile (davvero 24/7, senza trucchi).

### ✅ Opzione A — Render.com (Web Service gratuito) + UptimeRobot

Render offre un piano free per "Web Service". Il piano gratuito va in "sleep" dopo un po' di inattività: per questo il bot include già `keepAlive.js`, un mini server web che risponde ai ping, e useremo **UptimeRobot** per pingarlo ogni 5 minuti così non si addormenta mai.

1. Carica il progetto su GitHub (crea una repo, `git init`, `git add .`, `git commit -m "init"`, `git push`). Non caricare mai il file `.env` (è già ignorato).
2. Vai su https://render.com → crea un account gratuito → **New → Web Service** → collega la tua repo GitHub.
3. Impostazioni:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. In **Environment** aggiungi le variabili: `DISCORD_TOKEN`, `CLIENT_ID`, `MONGODB_URI`, `STAFF_ROLE_NAME`, `OWNER_ROLE_NAME` (i valori sono quelli del tuo `.env`).
5. Deploy. Una volta online, copia l'URL pubblico che Render ti assegna (tipo `https://tuobot.onrender.com`).
6. Vai su https://uptimerobot.com (gratis) → **Add New Monitor** → tipo HTTP(s) → incolla l'URL di Render → intervallo 5 minuti. Questo mantiene il servizio sveglio 24/7.
7. Registra gli slash command una volta sola: dalla dashboard di Render apri la **Shell** e lancia `npm run deploy`, oppure lancialo dal tuo PC con lo stesso `.env`.

### ✅ Opzione B — Oracle Cloud Free Tier (VPS realmente gratuito per sempre)

Più lavoro iniziale, ma è una vera macchina virtuale linux always-on, gratis per sempre (nessun sonno, nessun limite di ore).

1. Crea un account su https://www.oracle.com/cloud/free/ (serve una carta per verifica, ma il tier "Always Free" non addebita nulla).
2. Crea una VM **Always Free** (Ampere A1, Ubuntu 22.04).
3. Connettiti via SSH e installa Node.js:
   ```bash
   sudo apt update && sudo apt install -y nodejs npm git
   sudo npm install -g pm2
   ```
4. Carica il progetto (via `git clone` della tua repo, o `scp` dei file), poi:
   ```bash
   cd idayss-bot
   npm install
   nano .env   # incolla le tue variabili
   npm run deploy
   pm2 start index.js --name idayss-bot
   pm2 save
   pm2 startup   # segui l'istruzione stampata per l'avvio automatico al riavvio del server
   ```
Il bot resta online 24/7 anche se chiudi il terminale, e riparte da solo se la VM si riavvia.

> 💡 Con entrambe le opzioni: se cambi o aggiungi comandi, ricordati di rilanciare `npm run deploy`.

---

## 6. Verifica finale

Nel tuo server Discord:
1. `/setup ranked` (e ripeti per prestige, matcherino, winstreak, ticket) nei rispettivi canali.
2. Clicca il bottone del pannello → segui il wizard → conferma → controlla che venga creato il canale ticket.
3. Nel ticket clicca "I Sent Payment" → verifica il flusso staff.
4. Da staff, `/ticket proofs` dentro un ticket, allega una foto → controlla `#completed-jobs`.
5. `/review @cliente ranked` → controlla il DM e poi `#customer-vouches`.
6. `/g create prize:"BP+" winners:1 duration:1m` → controlla che finisca da solo dopo 1 minuto.

Se qualcosa non appare, controlla che i ruoli **Staff**/**Owner** e i canali `completed-jobs` / `customer-vouches` esistano esattamente con questi nomi (modificabili in `config.js`).
