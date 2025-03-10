<script lang="ts">
	import ColorPicker from 'svelte-awesome-color-picker';
	import { Copy, Download } from '@lucide/svelte';
	import { getSvgPath } from 'figma-squircle';
	import { displaySvgD3 } from './displaySvgD3';

	let bgColorHex = $state<string>('#000000');
	let borderRadius = $state<number>(100);
	let imageWidth = $state<number>(75);
	let svgElement = $state<SVGElement | null>(null);

	const parseSvgContent = (svgContent: string) => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgContent, 'image/svg+xml');
		return doc.documentElement as unknown as SVGElement;
	};

	$effect(() => {
		const handleGlobalPaste = async (event: ClipboardEvent) => {
			const clipboardData = event.clipboardData;
			if (!clipboardData) return;

			// First try to get SVG directly
			if (clipboardData.types.includes('image/svg+xml')) {
				try {
					const svgData = clipboardData.getData('image/svg+xml');
					if (svgData) {
						svgElement = parseSvgContent(svgData);
						return;
					}
				} catch (error) {
					console.error('Error getting SVG data:', error);
				}
			}

			// Try to get SVG from clipboard items
			const items = clipboardData.items;

			for (let i = 0; i < items.length; i++) {
				const item = items[i];

				// Check for SVG file or image
				if (item.type === 'image/svg+xml') {
					const blob = item.getAsFile();
					if (blob) {
						// Parse SVG content
						const text = await blob.text();
						svgElement = parseSvgContent(text);
						return;
					}
				}
			}

			// Check for SVG text content
			const text = clipboardData.getData('text/plain');
			if (text) {
				const trimmedText = text.trim();

				if (trimmedText.startsWith('<svg') && trimmedText.includes('</svg>')) {
					svgElement = parseSvgContent(text);
					return;
				}

				// Check if the text is a URL to an SVG file
				if (trimmedText.match(/^https?:\/\/.*\.svg$/i)) {
					try {
						const response = await fetch(trimmedText);
						if (response.ok) {
							const svgText = await response.text();
							if (svgText.trim().startsWith('<svg')) {
								svgElement = parseSvgContent(svgText);
								return;
							}
						}
					} catch (error) {
						console.error('Error fetching SVG from URL:', error);
					}
				}
			}
		};

		document.addEventListener('paste', handleGlobalPaste);

		return () => {
			document.removeEventListener('paste', handleGlobalPaste);
		};
	});

	const handleFileUpload = (
		event: Event & {
			currentTarget: EventTarget & HTMLInputElement;
		}
	) => {
		const target = event.target as HTMLInputElement;
		const file = target.files![0];
		if (file && file.type === 'image/svg+xml') {
			file.text().then((text) => {
				const parser = new DOMParser();
				const doc = parser.parseFromString(text, 'image/svg+xml');
				svgElement = doc.documentElement as unknown as SVGElement;
			});
		} else {
			alert('Please upload an SVG file');
			target.value = '';
		}
	};

	const createSvgWithBackground = () => {
		if (!svgElement) return null;

		const size = 400;

		const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		newSvg.setAttribute('width', String(size));
		newSvg.setAttribute('height', String(size));
		newSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);

		const svgPath = getSvgPath({
			width: size,
			height: size,
			cornerRadius: borderRadius,
			cornerSmoothing: 0.8,
			preserveSmoothing: true
		});

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', svgPath);
		path.setAttribute('fill', bgColorHex);
		newSvg.appendChild(path);

		const originalViewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [
			0, 0, 100, 100
		];
		const originalWidth = originalViewBox[2];
		const originalHeight = originalViewBox[3];

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

		// Add the original SVG content in a group with transform
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute('transform', `translate(${xOffset}, ${yOffset}) scale(${scaleX}, ${scaleY})`);
		g.innerHTML = svgElement.innerHTML;
		newSvg.appendChild(g);

		const serializer = new XMLSerializer();
		return serializer.serializeToString(newSvg);
	};

	const copySvgWithBackground = async () => {
		const svgString = await createSvgWithBackground();
		if (!svgString) {
			alert('Failed to copy SVG');
			return;
		}

		try {
			await navigator.clipboard.writeText(svgString);
			alert('SVG copied to clipboard!');
		} catch (error) {
			console.error('Error copying SVG:', error);
			alert('Failed to copy SVG');
		}
	};

	const downloadSvgWithBackground = async () => {
		const svgString = await createSvgWithBackground();
		if (!svgString) {
			alert('Failed to download SVG');
			return;
		}

		try {
			const blob = new Blob([svgString], { type: 'image/svg+xml' });
			const url = URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = 'svg-with-background.svg';
			document.body.appendChild(a);
			a.click();

			// Clean up
			setTimeout(() => {
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}, 100);
		} catch (error) {
			console.error('Error downloading SVG:', error);
			alert('Failed to download SVG');
		}
	};

	let svgDisplay: HTMLDivElement;

	const { setupSvg, updateSvg, setInnerSvg } = displaySvgD3();

	$effect(() => {
		setupSvg(svgDisplay);
	});

	$effect(() => {
		updateSvg({ borderRadius: borderRadius, bgColorHex: bgColorHex });
	});

	$effect(() => {
		if (svgElement) {
			setInnerSvg({ svgElement: svgElement, imageWidth: imageWidth });
		}
	});
</script>

<svelte:head>
	<title>Quick SVG Background</title>
	<meta name="description" content="Quickly add a background to your SVGs" />
</svelte:head>

<main class="flex grow flex-col items-center justify-center p-8">
	<h1 class="pb-4 text-2xl font-bold">Quick SVG Background</h1>

	<p class="pb-8 text-center text-sm text-gray-600">
		Quickly add a background to your svg. All client side, for free.
	</p>

	<div class="mb-8">
		<label class="block">
			<span class="sr-only">Choose SVG file</span>
			<input
				type="file"
				accept=".svg"
				onchange={(e) => handleFileUpload(e)}
				class="block w-full text-sm text-slate-500
          file:mr-4 file:rounded-md file:border-0
          file:bg-orange-50 file:px-4
          file:py-2 file:text-sm
          file:font-semibold file:text-orange-700
          hover:file:bg-orange-100"
			/>
		</label>
		<p class="mt-2 text-sm text-gray-600">
			Or press Cmd+V / Ctrl+V anywhere on the page to paste an SVG
		</p>
	</div>

	<div class="flex items-center justify-center">
		<div bind:this={svgDisplay}></div>
	</div>

	<div class="mt-4 flex items-center gap-3">
		<button
			class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:cursor-pointer
				       {bgColorHex === '#ffffff'
				? 'bg-orange-500 text-white'
				: 'bg-white text-gray-800 hover:bg-gray-100'}"
			onclick={() => (bgColorHex = '#ffffff')}
		>
			White
		</button>
		<button
			class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:cursor-pointer
				       {bgColorHex === '#000000'
				? 'bg-orange-500 text-white'
				: 'bg-black text-white hover:bg-gray-800'}"
			onclick={() => (bgColorHex = '#000000')}
		>
			Black
		</button>
		<ColorPicker bind:hex={bgColorHex} position="responsive" />
	</div>

	<div class="mt-4 w-full max-w-[400px]">
		<div class="flex items-center justify-between">
			<span class="text-sm text-gray-600">Border Radius: {borderRadius}px</span>
			<input
				type="range"
				min="0"
				max="200"
				bind:value={borderRadius}
				class="w-full accent-orange-500"
			/>
		</div>
	</div>

	<div class="mt-4 w-full max-w-[400px]">
		<div class="flex items-center justify-between">
			<span class="text-sm text-gray-600">Image Width: {imageWidth}%</span>
			<input
				type="range"
				min="10"
				max="100"
				bind:value={imageWidth}
				class="w-full accent-orange-500"
			/>
		</div>
	</div>

	<div class="mt-6 flex gap-4">
		<button
			class="flex items-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:cursor-pointer hover:bg-orange-700"
			onclick={copySvgWithBackground}
		>
			<Copy class="mr-2 h-4 w-4" />
			Copy SVG
		</button>
		<button
			class="flex items-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:cursor-pointer hover:bg-orange-700"
			onclick={downloadSvgWithBackground}
		>
			<Download class="mr-2 h-4 w-4" />
			Download SVG
		</button>
	</div>
</main>
