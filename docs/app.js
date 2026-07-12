const fields = {
  adrPrice: document.querySelector("#adrPrice"),
  fxRate: document.querySelector("#fxRate"),
  shareRatio: document.querySelector("#shareRatio"),
  kospiPrice: document.querySelector("#kospiPrice"),
};

const output = {
  convertedPrice: document.querySelector("#convertedPrice"),
  premiumRate: document.querySelector("#premiumRate"),
  premiumLabel: document.querySelector("#premiumLabel"),
  priceGap: document.querySelector("#priceGap"),
};

const won = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("ko-KR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function readNumber(input) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
}

function calculate() {
  const adrPrice = readNumber(fields.adrPrice);
  const fxRate = readNumber(fields.fxRate);
  const shareRatio = readNumber(fields.shareRatio);
  const kospiPrice = readNumber(fields.kospiPrice);

  if (adrPrice <= 0 || fxRate <= 0 || shareRatio <= 0 || kospiPrice <= 0) {
    output.convertedPrice.textContent = "-";
    output.premiumRate.textContent = "-";
    output.priceGap.textContent = "-";
    output.premiumLabel.textContent = "모든 값을 0보다 크게 입력해 주세요.";
    output.premiumRate.dataset.state = "neutral";
    return;
  }

  const converted = (adrPrice * fxRate) / shareRatio;
  const gap = converted - kospiPrice;
  const premium = gap / kospiPrice;

  output.convertedPrice.textContent = won.format(converted);
  output.priceGap.textContent = won.format(gap);
  output.premiumRate.textContent = percent.format(premium);

  if (premium > 0.0025) {
    output.premiumRate.dataset.state = "premium";
    output.premiumLabel.textContent = "ADR 환산가가 코스피보다 높습니다.";
  } else if (premium < -0.0025) {
    output.premiumRate.dataset.state = "discount";
    output.premiumLabel.textContent = "ADR 환산가가 코스피보다 낮습니다.";
  } else {
    output.premiumRate.dataset.state = "neutral";
    output.premiumLabel.textContent = "두 시장 가격이 거의 비슷한 구간입니다.";
  }
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", calculate);
});

calculate();
