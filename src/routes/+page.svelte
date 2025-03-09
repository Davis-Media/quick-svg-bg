<script lang="ts">
	import ColorPicker from 'svelte-awesome-color-picker';
	import { Copy, Download } from '@lucide/svelte';

	let svgFile = $state<File | null>(null);
	let svgUrl = $state<string | null>(null);
	let bgColorHex = $state<string>('#000000');
	let borderRadius = $state<number>(15);
	let imageWidth = $state<number>(85);

	$effect(() => {
		const handleGlobalPaste = (event: ClipboardEvent) => {
			const clipboardData = event.clipboardData;
			if (!clipboardData) return;

			// Check for SVG file in clipboard
			const items = clipboardData.items;
			for (let i = 0; i < items.length; i++) {
				if (items[i].type === 'image/svg+xml') {
					const blob = items[i].getAsFile();
					if (blob) {
						svgFile = blob;
						svgUrl = URL.createObjectURL(blob);
						return;
					}
				}
			}

			// Check for SVG text content
			const text = clipboardData.getData('text/plain');
			if (text && text.trim().startsWith('<svg') && text.includes('</svg>')) {
				const blob = new Blob([text], { type: 'image/svg+xml' });
				svgFile = new File([blob], 'pasted.svg', { type: 'image/svg+xml' });
				svgUrl = URL.createObjectURL(blob);
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
			svgFile = file;
			svgUrl = URL.createObjectURL(file);
		} else {
			alert('Please upload an SVG file');
			target.value = '';
		}
	};

	const setBgColor = (color: string) => () => (bgColorHex = color);

	const createSvgWithBackground = async () => {
		if (!svgUrl) return null;

		try {
			const svgResponse = await fetch(svgUrl);
			const svgText = await svgResponse.text();

			const parser = new DOMParser();
			const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
			const svgElement = svgDoc.documentElement;

			// Use fixed square dimensions for the background
			const size = 400;

			// Create a new SVG with background
			const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			newSvg.setAttribute('width', String(size));
			newSvg.setAttribute('height', String(size));
			newSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);

			// Add background rect
			const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			rect.setAttribute('width', '100%');
			rect.setAttribute('height', '100%');
			rect.setAttribute('fill', bgColorHex);
			rect.setAttribute('rx', String(borderRadius));
			newSvg.appendChild(rect);

			// Get original SVG viewBox for scaling
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

			// Return the serialized SVG
			const serializer = new XMLSerializer();
			return serializer.serializeToString(newSvg);
		} catch (error) {
			console.error('Error creating SVG:', error);
			return null;
		}
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

	{#if svgUrl}
		<div
			class="flex h-[400px] w-[400px] items-center justify-center rounded-md p-4 shadow-md"
			style="background-color: {bgColorHex}; border-radius: {borderRadius}px;"
		>
			<img src={svgUrl} alt="Uploaded SVG" style="width: {imageWidth}%;" class="max-h-full" />
		</div>

		<div class="mt-4 flex items-center gap-3">
			<button
				class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:cursor-pointer
				       {bgColorHex === '#ffffff'
					? 'bg-orange-500 text-white'
					: 'bg-white text-gray-800 hover:bg-gray-100'}"
				onclick={setBgColor('#ffffff')}
			>
				White
			</button>
			<button
				class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:cursor-pointer
				       {bgColorHex === '#000000'
					? 'bg-orange-500 text-white'
					: 'bg-black text-white hover:bg-gray-800'}"
				onclick={setBgColor('#000000')}
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
	{/if}
</main>
