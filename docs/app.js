const ADR_SHARE_RATIO = 0.1;

const symbols = {
  adrCandidates: ["SKHY", "SKHYV"],
  kospi: "000660.KS",
  fx: "KRW=X",
};

const output = {
  status: document.querySelector("#status"),
  refreshButton: document.querySelector("#refreshButton"),
  adrSymbolLabel: document.querySelector("#adrSymbolLabel"),
  adrPrice: document.querySelector("#adrPrice"),
  adrTime: document.querySelector("#adrTime"),
  kospiPrice: document.querySelector("#kospiPrice"),
  kospiTime: document.querySelector("#kospiTime"),
  fxRate: document.querySelector("#fxRate"),
  fxTime: document.querySelector("#fxTime"),
  convertedPrice: document.querySelector("#convertedPrice"),
  premiumRate: document.querySelector("#premiumRate"),
  premiumLabel: document.querySelector("#premiumLabel"),
  priceGap: document.querySelector("#priceGap"),
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const won = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat("ko-KR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTime = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short",
  timeStyle: "short",
});

function yahooChartUrl(symbol) {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
}

function proxiedUrl(url) {
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchWithFallback(symbol) {
  const directUrl = yahooChartUrl(symbol);

  try {
    return await fetchJson(directUrl);
  } catch (directError) {
    try {
      return await fetchJson(proxiedUrl(directUrl));
    } catch (proxyError) {
      throw new Error(`${symbol} 시세를 불러오지 못했습니다.`);
    }
  }
}

async function fetchFirstValidQuote(symbolList) {
  const errors = [];

  for (const symbol of symbolList) {
    try {
      const data = await fetchWithFallback(symbol);
      return parseQuote(symbol, data);
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(errors.at(-1) || "ADR 시세를 불러오지 못했습니다.");
}

function parseQuote(symbol, data) {
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const price = meta?.regularMarketPrice ?? meta?.previousClose;

  if (!meta || !Number.isFinite(price)) {
    throw new Error(`${symbol} 시세 형식이 올바르지 않습니다.`);
  }

  return {
    symbol,
    price,
    currency: meta.currency,
    exchange: meta.fullExchangeName || meta.exchangeName || "",
    marketTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : null,
  };
}

function renderQuote(quote, valueEl, timeEl, formatter, suffix = "") {
  valueEl.textContent = `${formatter.format(quote.price)}${suffix}`;
  const time = quote.marketTime ? dateTime.format(quote.marketTime) : "시간 정보 없음";
  timeEl.textContent = `${quote.exchange} · ${time}`;
}

function renderResult({ adr, kospi, fx }) {
  const converted = (adr.price * fx.price) / ADR_SHARE_RATIO;
  const gap = converted - kospi.price;
  const premium = gap / kospi.price;

  output.convertedPrice.textContent = won.format(converted);
  output.priceGap.textContent = won.format(gap);
  output.premiumRate.textContent = percent.format(premium);

  if (premium > 0.0025) {
    output.premiumRate.dataset.state = "premium";
    output.premiumLabel.textContent = "ADR 환산 본주가가 코스피보다 높습니다.";
  } else if (premium < -0.0025) {
    output.premiumRate.dataset.state = "discount";
    output.premiumLabel.textContent = "ADR 환산 본주가가 코스피보다 낮습니다.";
  } else {
    output.premiumRate.dataset.state = "neutral";
    output.premiumLabel.textContent = "두 시장 가격이 거의 비슷한 구간입니다.";
  }
}

function setLoading(isLoading) {
  output.refreshButton.disabled = isLoading;
  output.refreshButton.textContent = isLoading ? "불러오는 중…" : "새로고침";
}

function setStatus(message, state = "neutral") {
  output.status.textContent = message;
  output.status.dataset.state = state;
}

async function refreshQuotes() {
  setLoading(true);
  setStatus("시세를 불러오는 중입니다…");

  try {
    const [adr, kospiData, fxData] = await Promise.all([
      fetchFirstValidQuote(symbols.adrCandidates),
      fetchWithFallback(symbols.kospi),
      fetchWithFallback(symbols.fx),
    ]);

    const kospi = parseQuote(symbols.kospi, kospiData);
    const fx = parseQuote(symbols.fx, fxData);

    output.adrSymbolLabel.textContent = `${adr.symbol} ADR`;
    renderQuote(adr, output.adrPrice, output.adrTime, usd);
    renderQuote(kospi, output.kospiPrice, output.kospiTime, won);
    renderQuote(fx, output.fxRate, output.fxTime, number, "원");
    renderResult({ adr, kospi, fx });

    setStatus("시세 반영 완료. 데이터는 거래소·제공사 기준으로 지연될 수 있습니다.", "ok");
  } catch (error) {
    setStatus(`${error.message} 잠시 후 다시 새로고침해 주세요.`, "error");
  } finally {
    setLoading(false);
  }
}

output.refreshButton.addEventListener("click", refreshQuotes);

refreshQuotes();
