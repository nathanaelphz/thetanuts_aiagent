const targets = ['BTC-11SEP26-81000-C','BTC-11SEP26-75000-P','ETH-11SEP26-2650-C','ETH-11SEP26-2350-P'];

function synth(o, asset){
  const expiry = Number(o.expiry || 0);
  const strikeRaw = (o.strikes||[])[0] || 0;
  const strikeUsd = Number(strikeRaw) / 1e8;
  const d = new Date(expiry*1000);
  const exp = d.toISOString().slice(2,10).replace(/-/g,'').toUpperCase();
  const kind = o.isCall ? 'C' : 'P';
  return `${asset}-${exp}-${Math.trunc(strikeUsd)}-${kind}`;
}

(async () => {
  try {
    const btcRes = await fetch('http://localhost:3000/market-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset: 'BTC', includeOptions: true, includeMarketState: false })
    });
    const btcData = await btcRes.json();
    
    const ethRes = await fetch('http://localhost:3000/market-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset: 'ETH', includeOptions: true, includeMarketState: false })
    });
    const ethData = await ethRes.json();
    
    const allOrders = [...(btcData.optionBook?.orders || []), ...(ethData.optionBook?.orders || [])];
    
    const results = [];
    for (const o of allOrders) {
      const impl = (o.implementation || '').toLowerCase();
      let asset = null;
      if (impl.includes('btc') || o.implementation === '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F') asset = 'BTC';
      else if (impl.includes('eth') || o.implementation === '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70') asset = 'ETH';
      else continue;
      
      const ticker = synth(o, asset);
      if (!targets.includes(ticker)) continue;
      
      const demo = o.demoFillPreview || {};
      results.push({
        ticker,
        isCall: o.isCall,
        price: o.price,
        strikes: o.strikes,
        fillSizeUsdc: demo.fillSizeUsdc,
        numContracts: demo.numContracts,
        totalCollateral: demo.totalCollateral,
        implementation: o.implementation,
        collateral: o.collateral
      });
    }
    
    results.sort((a, b) => targets.indexOf(a.ticker) - targets.indexOf(b.ticker));
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
