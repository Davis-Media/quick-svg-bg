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

		// Extract viewBox values from the SVG
		const svgViewBox = svgElement.getAttribute('viewBox')?.split(/\s+/).map(Number);

		// Get the original dimensions, prioritizing viewBox over getBoundingClientRect
		const viewBoxWidth = svgViewBox?.[2] || 0;
		const viewBoxHeight = svgViewBox?.[3] || 0;
		const viewBoxMinX = svgViewBox?.[0] || 0;
		const viewBoxMinY = svgViewBox?.[1] || 0;

		// Fallback to getBoundingClientRect if viewBox is not available or invalid
		const originalWidth = viewBoxWidth || svgElement.getBoundingClientRect().width || 100;
		const originalHeight = viewBoxHeight || svgElement.getBoundingClientRect().height || 100;

		// Calculate scale factor based on image width percentage
		const scaleFactor = imageWidth / 100;

		// Calculate the aspect ratio
		const aspectRatio = originalWidth / originalHeight;

		// Determine the appropriate scale to maintain aspect ratio
		// and fit within the container while respecting the imageWidth setting
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

		// Create a new group element for the inner SVG
		innerSvg = svg.append('g');

		// Clone the SVG content to avoid modifying the original
		const svgContent = svgElement.cloneNode(true) as SVGElement;

		// Remove any existing transform, width, height attributes that might interfere
		svgContent.removeAttribute('transform');
		svgContent.removeAttribute('width');
		svgContent.removeAttribute('height');

		// Extract all child nodes from the SVG
		const childNodes = Array.from(svgContent.childNodes);

		// Create a group with proper transformation
		const contentGroup = innerSvg
			.append('g')
			.attr(
				'transform',
				`translate(${xOffset - viewBoxMinX * scaleX}, ${yOffset - viewBoxMinY * scaleY}) scale(${scaleX}, ${scaleY})`
			);

		// Append each child node to our new group
		childNodes.forEach((node) => {
			if (node.nodeType === Node.ELEMENT_NODE) {
				contentGroup.node()?.appendChild(node.cloneNode(true));
			}
		});
	};

	return {
		setupSvg,
		updateSvg,
		setInnerSvg
	};
};
