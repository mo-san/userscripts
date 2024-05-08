const getDomValue = (selector: string) => {
	const element = document.querySelector<HTMLElement>(selector);
	if (!element) return null;
	return Number.parseFloat(element.textContent?.replace(/,/g, "") ?? "0");
};

const getMainElement = async (): Promise<HTMLElement> => {
	const footerElement = document.querySelector<HTMLElement>("#footer .acctsummary");
	if (!footerElement) {
		return await new Promise<HTMLElement>((resolve) => setTimeout(() => resolve(getMainElement()), 200));
	}
	const idName = "userscript__info";
	if (!document.querySelector(`#${idName}`)) {
		footerElement.insertAdjacentHTML("beforeend", `<div id=${idName}></div>`);
	}
	return document.querySelector<HTMLElement>(`#${idName}`) as HTMLElement;
};

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

const getUsdToJpy = async () => {
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

const getRimawari = (rate: number) => {
	const tesuuryou = getDomValue("ul.optionstrategiesticket-details li:nth-of-type(1) .t-num");
	const premium = getDomValue("ul.optionstrategiesticket-details li:nth-of-type(2) .t-num");
	const jpy = getDomValue("ul.optionstrategiesticket-details li:nth-of-type(3) .t-num");
	const hitsuyou_shoukokin = document.querySelector<HTMLElement>(
		"ul.optionstrategiesticket-details li:nth-of-type(3) .details-val",
	);

	if (tesuuryou === null || premium === null || jpy === null || jpy === 0 || hitsuyou_shoukokin === null) return "N/A";
	if (/USD$/.test(hitsuyou_shoukokin.textContent ?? "")) return "N/A";
	return ((((premium - tesuuryou) * rate) / jpy) * 100).toFixed(2);
};

const getShiyouritsu = () => {
	const jpy = getDomValue("ul.optionstrategiesticket-details li:nth-of-type(3) .t-num");
	const yoryoku = getDomValue(".acctsummary-margin-available .t-num");
	const jun_shisan = getDomValue(".acctsummary-account-value .t-num");

	if (jpy === null || yoryoku === null || jun_shisan === null || jun_shisan === 0) return "N/A";
	return (100 - ((yoryoku - jpy) / jun_shisan) * 100).toFixed(2);
};

const updateInterest = async () => {
	const rate = await getUsdToJpy();
	const rimawari = getRimawari(rate);
	const shiyouritsu = getShiyouritsu();
	(await getMainElement()).innerText =
		`【利回り】${rimawari}% (${rate} ¥/$}) 【約定後の証拠金使用率】: ${shiyouritsu}%`;
};

const main = async () => {
	setInterval(updateInterest, 1000);
};

void main();
