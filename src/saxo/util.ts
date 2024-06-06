const cache = {
	value: 0,
	timestamp: 0,
};

const gmFetch = (url: string) => {
	return new Promise<string>((resolve, _reject) =>
		GM.xmlHttpRequest({
			method: "GET",
			url,
			onload: ({ responseText }) => resolve(responseText),
		}),
	);
};

export const getUsdToJpy = async () => {
	const now = Date.now();
	const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

	// If the cache is not older than 1 hour, return the cached value
	if (now - cache.timestamp < oneHour) {
		return cache.value;
	}

	// Otherwise, fetch a new value
	const response = await gmFetch("https://api.excelapi.org/currency/rate?pair=usd-jpy");
	const rate = Number.parseFloat(response);
	const hiduke = new Date(now).toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		hour12: false,
	});
	console.info(`${hiduke} のドル円レート: ${rate}`);

	// Update the cache
	cache.value = rate;
	cache.timestamp = now;

	return rate;
};

const parseAmountAsNumber = (amount: string): number => {
	const value = amount.replace(/,/g, "");
	return Number.parseFloat(value || "0");
};

const getDomText = (selector: string): string => {
	return document.querySelector<HTMLElement>(selector)?.textContent ?? "";
};

const getAmount = (selector: string): number => {
	return parseAmountAsNumber(getDomText(selector));
};

const get_hitsuyou_shoukokin = (): { hitsuyou_shoukokin: number | null; unit: string | null } => {
	const content = document.querySelector<HTMLElement>(
		"ul[data-test-id='optionstrategiesticket-details'] > li:nth-of-type(3) .details-val",
	);
	if (content === null) return { hitsuyou_shoukokin: null, unit: null };

	const [value, unit] = (content.textContent ?? "").split(" ");
	if (unit === undefined) return { hitsuyou_shoukokin: null, unit: null };

	return { hitsuyou_shoukokin: parseAmountAsNumber(value), unit };
};

export const getCuurentPrice = () => {
	return getAmount(".tst-pricebar-last-traded .pricebar-value span");
};

export const getRimawari = (rate: number): number | null => {
	const tesuuryou = getAmount("ul[data-test-id='optionstrategiesticket-details'] > li:nth-of-type(1) .t-num");
	const premium = getAmount("ul[data-test-id='optionstrategiesticket-details'] > li:nth-of-type(2) .t-num");
	const { hitsuyou_shoukokin, unit } = get_hitsuyou_shoukokin();
	const days = getDaysDifferenceUntilMaturityDate();

	if (!tesuuryou || !premium || !hitsuyou_shoukokin || unit === "USD") return null;
	const interestRate = (((premium - tesuuryou) * rate) / hitsuyou_shoukokin) * 100;
	return interestRate / (days / 365);
};

export const getShiyouritsu = (): number | null => {
	const yoryoku = getAmount(".acctsummary-margin-available .t-num");
	const jun_shisan = getAmount(".acctsummary-account-value .t-num");
	const { hitsuyou_shoukokin, unit } = get_hitsuyou_shoukokin();

	if (!yoryoku || !jun_shisan || !hitsuyou_shoukokin || unit === "USD") return null;
	return 100 - ((yoryoku - hitsuyou_shoukokin) / jun_shisan) * 100;
};

export const getFooterElement = async (): Promise<HTMLElement> => {
	const footerElement = document.querySelector<HTMLElement>("#footer .acctsummary");
	if (footerElement) return footerElement;
	return await new Promise<HTMLElement>((resolve) => setTimeout(() => resolve(getFooterElement()), 200));
};

export const getDaysDifferenceUntilMaturityDate = (): number => {
	const dateElement = document.querySelector<HTMLElement>(
		".tst-option-strategies-row .reactgrid-cell:nth-of-type(2) bdi",
	);
	if (!dateElement) return 0;

	const date = new Date(dateElement.textContent ?? "");
	const today = new Date();

	// 日数の差分を計算するため、今日の日付に1日を加算する
	date.setDate(date.getDate() + 1);

	// 午前0時に設定する
	date.setHours(0, 0, 0, 0);
	today.setHours(0, 0, 0, 0);

	const diffInMilliseconds = date.getTime() - today.getTime();
	const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24);

	// 未来の日付の場合は0を返す
	if (diffInDays < 0) return 0;

	return diffInDays;
};
