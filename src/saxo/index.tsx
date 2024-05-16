import { clsx } from "clsx";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import style from "./style.css" with { type: "text" };
import { getCuurentPrice, getFooterElement, getRimawari, getShiyouritsu, getUsdToJpy } from "./util.ts";

const Main = () => {
	const [rate, setRate] = useState<number | null>(null);
	const [rimawari, setRimawari] = useState<number | null>(null);
	const [shiyouritsu, setShiyouritsu] = useState<number | null>(null);
	const [currentPrice, setCurrentPrice] = useState<number | null>(null);

	const fetchRate = useCallback(async () => {
		const fetchedRate = await getUsdToJpy();
		setRate(fetchedRate);
		setRimawari(getRimawari(fetchedRate));
		setShiyouritsu(getShiyouritsu());
		setCurrentPrice(getCuurentPrice());
	}, []);

	useEffect(() => {
		const intervalId = setInterval(fetchRate, 500);

		return () => {
			clearInterval(intervalId);
		};
	}, [fetchRate]);

	const rimawariYearly = rimawari ? `${rimawari.toFixed(2)}%` : "N/A";
	const rimawariMonthly = rimawari ? `${(rimawari / 12).toFixed(2)}%` : "N/A";
	const shiyouritsuText = shiyouritsu ? `${shiyouritsu.toFixed(2)}%` : "N/A";
	const currentPriceText = currentPrice ? `${(currentPrice * 0.9).toFixed(2)}ドル` : "N/A";

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
				<div>
					<div className={clsx("grid")}>
						<span>年利:</span>
						<span className={clsx("percentage")}>{rimawariYearly}</span>
					</div>
					<div className={clsx("grid")}>
						<span>月利:</span>
						<span className={clsx("percentage")}>{rimawariMonthly}</span>
					</div>
				</div>
			</div>
			<div>
				<span>約定後の証拠金使用率:</span>
				<span className={clsx("percentage")}>{shiyouritsuText}</span>
			</div>
			<div>
				<span>1割引き価格:</span>
				<span className={clsx("percentage")}>{currentPriceText}</span>
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

	// ウィンドウの大きさが変わったときに画面内に収まるように調整する
	const adjustPosition = useCallback(() => {
		if (!dragReceiverRef.current) return;

		const { clientWidth, clientHeight } = document.documentElement;
		const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = dragReceiverRef.current;

		const maxLeft = clientWidth - offsetWidth;
		const maxTop = clientHeight - offsetHeight;

		const boundedLeft = Math.max(0, Math.min(maxLeft, offsetLeft));
		const boundedTop = Math.max(0, Math.min(maxTop, offsetTop));

		dragReceiverRef.current.style.inset = `${boundedTop}px auto auto ${boundedLeft}px`;
	}, []);

	useEffect(() => {
		window.addEventListener("resize", adjustPosition);
		return () => {
			window.removeEventListener("resize", adjustPosition);
		};
	}, [adjustPosition]);

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
