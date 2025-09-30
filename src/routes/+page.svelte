<script lang="ts">
	import ColorPicker from 'svelte-awesome-color-picker';
	import { Copy, Download, Check, X } from '@lucide/svelte';
	import { getSvgPath } from 'figma-squircle';
	import { displaySvgD3 } from './displaySvgD3';
	import { fade } from 'svelte/transition';
	import { track } from '@vercel/analytics';

	let bgColorHex = $state<string>('#000000');
	let borderRadius = $state<number>(70);
	let imageWidth = $state<number>(80);
	let svgElement = $state<SVGElement | null>(null);
	let imageRotation = $state<number>(0);

	type Toast = { id: number; message: string; type: 'success' | 'error' };
	let toasts = $state<Toast[]>([]);
	let toastId = 0;

	function showToast(message: string, type: 'success' | 'error' = 'success') {
		const id = ++toastId;
		toasts.push({ id, message, type });
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 3000);
	}

	const parseSvgContent = (svgContent: string): SVGElement | null => {
		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(svgContent, 'image/svg+xml');
			const parsedElement = doc.documentElement;

			if (parsedElement.nodeName === 'parsererror') {
				return null;
			}

			if (parsedElement.tagName.toLowerCase() !== 'svg') {
				return null;
			}

			return parsedElement as unknown as SVGElement;
		} catch (error) {
			console.error('Error parsing SVG:', error);
			return null;
		}
	};

	$effect(() => {
		const handleGlobalPaste = async (event: ClipboardEvent) => {
			const clipboardData = event.clipboardData;
			if (!clipboardData) return;

			if (clipboardData.types.includes('image/svg+xml')) {
				try {
					const svgData = clipboardData.getData('image/svg+xml');
					if (svgData) {
						const parsed = parseSvgContent(svgData);
						if (parsed) {
							svgElement = parsed;
							showToast('SVG pasted successfully!', 'success');
							return;
						}
					}
				} catch (error) {
					console.error('Error getting SVG data:', error);
				}
			}

			const items = clipboardData.items;

			for (let i = 0; i < items.length; i++) {
				const item = items[i];

				if (item.type === 'image/svg+xml') {
					try {
						const blob = item.getAsFile();
						if (blob) {
							const text = await blob.text();
							const parsed = parseSvgContent(text);
							if (parsed) {
								svgElement = parsed;
								showToast('SVG pasted successfully!', 'success');
								return;
							}
						}
					} catch (error) {
						console.error('Error parsing SVG blob:', error);
					}
				}
			}

			const text = clipboardData.getData('text/plain');
			if (text) {
				const trimmedText = text.trim();

				if (trimmedText.includes('<svg') && trimmedText.includes('</svg>')) {
					const parsed = parseSvgContent(text);
					if (parsed) {
						svgElement = parsed;
						showToast('SVG pasted successfully!', 'success');
						return;
					} else {
						showToast('Invalid SVG format', 'error');
						return;
					}
				}

				if (trimmedText.match(/^https?:\/\/.*\.svg$/i)) {
					try {
						const response = await fetch(trimmedText);
						if (response.ok) {
							const svgText = await response.text();
							const parsed = parseSvgContent(svgText);
							if (parsed) {
								svgElement = parsed;
								showToast('SVG loaded from URL!', 'success');
								return;
							} else {
								showToast('URL does not contain valid SVG', 'error');
								return;
							}
						} else {
							showToast('Failed to fetch SVG from URL', 'error');
							return;
						}
					} catch (error) {
						console.error('Error fetching SVG from URL:', error);
						showToast('Error fetching SVG from URL', 'error');
						return;
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
		if (file) {
			if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
				file
					.text()
					.then((text) => {
						const parsed = parseSvgContent(text);
						if (parsed) {
							svgElement = parsed;
							showToast('SVG uploaded successfully!', 'success');
						} else {
							showToast('Invalid SVG file format', 'error');
						}
					})
					.catch((error) => {
						console.error('Error reading SVG file:', error);
						showToast('Error reading SVG file', 'error');
					})
					.finally(() => {
						target.value = '';
					});
			} else {
				showToast('Please upload an SVG file', 'error');
				target.value = '';
			}
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
		const viewBoxMinX = originalViewBox[0];
		const viewBoxMinY = originalViewBox[1];

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

		// Center of the scaled SVG
		const centerX = originalWidth / 2;
		const centerY = originalHeight / 2;

		// Center the SVG in the background
		const xOffset = (size - scaledWidth) / 2;
		const yOffset = (size - scaledHeight) / 2;

		// Add the original SVG content in a group with transform
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute(
			'transform',
			`translate(${xOffset - viewBoxMinX * scaleX}, ${yOffset - viewBoxMinY * scaleY}) scale(${scaleX}, ${scaleY}) rotate(${imageRotation}, ${centerX}, ${centerY})`
		);
		g.innerHTML = svgElement.innerHTML;
		newSvg.appendChild(g);

		const serializer = new XMLSerializer();
		return serializer.serializeToString(newSvg);
	};

	const copySvgWithBackground = async () => {
		track('copy_svg_with_background');
		const svgString = await createSvgWithBackground();
		if (!svgString) {
			showToast('Failed to copy SVG', 'error');
			return;
		}

		try {
			await navigator.clipboard.writeText(svgString);
			showToast('SVG copied to clipboard!', 'success');
		} catch (error) {
			console.error('Error copying SVG:', error);
			showToast('Failed to copy SVG', 'error');
		}
	};

	const downloadSvgWithBackground = async () => {
		track('download_svg_with_background');
		const svgString = await createSvgWithBackground();
		if (!svgString) {
			showToast('Failed to download SVG', 'error');
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
			showToast('Failed to download SVG', 'error');
		}
	};

	const clampAngle = (event: Event) => {
		const clampValues = [0, 90, 180, 270, 360];
		const input = event.target as HTMLInputElement;
		let value = parseInt(input.value);
		if (isNaN(value) || value < 0) value = 0;
		if (value > 360) value = 360;
		const dividend = value / 90;
		const shouldClamp = clampValues.some((clampVal) => Math.abs(value - clampVal) <= 10);
		//add near clamping to multiples of 90 (within 10 degrees)
		if (shouldClamp) {
			value = Math.round(value / 90) * 90;
		}
		imageRotation = value;
		input.value = String(value);
	};

	const clampValue = (value: number, min: number, max: number) => {
		if (isNaN(value)) return min;
		return Math.min(Math.max(value, min), max);
	};

	const handleBorderRadiusInput = (event: Event) => {
		const input = event.target as HTMLInputElement;
		borderRadius = clampValue(parseInt(input.value), 0, 200);
	};

	const handleImageWidthInput = (event: Event) => {
		const input = event.target as HTMLInputElement;
		imageWidth = clampValue(parseInt(input.value), 10, 100);
	};

	const handleRotationInput = (event: Event) => {
		const input = event.target as HTMLInputElement;
		imageRotation = clampValue(parseInt(input.value), 0, 360);
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
			setInnerSvg({ svgElement: svgElement, imageWidth: imageWidth, imageRotation: imageRotation });
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
						<div bind:this={svgDisplay}></div>
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
					class="mt-5 inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)]"
				>
					<span class="text-white">Select SVG file</span>
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
				Tweak colors, border radius, rotate and scale to match your brand.
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
						<div class="flex items-center gap-1">
							<input
								type="number"
								min="0"
								max="200"
								bind:value={borderRadius}
								oninput={handleBorderRadiusInput}
								class="w-16 rounded-lg border border-[color:var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold text-[color:var(--color-text-primary)] focus:ring-2 focus:ring-orange-500 focus:outline-none"
							/>
							<span class="text-xs text-[color:var(--color-text-secondary)]">px</span>
						</div>
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
						<div class="flex items-center gap-1">
							<input
								type="number"
								min="10"
								max="100"
								bind:value={imageWidth}
								oninput={handleImageWidthInput}
								class="w-16 rounded-lg border border-[color:var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold text-[color:var(--color-text-primary)] focus:ring-2 focus:ring-orange-500 focus:outline-none"
							/>
							<span class="text-xs text-[color:var(--color-text-secondary)]">%</span>
						</div>
					</div>
					<input
						type="range"
						min="10"
						max="100"
						bind:value={imageWidth}
						class="w-full accent-orange-500"
					/>
				</div>

				<div class="space-y-3">
					<div
						class="flex items-center justify-between text-sm font-medium text-[color:var(--color-text-secondary)]"
					>
						<span>Rotation Angle (°)</span>
						<div class="flex items-center gap-1">
							<input
								type="number"
								min="0"
								max="360"
								bind:value={imageRotation}
								oninput={handleRotationInput}
								class="w-16 rounded-lg border border-[color:var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold text-[color:var(--color-text-primary)] focus:ring-2 focus:ring-orange-500 focus:outline-none"
							/>
							<span class="text-xs text-[color:var(--color-text-secondary)]">°</span>
						</div>
					</div>
					<div class="relative w-full">
						<input
							type="range"
							min="0"
							max="360"
							bind:value={imageRotation}
							oninput={clampAngle}
							class="w-full accent-orange-500"
						/>
						<div class="pointer-events-none absolute left-0 h-0 w-full">
							{#each [90, 180, 270] as deg}
								<span
									class="absolute h-2 w-0.5 rounded bg-orange-400"
									style="left: calc((({deg} / 360) * (100% - 16px)) + 8px);"
									aria-label="{deg}°"
								></span>
							{/each}
						</div>
					</div>
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

{#each toasts as toast (toast.id)}
	<div class="absolute top-4 right-4" transition:fade>
		<div
			class="flex items-center gap-3 rounded-lg border border-[color:var(--color-border)] bg-[var(--color-surface)] p-4 text-[color:var(--color-text-primary)] shadow-lg"
		>
			{#if toast.type === 'success'}
				<Check class="h-5 w-5 text-green-600" />
			{:else}
				<X class="h-5 w-5 text-red-600" />
			{/if}
			<span>{toast.message}</span>
		</div>
	</div>
{/each}

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
