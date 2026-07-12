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

async function fetchQuotes() {
  const response = await fetch("/api/quotes", { cache: "no-store" });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || `시세 API 오류: HTTP ${response.status}`);
  }

  return data;
}

function renderQuote(quote, valueEl, timeEl, formatter, suffix = "") {
  valueEl.textContent = `${formatter.format(quote.price)}${suffix}`;
  const time = quote.marketTime ? dateTime.format(new Date(quote.marketTime)) : "시간 정보 없음";
  timeEl.textContent = `${quote.exchange} · ${time}`;
}

function renderResult({ adr, kospi, fx }, result) {
  output.adrSymbolLabel.textContent = `${adr.symbol} ADR`;
  renderQuote(adr, output.adrPrice, output.adrTime, usd);
  renderQuote(kospi, output.kospiPrice, output.kospiTime, won);
  renderQuote(fx, output.fxRate, output.fxTime, number, "원");

  output.convertedPrice.textContent = won.format(result.converted);
  output.priceGap.textContent = won.format(result.gap);
  output.premiumRate.textContent = percent.format(result.premium);

  if (result.premium > 0.0025) {
    output.premiumRate.dataset.state = "premium";
    output.premiumLabel.textContent = "ADR 환산 본주가가 코스피보다 높습니다.";
  } else if (result.premium < -0.0025) {
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
    const data = await fetchQuotes();
    renderResult(data.quotes, data.result);
    setStatus("시세 반영 완료. 데이터는 거래소·제공사 기준으로 지연될 수 있습니다.", "ok");
  } catch (error) {
    setStatus(`${error.message} 잠시 후 다시 새로고침해 주세요.`, "error");
  } finally {
    setLoading(false);
  }
}

output.refreshButton.addEventListener("click", refreshQuotes);

refreshQuotes();
