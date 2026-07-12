const ADR_SHARE_RATIO = 0.1;

const SYMBOLS = {
  adrCandidates: ["SKHY", "SKHYV"],
  kospi: "000660.KS",
  fx: "KRW=X",
};

function yahooChartUrl(symbol) {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers,
    },
  });
}

async function fetchQuote(symbol) {
  const response = await fetch(yahooChartUrl(symbol), {
    headers: {
      "user-agent": "wiplab-quote-checker/1.0",
      accept: "application/json",
    },
    cf: {
      cacheTtl: 0,
      cacheEverything: false,
    },
  });

  if (!response.ok) {
    throw new Error(`${symbol} quote request failed with ${response.status}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const price = meta?.regularMarketPrice ?? meta?.previousClose;

  if (!meta || !Number.isFinite(price)) {
    throw new Error(`${symbol} quote is unavailable`);
  }

  return {
    symbol,
    price,
    currency: meta.currency,
    exchange: meta.fullExchangeName || meta.exchangeName || "",
    marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
  };
}

async function fetchFirstValidQuote(symbols) {
  const errors = [];

  for (const symbol of symbols) {
    try {
      return await fetchQuote(symbol);
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(errors.at(-1) || "ADR quote is unavailable");
}

export async function onRequestGet() {
  try {
    const [adr, kospi, fx] = await Promise.all([
      fetchFirstValidQuote(SYMBOLS.adrCandidates),
      fetchQuote(SYMBOLS.kospi),
      fetchQuote(SYMBOLS.fx),
    ]);

    const converted = (adr.price * fx.price) / ADR_SHARE_RATIO;
    const gap = converted - kospi.price;
    const premium = gap / kospi.price;

    return json({
      ok: true,
      ratio: ADR_SHARE_RATIO,
      quotes: {
        adr,
        kospi,
        fx,
      },
      result: {
        converted,
        gap,
        premium,
      },
      fetchedAt: Date.now(),
    });
  } catch (error) {
    return json(
      {
        ok: false,
        message: error.message || "Failed to fetch quotes",
      },
      { status: 502 },
    );
  }
}
