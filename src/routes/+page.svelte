<script lang="ts">
	import ColorPicker from 'svelte-awesome-color-picker';
	import { Copy, Download } from '@lucide/svelte';
	import { getSvgPath } from 'figma-squircle';
	import { displaySvgD3 } from './displaySvgD3';

	let bgColorHex = $state<string>('#000000');
	let borderRadius = $state<number>(70);
	let imageWidth = $state<number>(80);
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
		const file = target.files?.[0];
		if (file && file.type === 'image/svg+xml') {
			file
				.text()
				.then((text) => {
					const parser = new DOMParser();
					const doc = parser.parseFromString(text, 'image/svg+xml');
					svgElement = doc.documentElement as unknown as SVGElement;
				})
				.finally(() => {
					target.value = '';
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

	const swatchClasses = (isActive: boolean) =>
		isActive
			? [
					'border-transparent',
					'bg-[var(--color-primary)]',
					'text-white shadow-sm',
					'hover:bg-[var(--color-primary-strong)]'
				].join(' ')
			: [
					'border-[color:var(--color-border)]',
					'bg-[var(--color-surface)]',
					'text-[color:var(--color-text-primary)]',
					'hover:border-[var(--color-primary)]',
					'hover:text-[color:var(--color-primary-strong)]'
				].join(' ');

	const primaryActionClasses = [
		'inline-flex w-full items-center justify-center gap-2 rounded-full',
		'bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition',
		'hover:bg-[var(--color-primary-strong)]',
		'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-strong)]'
	].join(' ');

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
	<title>quick svg bg</title>
	<meta name="description" content="quickly add a background to your svg" />
</svelte:head>

<main class="flex w-full flex-col gap-12">

	<section class="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:gap-12">
		<div class="flex flex-col gap-6">
			<div
				class="rounded-3xl border border-[color:var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]"
			>
				<h2 class="text-lg font-semibold text-[color:var(--color-text-primary)]">Live preview</h2>
				<p class="text-sm text-[color:var(--color-text-secondary)]">
					See your SVG on a soft squircle background.
				</p>
				<div class="mt-6 flex items-center justify-center">
					<div
						class="relative flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[var(--color-surface-muted)] shadow-inner sm:max-w-none"
					>
						<div bind:this={svgDisplay} ></div>
					</div>
				</div>
			</div>

			<div
				class="rounded-3xl border border-dashed border-[color:var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-sm"
			>
				<h3 class="text-base font-medium text-[color:var(--color-text-primary)]">
					Upload or paste an SVG
				</h3>
				<p class="mt-2 text-sm text-[color:var(--color-text-secondary)]">
					Choose a file or press ⌘V / Ctrl+V anywhere to paste.
				</p>
				<label
					class="mt-5 inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition  focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)]"
				>
					<span>Select SVG file</span>
					<input type="file" accept=".svg" onchange={(e) => handleFileUpload(e)} class="sr-only" />
				</label>
			</div>
		</div>

		<div
			class="rounded-3xl border border-[color:var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]"
		>
			<h2 class="text-lg font-semibold text-[color:var(--color-text-primary)]">
				Customize the background
			</h2>
			<p class="text-sm text-[color:var(--color-text-secondary)]">
				Tweak colors, border radius, and scale to match your brand.
			</p>

			<div class="mt-6 flex flex-col gap-6">
				<div>
					<span
						class="text-xs font-semibold tracking-[0.2em] text-[color:var(--color-text-secondary)] uppercase"
						>Color</span
					>
					<div class="mt-3 flex flex-wrap items-center gap-3">
						<button
							class={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${swatchClasses(bgColorHex === '#ffffff')}`}
							onclick={() => (bgColorHex = '#ffffff')}
							type="button"
						>
							<span class="inline-block h-3 w-3 rounded-full border border-white bg-white"></span>
							White
						</button>
						<button
							class={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${swatchClasses(bgColorHex === '#000000')}`}
							onclick={() => (bgColorHex = '#000000')}
							type="button"
						>
							<span class="inline-block h-3 w-3 rounded-full border border-neutral-700 bg-black"
							></span>
							Black
						</button>
						<div
							class="dark-picker inline-flex w-full max-w-[220px] items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2"
						>
							<ColorPicker bind:hex={bgColorHex} position="responsive" />
						</div>
					</div>
				</div>

				<div class="space-y-3">
					<div
						class="flex items-center justify-between text-sm font-medium text-[color:var(--color-text-secondary)]"
					>
						<span>Border radius</span>
						<span class="text-xs font-semibold text-[color:var(--color-text-primary)]"
							>{borderRadius}px</span
						>
					</div>
					<input
						type="range"
						min="0"
						max="200"
						bind:value={borderRadius}
						class="w-full accent-orange-500"
					/>
				</div>

				<div class="space-y-3">
					<div
						class="flex items-center justify-between text-sm font-medium text-[color:var(--color-text-secondary)]"
					>
						<span>Image width</span>
						<span class="text-xs font-semibold text-[color:var(--color-text-primary)]"
							>{imageWidth}%</span
						>
					</div>
					<input
						type="range"
						min="10"
						max="100"
						bind:value={imageWidth}
						class="w-full accent-orange-500"
					/>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<button class={primaryActionClasses} onclick={copySvgWithBackground} type="button">
						<Copy class="h-4 w-4" />
						Copy SVG
					</button>
					<button class={primaryActionClasses} onclick={downloadSvgWithBackground} type="button">
						<Download class="h-4 w-4" />
						Download SVG
					</button>
				</div>
			</div>
		</div>
	</section>
</main>

<style>
	.dark-picker {
		--cp-bg-color: var(--color-surface);
		--cp-border-color: var(--color-border);
		--cp-text-color: var(--color-text-primary);
		--cp-input-color: var(--color-surface-muted);
		--cp-button-hover-color: var(--color-primary-soft);
	}

	.dark .dark-picker {
		--cp-bg-color: var(--color-surface);
		--cp-border-color: var(--color-border);
		--cp-text-color: var(--color-text-primary);
		--cp-input-color: var(--color-surface-muted);
		--cp-button-hover-color: rgba(251, 146, 60, 0.25);
	}
</style>
