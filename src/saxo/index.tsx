import { clsx } from "clsx";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import style from "./style.css" with { type: "text" };
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

	useEffect(() => {
		const fetchRate = async () => {
			const fetchedRate = await getUsdToJpy();
			setRate(fetchedRate);
			setRimawari(getRimawari(fetchedRate));
			setShiyouritsu(getShiyouritsu());
		};

		void fetchRate();
	}, []);

	const rimawariText = rimawari ? `${rimawari}%` : "N/A";
	const shiyouritsuText = shiyouritsu ? `${shiyouritsu}%` : "N/A";

	if (rate === null) {
		return <div>Loading...</div>;
	}

	return (
		<div className={clsx("container")}>
			<div>
				<span>
					利回り:
					<br />({rate} 円/ドル)
				</span>
				<span className={clsx("percentage")}>{rimawariText}%</span>
			</div>
			<div>
				<span>
					約定後の
					<br />
					証拠金使用率:
				</span>
				<span className={clsx("percentage")}>{shiyouritsuText}%</span>
			</div>
		</div>
	);
};

const App = () => {
	const [dragging, setDragging] = useState(false);
	const [pos, setPos] = useState({ x: 0, y: 0 });
	const dragReceiverRef = useRef<HTMLDivElement>(null);

	const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		setDragging(true);
		setPos({ x: e.clientX, y: e.clientY });
	}, []);

	const handleMouseUp = useCallback(() => {
		setDragging(false);
	}, []);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!dragging || !dragReceiverRef.current) return;

			const dx = e.clientX - pos.x;
			const dy = e.clientY - pos.y;
			const { offsetLeft, offsetTop } = dragReceiverRef.current;
			const newLeft = offsetLeft + dx;
			const newTop = offsetTop + dy;

			// Ensure the element stays within the window bounds
			const { clientWidth, clientHeight } = document.documentElement;
			const { offsetWidth, offsetHeight } = dragReceiverRef.current;
			const maxLeft = clientWidth - offsetWidth;
			const maxTop = clientHeight - offsetHeight;

			const boundedLeft = Math.max(0, Math.min(maxLeft, newLeft));
			const boundedTop = Math.max(0, Math.min(maxTop, newTop));

			dragReceiverRef.current.style.inset = `${boundedTop}px auto auto ${boundedLeft}px`;
			setPos({ x: e.clientX, y: e.clientY });
		},
		[dragging, pos],
	);

	useEffect(() => {
		if (dragging) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		} else {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		}
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [dragging, handleMouseMove, handleMouseUp]);

	return (
		<div id="saxo-helper" onMouseDown={handleMouseDown} ref={dragReceiverRef}>
			<Main />
			<style>{style}</style>
		</div>
	);
};

const getRootElement = (): HTMLElement => {
	const root = document.querySelector<HTMLElement>("div[data-saxo-helper]");
	if (root) return root;

	const element = document.createElement("div");
	element.dataset.saxoHelper = "";
	document.body.appendChild(element);
	return element;
};

const main = async () => {
	await getFooterElement(); // #footer が現れるのを待つ
	const root = getRootElement();
	createRoot(root).render(<App />);
};

if (document.readyState === "complete") {
	main();
} else {
	window.addEventListener("load", main);
}
