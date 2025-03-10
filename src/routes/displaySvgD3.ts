import * as d3 from 'd3';
import { getSvgPath } from 'figma-squircle';

export const displaySvgD3 = () => {
	const size = 400;
	const defaultBorderRadius = 100;
	const defaultBgColorHex = '#000000';

	let svg: d3.Selection<SVGSVGElement, unknown, null, unknown>;
	let path: d3.Selection<SVGPathElement, unknown, null, unknown>;
	let innerSvg: d3.Selection<SVGGElement, unknown, null, unknown>;

	const setupSvg = (selector: HTMLDivElement) => {
		d3.select(selector).selectAll('*').remove();

		svg = d3
			.select(selector)
			.append('svg')
			.attr('width', size)
			.attr('height', size)
			.attr('viewBox', `0 0 ${size} ${size}`);

		const svgPath = getSvgPath({
			width: size,
			height: size,
			cornerRadius: defaultBorderRadius,
			cornerSmoothing: 0.8,
			preserveSmoothing: true
		});

		path = svg.append('path').attr('d', svgPath).attr('fill', defaultBgColorHex);
	};

	const updateSvg = (data: { borderRadius: number; bgColorHex: string }) => {
		const { borderRadius, bgColorHex } = data;

		const svgPath = getSvgPath({
			width: size,
			height: size,
			cornerRadius: borderRadius,
			cornerSmoothing: 0.8,
			preserveSmoothing: true
		});

		path.attr('d', svgPath).attr('fill', bgColorHex);
	};

	const setInnerSvg = (data: { svgElement: SVGElement; imageWidth: number }) => {
		const { svgElement, imageWidth } = data;

		// Clear any existing SVG content
		svg.selectAll('g').remove();

		// Get the original dimensions from the SVG element itself
		const svgViewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number);
		const originalWidth = svgViewBox
			? svgViewBox[2]
			: svgElement.getBoundingClientRect().width || 100;
		const originalHeight = svgViewBox
			? svgViewBox[3]
			: svgElement.getBoundingClientRect().height || 100;

		// Calculate scale factor based on image width percentage
		const scaleFactor = imageWidth / 100;

		// Determine the appropriate scale to maintain aspect ratio
		// and fit within the container while respecting the imageWidth setting
		const aspectRatio = originalWidth / originalHeight;
		let scaleX, scaleY;

		if (aspectRatio >= 1) {
			// Wider than tall
			scaleX = (size * scaleFactor) / originalWidth;
			scaleY = scaleX; // Maintain aspect ratio
		} else {
			// Taller than wide
			scaleY = (size * scaleFactor) / originalHeight;
			scaleX = scaleY; // Maintain aspect ratio
		}

		// Calculate the scaled dimensions
		const scaledWidth = originalWidth * scaleX;
		const scaledHeight = originalHeight * scaleY;

		// Center the SVG in the background
		const xOffset = (size - scaledWidth) / 2;
		const yOffset = (size - scaledHeight) / 2;

		innerSvg = svg
			.append('g')
			.attr('transform', `translate(${xOffset}, ${yOffset}) scale(${scaleX}, ${scaleY})`);

		// Clone the node to avoid potential issues with moving DOM elements
		const svgElementClone = svgElement.cloneNode(true) as SVGElement;

		// Remove any existing transform attributes that might interfere with centering
		svgElementClone.removeAttribute('transform');

		// Append the cloned SVG element to the innerSvg
		innerSvg.node()?.appendChild(svgElementClone);
	};

	return {
		setupSvg,
		updateSvg,
		setInnerSvg
	};
};
