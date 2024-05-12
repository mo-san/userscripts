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
