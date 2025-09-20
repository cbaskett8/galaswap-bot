const express = require('express');
const cors = require('cors');
const { keccak256 } = require('js-sha3');
const stringify = require('json-stringify-deterministic');
const { ec: EC } = require('elliptic');
const BN = require('bn.js');
const { fetch } = require('undici');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors()); // allows file:// pages to call us

// ---- Private key handling (DO NOT paste your seed phrase here) ----
let PK = process.env.GALA_PK_HEX || '';
function mustPK() {
  if (!PK || !/^0x?[0-9a-fA-F]{64}$/.test(PK)) {
    throw new Error('Private key missing or malformed. Set env GALA_PK_HEX to 0x..64 hex chars.');
  }
  return PK.replace(/^0x/, '');
}

const ecSecp256k1 = new EC('secp256k1');

// Sign: deterministic JSON -> keccak256 -> secp256k1 (normalize s) -> DER base64
function signObject(obj) {
  const clean = { ...obj };
  if ('signature' in clean) delete clean.signature;

  const str = stringify(clean);                         // stable field order
  const hash = Buffer.from(keccak256.digest(Buffer.from(str)));

  const sig = ecSecp256k1.sign(hash, Buffer.from(mustPK(), 'hex'));
  // normalize s (low-s form)
  if (sig.s.cmp(ecSecp256k1.curve.n.shrn(1)) > 0) {
    const n = ecSecp256k1.curve.n;
    sig.s = new BN(n).sub(sig.s);
    if (sig.recoveryParam != null) sig.recoveryParam = 1 - sig.recoveryParam;
  }
  const derB64 = Buffer.from(sig.toDER()).toString('base64');
  return { signature: derB64, stringToSign: str };
}

// health
app.get('/health', (_req,res)=>res.json({ ok:true }));

// POST /sign  { payload: <object to sign> }
app.post('/sign', (req,res)=>{
  try {
    const { payload } = req.body || {};
    if (!payload || typeof payload !== 'object') throw new Error('Body must be { payload: object }');
    const out = signObject(payload);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// GET /pubkey?address=client|...
app.get('/pubkey', async (req,res)=>{
  try {
    const address = (req.query.address || '').trim();
    if (!address.startsWith('client|') && !address.startsWith('eth|'))
      throw new Error('Expected a GalaChain wallet address like client|…');
    const r = await fetch('https://api-galaswap.gala.com/galachain/api/asset/public-key-contract/GetPublicKey',{
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ user: address })
    });
    const txt = await r.text();
    try {
      const j = JSON.parse(txt);
      const value = typeof j === 'string' ? j : (j.publicKey || j.data || '');
      if (!value) throw new Error('Missing public key in JSON response');
      return res.json({ publicKey: value });
    } catch {
      return res.json({ publicKey: txt.replace(/[\r\n"]/g,'') });
    }
  } catch(e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

const PORT = 17777;
app.listen(PORT, ()=>{
  console.log(`🔐 Gala signer running on http://127.0.0.1:${PORT}`);
  if (!PK) console.log('ℹ️  No GALA_PK_HEX set — /sign will error until you set it. /pubkey and /health still work.');
});
