import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import style from "./saxo-dist.css" with { type: "text" };
import { getUsdToJpy } from "./util.ts";

const getDomValue = (selector: string) => {
	const element = document.querySelector<HTMLElement>(selector);
	if (!element) return null;
	return Number.parseFloat(element.textContent?.replace(/,/g, "") ?? "0");
};

const getRimawari = (rate: number) => {
	const tesuuryou = getDomValue("ul.optionstrategiesticket-details li:nth-of-type(1) .t-num");
	const premium = getDomValue("ul.optionstrategiesticket-details li:nth-of-type(2) .t-num");
	const jpy = getDomValue("ul.optionstrategiesticket-details li:nth-of-type(3) .t-num");
	const hitsuyou_shoukokin = document.querySelector<HTMLElement>(
		"ul.optionstrategiesticket-details li:nth-of-type(3) .details-val",
	);

	if (tesuuryou === null || premium === null || jpy === null || jpy === 0 || hitsuyou_shoukokin === null) return null;
	if (/USD$/.test(hitsuyou_shoukokin.textContent ?? "")) return null;
	return ((((premium - tesuuryou) * rate) / jpy) * 100).toFixed(2);
};

const getShiyouritsu = () => {
	const jpy = getDomValue("ul.optionstrategiesticket-details li:nth-of-type(3) .t-num");
	const yoryoku = getDomValue(".acctsummary-margin-available .t-num");
	const jun_shisan = getDomValue(".acctsummary-account-value .t-num");

	if (jpy === null || yoryoku === null || jun_shisan === null || jun_shisan === 0) return null;
	return (100 - ((yoryoku - jpy) / jun_shisan) * 100).toFixed(2);
};

const getFooterElement = async (): Promise<HTMLElement> => {
	const footerElement = document.querySelector<HTMLElement>("#footer .acctsummary");
	if (footerElement) return footerElement;
	return await new Promise<HTMLElement>((resolve) => setTimeout(() => resolve(getFooterElement()), 200));
};

const Main = () => {
	const [rate, setRate] = useState<number | null>(null);
	const [rimawari, setRimawari] = useState<string | null>(null);
	const [shiyouritsu, setShiyouritsu] = useState<string | null>(null);

	const rimawariText = rimawari ? `${rimawari}%` : "N/A";
	const shiyouritsuText = shiyouritsu ? `${shiyouritsu}%` : "N/A";

	useEffect(() => {
		const fetchRate = async () => {
			const fetchedRate = await getUsdToJpy();
			setRate(fetchedRate);
			setRimawari(getRimawari(fetchedRate));
			setShiyouritsu(getShiyouritsu());
		};

		void fetchRate();
	}, []);

	if (rate === null) {
		return <div>Loading...</div>;
	}

	return (
		<div className={clsx()}>
			<div>
				<span>利回り:</span>
				<span>{rimawariText}</span>
				<span>({rate} 円/ドル)</span>
			</div>
			<div>
				<span>約定後の証拠金使用率:</span>
				<span>{shiyouritsuText}</span>
			</div>
		</div>
	);
};

const App = () => {
	return (
		<>
			<div className="absolute grid place-content-center bg-zinc-900 opacity-50">
				<Main />
			</div>
			<style>{style}</style>
		</>
	);
};

const main = async () => {
	let root = document.getElementById("saxo-helper");
	if (!root) {
		document.body.insertAdjacentHTML("beforeend", `<div id="saxo-helper"></div>`);
		root = document.getElementById("saxo-helper") as HTMLElement;
	}
	createRoot(root).render(<App />);
};

if (document.readyState === "complete") {
	main();
} else {
	window.addEventListener("load", main);
}
